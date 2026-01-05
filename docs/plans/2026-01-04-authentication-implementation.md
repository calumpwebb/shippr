# Authentication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement JWT-based authentication for the CLI and API with login/signup flows and persistent token storage.

**Architecture:** API provides tRPC mutations for login/signup that return JWT tokens. CLI uses Ink components for TUI forms, stores tokens in `~/.shippr/credentials.json`, and manages navigation with a router that enforces auth guards.

**Tech Stack:** tRPC, Drizzle ORM, PostgreSQL, jose (JWT), Ink, React, Bun

---

## Task 1: API - Add JWT Utilities

**Files:**

- Create: `packages/api/src/utils/jwt.ts`
- Create: `packages/api/src/types.ts`

**Step 1: Install jose dependency**

```bash
cd packages/api
bun add jose
```

Expected: jose added to package.json

**Step 2: Create types file**

Create `packages/api/src/types.ts`:

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

**Step 3: Create JWT utilities**

Create `packages/api/src/utils/jwt.ts`:

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

**Step 4: Verify JWT_SECRET is set**

Check `packages/api/.env` contains:

```bash
JWT_SECRET=i-am-not-a-secret
```

**Step 5: Test JWT utilities manually**

Run the API server:

```bash
cd packages/api
bun run dev
```

Expected: Server starts without throwing "JWT_SECRET environment variable is required"

**Step 6: Commit**

```bash
git add packages/api/src/utils/jwt.ts packages/api/src/types.ts packages/api/package.json packages/api/bun.lockb
git commit -m "feat(api): add JWT signing and verification utilities"
```

---

## Task 2: API - Add loginUser Mutation

**Files:**

- Modify: `packages/api/src/router.ts`

**Step 1: Import dependencies at top of router.ts**

Add these imports to `packages/api/src/router.ts`:

```typescript
import { eq } from 'drizzle-orm'
import { generateToken } from './utils/jwt'
import { TRPCError } from '@trpc/server'
```

**Step 2: Add loginUser mutation**

Add this mutation to the router in `packages/api/src/router.ts` (before or after createUser):

```typescript
loginUser: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email));

    // Always verify a hash to prevent timing attacks
    // Use dummy hash if user doesn't exist
    const dummyHash = '$argon2id$v=19$m=65536,t=2,p=1$somesalt$somehash';
    const hashToVerify = user?.passwordHash || dummyHash;
    const isValid = await Bun.password.verify(input.password, hashToVerify);

    if (!user || !isValid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    }

    const token = await generateToken({ userId: user.id, email: user.email });

    return { token, user: { id: user.id, email: user.email } };
  }),
```

**Step 3: Test loginUser with invalid credentials**

Start API server:

```bash
cd packages/api
bun run dev
```

Create a test file `packages/api/test-login.ts`:

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from './src/router'

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080',
    }),
  ],
})

// Test invalid credentials
try {
  await client.loginUser.mutate({
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  })
  console.log('❌ Should have thrown error')
} catch (error) {
  console.log('✅ Correctly rejected invalid credentials:', error.message)
}
```

Run:

```bash
bun run test-login.ts
```

Expected: "✅ Correctly rejected invalid credentials: Invalid credentials"

**Step 4: Commit**

```bash
git add packages/api/src/router.ts
git commit -m "feat(api): add loginUser mutation with timing-attack protection"
```

---

## Task 3: API - Update createUser to Return Token

**Files:**

- Modify: `packages/api/src/router.ts`

**Step 1: Update createUser mutation**

Replace the existing `createUser` mutation in `packages/api/src/router.ts` with:

```typescript
createUser: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    })
  )
  .mutation(async ({ input }) => {
    const passwordHash = await Bun.password.hash(input.password);

    try {
      const [user] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash,
        })
        .returning();

      const token = await generateToken({ userId: user.id, email: user.email });

      return { token, user: { id: user.id, email: user.email } };
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email already registered',
        });
      }
      throw error;
    }
  }),
```

**Step 2: Test createUser returns token**

Update `packages/api/test-login.ts`:

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from './src/router'

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080',
    }),
  ],
})

// Test createUser returns token
const result = await client.createUser.mutate({
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
})

if (result.token && result.user.id && result.user.email) {
  console.log('✅ createUser returns token and user')
  console.log('Token:', result.token.substring(0, 20) + '...')
} else {
  console.log('❌ Missing token or user data')
}
```

Run:

```bash
bun run test-login.ts
```

Expected: "✅ createUser returns token and user"

