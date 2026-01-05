# Screen Reorganization Design

## Overview

Break up the monolithic `AuthScreen` into separate screen files, each as its own route. Add typed route params and a `reset()` method to the router.

## File Structure

```
packages/cli/src/
├── screens/
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── CreateAccountScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   ├── ResetPasswordScreen.tsx
│   ├── DashboardScreen.tsx
│   └── SettingsScreen.tsx
├── components/
│   ├── Router.tsx
│   ├── Footer.tsx
│   ├── TextInput.tsx
│   └── Menu.tsx
├── routes.ts
├── types.ts
└── index.tsx
```

## Routes Configuration

Single source of truth in `routes.ts`:

```typescript
export const routes = {
  welcome: { component: WelcomeScreen, protected: false },
  login: { component: LoginScreen, protected: false },
  'create-account': { component: CreateAccountScreen, protected: false },
  'forgot-password': { component: ForgotPasswordScreen, protected: false },
  'reset-password': { component: ResetPasswordScreen, protected: false },
  dashboard: { component: DashboardScreen, protected: true },
  settings: { component: SettingsScreen, protected: true },
} as const

export type Route = keyof typeof routes
```

## Typed Route Params

```typescript
export type RouteParams = {
  welcome: undefined
  login: { successMessage?: string }
  'create-account': undefined
  'forgot-password': undefined
  'reset-password': { email: string }
  dashboard: undefined
  settings: undefined
}
```

Router methods are typed to require params when needed:

```typescript
router.push('welcome') // OK - no params
router.push('login', { successMessage: 'hi' }) // OK - optional param
router.push('reset-password', { email: 'a@b' }) // OK - required param
router.push('reset-password') // ERROR - missing email
```

## Router Methods

- `push(route, params?)` — Navigate forward, add to stack
- `pop()` — Go back one screen
- `replace(route, params?)` — Replace current screen (keeps history)
- `reset(route, params?)` — Clear stack entirely, start fresh (for sign out)

## Navigation Flow

| From            | To              | Params               | Trigger           |
| --------------- | --------------- | -------------------- | ----------------- |
| welcome         | login           | —                    | Menu selection    |
| welcome         | create-account  | —                    | Menu selection    |
| welcome         | forgot-password | —                    | Menu selection    |
| login           | dashboard       | —                    | Successful login  |
| login           | welcome         | —                    | ESC / back        |
| create-account  | login           | `{ successMessage }` | Successful signup |
| create-account  | welcome         | —                    | ESC / back        |
| forgot-password | reset-password  | `{ email }`          | Code sent         |
| forgot-password | welcome         | —                    | ESC / back        |
| reset-password  | login           | `{ successMessage }` | Password reset    |
| reset-password  | forgot-password | —                    | ESC / back        |
| dashboard       | settings        | —                    | Menu selection    |
| dashboard       | welcome         | —                    | Sign out (reset)  |
| settings        | dashboard       | —                    | ESC / back        |

## Implementation Tasks

### Create (8 files)

- `src/screens/WelcomeScreen.tsx`
- `src/screens/LoginScreen.tsx`
- `src/screens/CreateAccountScreen.tsx`
- `src/screens/ForgotPasswordScreen.tsx`
- `src/screens/ResetPasswordScreen.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/routes.ts`

### Update (3 files)

- `src/types.ts` — Add RouteParams, update RouterContextType
- `src/components/Router.tsx` — Add reset(), typed methods, initial route 'welcome'
- `src/index.tsx` — Import from routes.ts

### Delete (4 files)

- `src/components/AuthScreen.tsx`
- `src/components/LoginForm.tsx`
- `src/components/SignupForm.tsx`
- `src/components/ForgotPasswordForm.tsx`
