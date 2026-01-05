# Authentication System Design

## Overview

This design implements JWT-based authentication for the CLI and API. Users log in or sign up through a TUI interface, and tokens persist locally.

## Architecture

### High-Level Components

1. **CLI (packages/cli)**: Ink-based TUI with navigation and forms
2. **API (packages/api)**: tRPC mutations for auth + JWT generation
3. **Token Storage**: Local credentials file at `~/.shippr/credentials.json`

### User Flow

**New User or No Token:**

```
User starts CLI
    ↓
No token found → Show auth screen
    ↓
Menu: [Login] or [Create Account]
    ↓
User selects option → Show email/password form
    ↓
Submit → Call tRPC mutation (loginUser or createUser)
    ↓
Success → Receive JWT token
    ↓
Store token in ~/.shippr/credentials.json
    ↓
Show main app (authenticated)
```

**Returning User with Token:**

```
User starts CLI
    ↓
Token found → Verify token locally (check expiration)
    ↓
Valid → Show main app (pass token to tRPC calls)
Invalid or Expired → Clear token, show auth screen
```

### Token Format (JWT)

- **Payload**: `{ userId: string, email: string, iat: number, exp: number }`
- **Expiration**: 7 days from issue
- **Algorithm**: HS256
- **Signed with**: JWT_SECRET environment variable

---

## CLI Implementation (packages/cli)

### New Dependencies

- `ink-select-input` - For arrow key menu navigation
- `ink-text-input` - For email/password input fields
- `jose` - For JWT verification on the client side

### File Structure

```
packages/cli/src/
├── index.tsx              # Main entry point
├── components/
│   ├── Router.tsx         # Navigation stack with auth guards
│   ├── AuthScreen.tsx     # Login/Signup screen orchestration
│   ├── Menu.tsx           # Initial menu (Login/Create Account)
│   ├── LoginForm.tsx      # Email/password form for login
│   └── SignupForm.tsx     # Email/password form for signup
├── utils/
│   ├── credentials.ts     # Read/write credentials.json
│   └── trpc.ts            # tRPC client setup with auth headers
└── types.ts               # Shared types
```

### Router with Navigation Stack

**Router API:**

```typescript
const RouterContext = React.createContext({
  push: (route: string, params?: any) => {},
  pop: () => {},
  replace: (route: string, params?: any) => {},
  currentRoute: string,
  params: any,
})

const useRouter = () => useContext(RouterContext)
```

**Router Implementation:**

- Maintains a stack of routes: `RouteStackItem[]`
- `push(route, params)` navigates to a new screen
- `pop()` returns to the previous screen
- `replace(route, params)` replaces the current screen without adding to history
- The top of the stack is the current route

**Route Guards:**

- Each route has a `protected: boolean` flag
- Protected routes verify token validity on render
- Invalid tokens trigger credential deletion and redirect to authentication

**Example Navigation:**

```
User starts → Stack: ['auth']
Login success → replace('dashboard') → Stack: ['dashboard']
Click settings → push('settings') → Stack: ['dashboard', 'settings']
Press back → pop() → Stack: ['dashboard']
Logout → replace('auth') → Stack: ['auth']
```

### Component Breakdown

**`Router.tsx`** – Top-level navigation

- Manages route stack state
- Provides RouterContext to child components
- Checks token validity on startup
- Renders the current route's component
- Enforces authentication guards

**`AuthScreen.tsx`** – Authentication flow orchestration

- Maintains state for `screen` (menu, login, or signup)
- Renders Menu, LoginForm, or SignupForm based on state
- Transitions between screens on user action
- Stores token and navigates to dashboard on successful authentication

**`Menu.tsx`** – Initial selection screen

- Uses `ink-select-input` for arrow key navigation
- Presents two options: "Login" and "Create Account"
- Calls callback to switch screen when user selects an option

**`LoginForm.tsx` and `SignupForm.tsx`** – Input forms

- Sequential inputs: email, then password (Enter advances between fields)
- Display loading state during API calls
- Handle errors including invalid credentials and network failures
- Return token to parent on successful submission

**`utils/credentials.ts`** – Token management

```typescript
// Read token from ~/.shippr/credentials.json
export function getToken(): string | null

// Write token to ~/.shippr/credentials.json
export function saveToken(token: string): void

// Delete credentials file
export function clearToken(): void

// Verify token is valid and not expired
export function isTokenValid(token: string): boolean
```

**`utils/trpc.ts`** – tRPC client with authentication

```typescript
export const trpcClient = createTRPCClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080',
      headers() {
        const token = getToken()
        return token ? { authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})
```

---

## API Implementation (packages/api)

### New Dependencies

- `jose` - For JWT signing and verification