**Step 3: Test duplicate email**

Add to `packages/api/test-login.ts`:

```typescript
// Test duplicate email
try {
  await client.createUser.mutate({
    email: 'duplicate@example.com',
    password: 'password123',
  })
  await client.createUser.mutate({
    email: 'duplicate@example.com',
    password: 'password123',
  })
  console.log('❌ Should have thrown CONFLICT error')
} catch (error: any) {
  if (error.message.includes('Email already registered')) {
    console.log('✅ Correctly rejected duplicate email')
  } else {
    console.log('❌ Wrong error:', error.message)
  }
}
```

Run:

```bash
bun run test-login.ts
```

Expected: "✅ Correctly rejected duplicate email"

**Step 4: Commit**

```bash
git add packages/api/src/router.ts
git commit -m "feat(api): update createUser to return JWT token and handle duplicates"
```

**Step 5: Clean up test file**

```bash
rm packages/api/test-login.ts
git add -A
git commit -m "chore(api): remove temporary test file"
```

---

## Task 4: API - Add Auth Context and Protected Procedure

**Files:**

- Modify: `packages/api/src/trpc.ts`
- Modify: `packages/api/src/index.ts`

**Step 1: Update trpc.ts with auth context**

Replace `packages/api/src/trpc.ts` with:

```typescript
import { initTRPC, TRPCError } from '@trpc/server'
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

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { user: ctx.user } })
})
```

**Step 2: Update index.ts to use createContext**

Modify `packages/api/src/index.ts` to pass createContext:

```typescript
import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { appRouter } from './router'
import { createContext } from './trpc'

const server = createHTTPServer({
  router: appRouter,
  createContext,
})

const PORT = process.env.PORT || 8080

server.listen(PORT)

console.log(`🚀 Server running on http://localhost:${PORT}`)
```

**Step 3: Test protected procedure (create example)**

Add a test protected mutation to `packages/api/src/router.ts`:

```typescript
getProfile: protectedProcedure.query(({ ctx }) => {
  return {
    userId: ctx.user.userId,
    email: ctx.user.email,
  };
}),
```

**Step 4: Test auth context manually**

Create `packages/api/test-auth.ts`:

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from './src/router'

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080',
    }),
  ],
})

// Create user and get token
const { token } = await client.createUser.mutate({
  email: `test-${Date.now()}@example.com`,
  password: 'password123',
})

// Test protected endpoint without token
const clientNoAuth = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080',
    }),
  ],
})

try {
  await clientNoAuth.getProfile.query()
  console.log('❌ Should require auth')
} catch (error: any) {
  console.log('✅ Correctly rejected unauthenticated request')
}

// Test protected endpoint with token
const clientWithAuth = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080',
      headers: {
        authorization: `Bearer ${token}`,
      },
    }),
  ],
})

const profile = await clientWithAuth.getProfile.query()
console.log('✅ Authenticated request succeeded:', profile.email)
```

Run:

```bash
bun run packages/api/test-auth.ts
```

Expected: Both checkmarks

**Step 5: Remove test endpoint and test file**

Remove `getProfile` from `packages/api/src/router.ts` and delete test file:

```bash
rm packages/api/test-auth.ts
```

**Step 6: Commit**

```bash
git add packages/api/src/trpc.ts packages/api/src/index.ts
git commit -m "feat(api): add auth context and protected procedure support"
```

---

## Task 5: CLI - Add Dependencies

**Files:**

- Modify: `packages/cli/package.json`

**Step 1: Install CLI dependencies**

```bash
cd packages/cli
bun add jose ink-select-input ink-text-input
```

Expected: Dependencies added to package.json

**Step 2: Commit**

```bash
git add packages/cli/package.json packages/cli/bun.lockb
git commit -m "feat(cli): add auth dependencies (jose, ink-select-input, ink-text-input)"
```

---

## Task 6: CLI - Create Types

**Files:**

- Create: `packages/cli/src/types.ts`

**Step 1: Create types file**

Create `packages/cli/src/types.ts`:

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
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/types.ts
git commit -m "feat(cli): add TypeScript types for routing and auth"
```

---

## Task 7: CLI - Create Credentials Utilities

**Files:**

- Create: `packages/cli/src/utils/credentials.ts`

**Step 1: Create utils directory**

```bash
mkdir -p packages/cli/src/utils
```

**Step 2: Create credentials utilities**

Create `packages/cli/src/utils/credentials.ts`:

```typescript
import { homedir } from 'os'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { jwtVerify } from 'jose'

