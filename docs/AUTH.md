# Authentication System

## Overview

JWT-based authentication with persistent token storage.

## Architecture

- **API**: tRPC mutations for `loginUser` and `createUser`
- **CLI**: Ink TUI with forms, Router for navigation
- **Token Storage**: `~/.ink-starter/credentials.json`

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
DATABASE_URL=postgresql://user:password@localhost:5432/ink-starter
JWT_SECRET=i-am-not-a-secret
```

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
rm ~/.ink-starter/credentials.json

# Check stored token
cat ~/.ink-starter/credentials.json
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
myProtectedEndpoint: protectedProcedure
  .query(({ ctx }) => {
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