### Environment Variables

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/shippr
JWT_SECRET=<openssl rand -base64 32>
```

### File Changes

**`src/utils/jwt.ts`** – New JWT utilities:

```typescript
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export async function generateToken(payload: { userId: string; email: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret)
  return payload as { userId: string; email: string; iat: number; exp: number }
}
```

**`src/router.ts`** – Add loginUser mutation and update createUser:

```typescript
// loginUser mutation (timing-attack resistant)
loginUser: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, input.email))

    // Always verify a hash to prevent timing attacks
    // Use dummy hash if user doesn't exist
    const dummyHash = '$argon2id$v=19$m=65536,t=2,p=1$somesalt$somehash'
    const hashToVerify = user?.passwordHash || dummyHash
    const isValid = await Bun.password.verify(input.password, hashToVerify)

    if (!user || !isValid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
    }

    const token = await generateToken({ userId: user.id, email: user.email })

    return { token, user: { id: user.id, email: user.email } }
  })

// createUser mutation with token generation
createUser: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })
  )
  .mutation(async ({ input }) => {
    const passwordHash = await Bun.password.hash(input.password)

    try {
      const [user] = await db.insert(users).values({ email: input.email, passwordHash }).returning()

      const token = await generateToken({ userId: user.id, email: user.email })

      return { token, user: { id: user.id, email: user.email } }
    } catch (error) {
      if (error.code === '23505') {
        // PostgreSQL unique constraint violation
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        })
      }
      throw error
    }
  })
```

**`src/trpc.ts`** – Add authentication context and protected procedure:

```typescript
import { verifyToken } from './utils/jwt'

export const createContext = async ({ req }: { req: Request }) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    return { user: null }
  }

  try {
    const payload = await verifyToken(token)
    return { user: payload }
  } catch {
    return { user: null }
  }
}

const t = initTRPC.context<typeof createContext>().create()

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { user: ctx.user } })
})

export const router = t.router
export const publicProcedure = t.procedure
```

---

## Types

### API Types (`packages/api/src/types.ts`)

```typescript
export type TokenPayload = {
  userId: string
  email: string
  iat: number
  exp: number
}

export type AuthResponse = {
  token: string
  user: {
    id: string
    email: string
  }
}
```

### CLI Types (`packages/cli/src/types.ts`)

```typescript
export type Route = 'auth' | 'dashboard' | 'settings'

export type RouteConfig = {
  component: React.ComponentType<any>
  protected: boolean
}

export type RouteStackItem = {
  name: Route
  params?: any
}

export type RouterContextType = {
  push: (route: Route, params?: any) => void
  pop: () => void
  replace: (route: Route, params?: any) => void
  currentRoute: Route
  params?: any
}

export type Credentials = {
  token: string
  expiresAt: number
}
```

---

## Error Handling

**CLI – Network Errors**

```typescript
try {
  const result = await trpcClient.loginUser.mutate({ email, password })
  saveToken(result.token)
  replace('dashboard')
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    setError('Invalid email or password')
  } else if (error.message.includes('fetch')) {
    setError('Cannot connect to server. Is the API running?')
  } else {
    setError('An unexpected error occurred')
  }
}
```

**CLI – Token Validation**

```typescript
const token = getToken()

if (token) {
  try {
    if (isTokenValid(token)) {
      setInitialRoute('dashboard')
    } else {
      clearToken()
      setInitialRoute('auth')
    }
  } catch {
    clearToken()
    setInitialRoute('auth')
  }
} else {
  setInitialRoute('auth')
}
```

**CLI – Corrupted Credentials File**

```typescript
export function getToken(): string | null {
  try {
    const data = fs.readFileSync(credentialsPath, 'utf-8')
    const { token } = JSON.parse(data)
    return token
  } catch {
    return null // File doesn't exist or is corrupted
  }
}
```

---

## Security Considerations

**Timing Attack Prevention**

The `loginUser` mutation verifies a password hash even when the user doesn't exist, preventing timing attacks that could enumerate registered email addresses.

**Password Hashing**

`Bun.password.hash()` implements argon2id, a modern, secure algorithm that won the Password Hashing Competition.

**Generic Error Messages**

All login failures return "Invalid credentials," preventing email enumeration through differential error responses.

**Token Security**

- JWT tokens expire after 7 days
- Tokens store in `~/.shippr/credentials.json` with restricted permissions (0600)
- Client verifies token expiration; server verifies signature and expiration

**Environment Variables**

- The API requires `JWT_SECRET` and crashes on startup if missing
- Generate secrets with `openssl rand -base64 32`

---

## Edge Cases

1. **Missing JWT_SECRET** – The API validates on startup and crashes with a clear error
2. **Corrupted credentials.json** – The CLI treats corrupted files as missing tokens
3. **Password too short** – Zod validation returns a clear error to the CLI
4. **Duplicate email** – PostgreSQL constraint violation returns CONFLICT error
5. **Expired token** – The CLI checks expiration, clears the token, and shows the auth screen
6. **Network failure** – The CLI displays "Cannot connect to server"
7. **Ctrl+C during input** – Ink exits gracefully

---

## Implementation Order

1. **API** – Add JWT utilities and loginUser mutation
2. **API** – Update createUser to return token
3. **API** – Add authentication context and protected procedure
4. **CLI** – Add credentials management utilities
5. **CLI** – Implement Router with navigation stack
6. **CLI** – Build authentication UI components (Menu, LoginForm, SignupForm)
7. **CLI** – Connect tRPC client with authentication headers
8. **Testing** – Manually test login, signup, and token flows