const CONFIG_DIR = join(homedir(), '.shippr')
const CREDENTIALS_PATH = join(CONFIG_DIR, 'credentials.json')

export function getToken(): string | null {
  try {
    if (!existsSync(CREDENTIALS_PATH)) {
      return null
    }
    const data = readFileSync(CREDENTIALS_PATH, 'utf-8')
    const { token } = JSON.parse(data)
    return token || null
  } catch {
    return null
  }
}

export function saveToken(token: string): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true })
    }
    writeFileSync(CREDENTIALS_PATH, JSON.stringify({ token }, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save credentials:', error)
  }
}

export function clearToken(): void {
  try {
    if (existsSync(CREDENTIALS_PATH)) {
      unlinkSync(CREDENTIALS_PATH)
    }
  } catch (error) {
    console.error('Failed to clear credentials:', error)
  }
}

export async function isTokenValid(token: string): Promise<boolean> {
  try {
    // Just check if token is well-formed and not expired
    // Don't verify signature (we don't have the secret on client)
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    const payload = JSON.parse(atob(parts[1]))
    const exp = payload.exp

    if (!exp) {
      return false
    }

    // Check if expired (exp is in seconds, Date.now() is in ms)
    return exp * 1000 > Date.now()
  } catch {
    return false
  }
}
```

**Step 3: Commit**

```bash
git add packages/cli/src/utils/credentials.ts
git commit -m "feat(cli): add token storage and validation utilities"
```

---

## Task 8: CLI - Create tRPC Client

**Files:**

- Create: `packages/cli/src/utils/trpc.ts`

**Step 1: Install tRPC client dependencies**

```bash
cd packages/cli
bun add @trpc/client
```

**Step 2: Create tRPC client with auth headers**

Create `packages/cli/src/utils/trpc.ts`:

```typescript
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../../api/src/router'
import { getToken } from './credentials'

export const trpcClient = createTRPCClient<AppRouter>({
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

**Step 3: Commit**

```bash
git add packages/cli/src/utils/trpc.ts packages/cli/package.json packages/cli/bun.lockb
git commit -m "feat(cli): add tRPC client with auth header support"
```

---

## Task 9: CLI - Create Router Component

**Files:**

- Create: `packages/cli/src/components/Router.tsx`

**Step 1: Create components directory**

```bash
mkdir -p packages/cli/src/components
```

**Step 2: Create Router component**

Create `packages/cli/src/components/Router.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Route, RouteConfig, RouterContextType, RouteStackItem } from '../types';
import { getToken, clearToken, isTokenValid } from '../utils/credentials';

const RouterContext = createContext<RouterContextType>({
  push: () => {},
  pop: () => {},
  replace: () => {},
  currentRoute: 'auth',
  params: undefined,
});

export const useRouter = () => useContext(RouterContext);

type RouterProps = {
  routes: Record<Route, RouteConfig>;
  children?: React.ReactNode;
};

export function Router({ routes }: RouterProps) {
  const [routeStack, setRouteStack] = useState<RouteStackItem[]>([
    { name: 'auth' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();

      if (token && await isTokenValid(token)) {
        setRouteStack([{ name: 'dashboard' }]);
      } else {
        if (token) {
          clearToken();
        }
        setRouteStack([{ name: 'auth' }]);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const push = (route: Route, params?: any) => {
    setRouteStack([...routeStack, { name: route, params }]);
  };

  const pop = () => {
    if (routeStack.length > 1) {
      setRouteStack(routeStack.slice(0, -1));
    }
  };

  const replace = (route: Route, params?: any) => {
    setRouteStack([...routeStack.slice(0, -1), { name: route, params }]);
  };

  const current = routeStack[routeStack.length - 1];
  const routeConfig = routes[current.name];

  // Check auth guard
  useEffect(() => {
    const checkGuard = async () => {
      if (routeConfig.protected) {
        const token = getToken();
        if (!token || !(await isTokenValid(token))) {
          clearToken();
          setRouteStack([{ name: 'auth' }]);
        }
      }
    };

    checkGuard();
  }, [current.name, routeConfig.protected]);

  if (loading) {
    return null;
  }

  const Component = routeConfig.component;

  return (
    <RouterContext.Provider
      value={{
        push,
        pop,
        replace,
        currentRoute: current.name,
        params: current.params,
      }}
    >
      <Component />
    </RouterContext.Provider>
  );
}
```

**Step 3: Commit**

```bash
git add packages/cli/src/components/Router.tsx
git commit -m "feat(cli): add Router component with navigation stack and auth guards"
```

---

## Task 10: CLI - Create Menu Component

**Files:**

- Create: `packages/cli/src/components/Menu.tsx`

**Step 1: Create Menu component**

Create `packages/cli/src/components/Menu.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

type MenuProps = {
  onSelect: (choice: 'login' | 'signup') => void;
};

export function Menu({ onSelect }: MenuProps) {
  const items = [
    { label: 'Login', value: 'login' as const },
    { label: 'Create Account', value: 'signup' as const },
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Welcome! Please select an option:</Text>
      </Box>
      <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/Menu.tsx
git commit -m "feat(cli): add Menu component for login/signup selection"
```

---

## Task 11: CLI - Create LoginForm Component

**Files:**

- Create: `packages/cli/src/components/LoginForm.tsx`

**Step 1: Create LoginForm component**

Create `packages/cli/src/components/LoginForm.tsx`:

```typescript
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { trpcClient } from '../utils/trpc';
import { saveToken } from '../utils/credentials';
import { useRouter } from './Router';

export function LoginForm() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { replace } = useRouter();

  const handleEmailSubmit = (value: string) => {
    setEmail(value);
    setStep('password');
  };

  const handlePasswordSubmit = async (value: string) => {
    setPassword(value);
    setLoading(true);
    setError('');

    try {
      const result = await trpcClient.loginUser.mutate({ email, password: value });
      saveToken(result.token);
      replace('dashboard');
    } catch (err: any) {
      setLoading(false);
      if (err.message?.includes('UNAUTHORIZED')) {
        setError('Invalid email or password');
      } else if (err.message?.includes('fetch')) {
        setError('Cannot connect to server. Is the API running?');
      } else {
        setError('An unexpected error occurred');
      }
      setPassword('');
      setStep('password');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Login</Text>
      </Box>

      {step === 'email' && (
        <Box>
          <Text>Email: </Text>
          <TextInput value={email} onChange={setEmail} onSubmit={handleEmailSubmit} />
        </Box>
      )}

      {step === 'password' && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>Email: {email}</Text>
          </Box>
          <Box>
            <Text>Password: </Text>
            <TextInput
              value={password}
              onChange={setPassword}
              onSubmit={handlePasswordSubmit}
              mask="*"
            />
          </Box>
        </Box>
      )}

      {loading && (
        <Box>
          <Text dimColor>Logging in...</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/LoginForm.tsx
git commit -m "feat(cli): add LoginForm component with error handling"
```

---

## Task 12: CLI - Create SignupForm Component

**Files:**

- Create: `packages/cli/src/components/SignupForm.tsx`

**Step 1: Create SignupForm component**

Create `packages/cli/src/components/SignupForm.tsx`:

```typescript
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { trpcClient } from '../utils/trpc';
import { saveToken } from '../utils/credentials';
import { useRouter } from './Router';

export function SignupForm() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { replace } = useRouter();

  const handleEmailSubmit = (value: string) => {
    setEmail(value);
    setStep('password');
  };

  const handlePasswordSubmit = async (value: string) => {
    setPassword(value);

    if (value.length < 8) {
      setError('Password must be at least 8 characters');
      setPassword('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await trpcClient.createUser.mutate({ email, password: value });
      saveToken(result.token);
      replace('dashboard');
    } catch (err: any) {
      setLoading(false);
      if (err.message?.includes('CONFLICT') || err.message?.includes('already registered')) {
        setError('Email already registered');
      } else if (err.message?.includes('fetch')) {
        setError('Cannot connect to server. Is the API running?');
      } else {
        setError('An unexpected error occurred');
      }
      setPassword('');
      setStep('password');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Create Account</Text>
      </Box>

      {step === 'email' && (
        <Box>
          <Text>Email: </Text>
          <TextInput value={email} onChange={setEmail} onSubmit={handleEmailSubmit} />
        </Box>
      )}

      {step === 'password' && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text dimColor>Email: {email}</Text>
          </Box>
          <Box>
            <Text>Password (min 8 chars): </Text>
            <TextInput
              value={password}
              onChange={setPassword}
              onSubmit={handlePasswordSubmit}
              mask="*"
            />
          </Box>
        </Box>
      )}

      {loading && (
        <Box>
          <Text dimColor>Creating account...</Text>
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/SignupForm.tsx
git commit -m "feat(cli): add SignupForm component with validation"
```

---

## Task 13: CLI - Create AuthScreen Component

**Files:**

- Create: `packages/cli/src/components/AuthScreen.tsx`

**Step 1: Create AuthScreen component**

Create `packages/cli/src/components/AuthScreen.tsx`:

```typescript
import React, { useState } from 'react';
import { Menu } from './Menu';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

type Screen = 'menu' | 'login' | 'signup';

export function AuthScreen() {
  const [screen, setScreen] = useState<Screen>('menu');

  if (screen === 'menu') {
    return <Menu onSelect={(choice) => setScreen(choice)} />;
  }

  if (screen === 'login') {
    return <LoginForm />;
  }

  return <SignupForm />;
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/AuthScreen.tsx
git commit -m "feat(cli): add AuthScreen to orchestrate auth flow"
```

---

## Task 14: CLI - Create Dashboard Component

**Files:**

- Create: `packages/cli/src/components/Dashboard.tsx`

**Step 1: Create placeholder Dashboard component**

Create `packages/cli/src/components/Dashboard.tsx`:

```typescript
import React from 'react';
import { Box, Text } from 'ink';
import { clearToken } from '../utils/credentials';
import { useRouter } from './Router';

export function Dashboard() {
  const { replace } = useRouter();

  const handleLogout = () => {
    clearToken();
    replace('auth');
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">✓ Logged In Successfully!</Text>
      </Box>
      <Text>Welcome to the dashboard.</Text>
      <Box marginTop={1}>
        <Text dimColor>(Press Ctrl+C to logout and exit)</Text>
      </Box>
    </Box>
  );
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/Dashboard.tsx
git commit -m "feat(cli): add Dashboard placeholder component"
```

---

## Task 15: CLI - Wire Up Main App

**Files:**

- Modify: `packages/cli/src/index.tsx`

**Step 1: Update index.tsx to use Router**

Replace `packages/cli/src/index.tsx` with:

```typescript
import React from 'react';
import { render } from 'ink';
import { Router } from './components/Router';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import type { Route, RouteConfig } from './types';

const routes: Record<Route, RouteConfig> = {
  auth: {
    component: AuthScreen,
    protected: false,
  },
  dashboard: {
    component: Dashboard,
    protected: true,
  },
  settings: {
    component: Dashboard, // Placeholder
    protected: true,
  },
};

function App() {
  return <Router routes={routes} />;
}

render(<App />);
```

**Step 2: Commit**

```bash
git add packages/cli/src/index.tsx
git commit -m "feat(cli): wire up Router with auth and dashboard routes"
```

---

## Task 16: Add .gitignore for Credentials

**Files:**

- Create/Modify: `.gitignore`

**Step 1: Ensure .gitignore excludes credentials and .env**

Add to `.gitignore`:

```
# Environment variables
.env
.env.local

# API build artifacts
packages/api/dist/

# CLI build artifacts
packages/cli/dist/
packages/cli/cli

# User credentials
.shippr/

# Dependencies
node_modules/
bun.lockb

# Database
postgres_data/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore for credentials and env files"
```

---

## Task 17: Manual End-to-End Testing

**Files:**

- None (testing only)

**Step 1: Start the API server**

```bash
cd packages/api
bun run dev
```

Expected: "🚀 Server running on http://localhost:8080"

**Step 2: In new terminal, start the CLI**

```bash
cd packages/cli
bun run dev
```

Expected: Menu with "Login" and "Create Account" options

**Step 3: Test signup flow**

1. Select "Create Account" with arrow keys, press Enter
2. Enter email: `test@example.com`
3. Press Enter
4. Enter password: `password123`
5. Press Enter

Expected: "✓ Logged In Successfully!" dashboard screen

**Step 4: Verify token was saved**

```bash
cat ~/.shippr/credentials.json
```

Expected: JSON file with token field

**Step 5: Exit and restart CLI**

1. Press Ctrl+C to exit
2. Run `bun run dev` again

Expected: Goes straight to dashboard (token persists)

**Step 6: Test login with invalid credentials**

1. Delete credentials: `rm ~/.shippr/credentials.json`
2. Restart CLI: `bun run dev`
3. Select "Login"
4. Enter email: `wrong@example.com`
5. Enter password: `wrongpassword`

Expected: "Invalid email or password" error in red

**Step 7: Test login with valid credentials**

1. Select "Login" (or restart CLI)
2. Enter email: `test@example.com`
3. Enter password: `password123`

Expected: Dashboard appears

**Step 8: Test token expiration check**

Manually edit `~/.shippr/credentials.json` and set an invalid token:

```json
{
  "token": "invalid.token.here"
}
```

Restart CLI.

Expected: Returns to auth screen, clears invalid token

**Step 9: Manual testing complete**

All flows tested:

- ✅ Signup creates account and logs in
- ✅ Token persists across sessions
- ✅ Login validates credentials
- ✅ Invalid credentials show error
- ✅ Invalid tokens are cleared

---

## Task 18: Create README for Auth System

**Files:**

- Create: `docs/AUTH.md`

**Step 1: Document the auth system**

Create `docs/AUTH.md`:

````markdown
# Authentication System

## Overview

JWT-based authentication with persistent token storage.

## Architecture

- **API**: tRPC mutations for `loginUser` and `createUser`
- **CLI**: Ink TUI with forms, Router for navigation
- **Token Storage**: `~/.shippr/credentials.json`

## Security

- Passwords hashed with argon2id via `Bun.password.hash()`
- Timing-attack protection in login mutation
- JWT tokens expire after 7 days
- Generic error messages prevent email enumeration

## User Flow

### Signup

1. CLI → AuthScreen → Menu → SignupForm
2. User enters email and password (min 8 chars)
3. API validates, hashes password, creates user, returns JWT
4. CLI stores token in credentials.json
5. Router navigates to dashboard

### Login

1. CLI → AuthScreen → Menu → LoginForm
2. User enters email and password
3. API validates credentials, returns JWT
4. CLI stores token
5. Router navigates to dashboard

### Token Persistence

- On CLI startup, Router checks for token
- Valid token → Navigate to dashboard
- Invalid/expired token → Clear and show auth screen

## Development

### Environment Variables

```bash
# API (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/shippr
JWT_SECRET=i-am-not-a-secret
```
````

### Running Locally

```bash
# Terminal 1: Start API
cd packages/api
bun run dev

# Terminal 2: Start CLI
cd packages/cli
bun run dev
```

### Testing Auth Flow

```bash
# Delete credentials to test fresh flow
rm ~/.shippr/credentials.json

# Check stored token
cat ~/.shippr/credentials.json
```

## API Reference

### `createUser`

```typescript
input: { email: string, password: string (min 8) }
output: { token: string, user: { id: string, email: string } }
errors: CONFLICT (duplicate email)
```

### `loginUser`

```typescript
input: { email: string, password: string }
output: { token: string, user: { id: string, email: string } }
errors: UNAUTHORIZED (invalid credentials)
```

### Protected Procedures

Use `protectedProcedure` instead of `publicProcedure`:

```typescript
myProtectedEndpoint: protectedProcedure.query(({ ctx }) => {
  // ctx.user available: { userId: string, email: string }
})
```

## File Structure

```
packages/
├── api/
│   └── src/
│       ├── utils/jwt.ts          # JWT sign/verify
│       ├── types.ts              # Auth types
│       ├── trpc.ts               # Auth context
│       └── router.ts             # Auth mutations
└── cli/
    └── src/
        ├── components/
        │   ├── Router.tsx        # Navigation + guards
        │   ├── AuthScreen.tsx    # Auth orchestration
        │   ├── Menu.tsx          # Login/Signup selection
        │   ├── LoginForm.tsx     # Login form
        │   ├── SignupForm.tsx    # Signup form
        │   └── Dashboard.tsx     # Authed screen
        ├── utils/
        │   ├── credentials.ts    # Token storage
        │   └── trpc.ts           # API client
        └── types.ts              # Router types
```

````

**Step 2: Commit**

```bash
git add docs/AUTH.md
git commit -m "docs: add authentication system documentation"
````

---

## Final Commit

**Step 1: Verify all changes are committed**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 2: Review commit history**

```bash
git log --oneline
```

Expected: ~18 commits covering all implementation tasks

---

## Done!

The authentication system is complete:

✅ API: JWT utilities, loginUser/createUser mutations, auth context
✅ CLI: Router with navigation stack, auth forms, token storage
✅ Security: Timing-attack protection, argon2id hashing, token expiration
✅ UX: Persistent login, clear error messages, clean TUI
✅ Documentation: Design doc, auth guide, inline comments

### Next Steps

1. **Test thoroughly** with various scenarios
2. **Add more protected routes** using the router's `protected: true` flag
3. **Improve UX** with loading spinners, better error messages
4. **Add logout button** to Dashboard component
5. **Generate stronger JWT_SECRET** for production: `openssl rand -base64 32`
