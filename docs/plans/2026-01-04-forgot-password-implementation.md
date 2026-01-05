# Forgot Password Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to reset their password via a 6-digit verification code printed to console.

**Architecture:** New `password_reset_tokens` table stores codes with attempt tracking. Two tRPC endpoints handle request and reset. New CLI form with two stages accessible from login screen.

**Tech Stack:** Drizzle ORM, tRPC, Ink/React, Bun crypto

---

### Task 1: Add Database Schema

**Files:**

- Modify: `packages/api/src/db/schema.ts`

**Step 1: Add the password_reset_tokens table**

Add after the `users` table:

```ts
import { pgTable, uuid, timestamp, varchar, integer } from 'drizzle-orm/pg-core'

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  code: varchar('code', { length: 6 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert
```

**Step 2: Run migration**

Run: `cd packages/api && bun run db:generate && bun run db:migrate`
Expected: Migration creates `password_reset_tokens` table

**Step 3: Commit**

```bash
git add packages/api/src/db/schema.ts packages/api/drizzle/
git commit -m "feat(api): add password_reset_tokens table"
```

---

### Task 2: Add requestPasswordReset Endpoint

**Files:**

- Modify: `packages/api/src/router.ts`

**Step 1: Add the requestPasswordReset procedure**

Add after `loginUser`:

```ts
requestPasswordReset: publicProcedure
  .input(z.object({ email: z.string().email() }))
  .mutation(async ({ input }) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email));

    if (!user) {
      // Return success anyway to prevent email enumeration
      return { success: true };
    }

    // Delete any existing token for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Insert new token
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      code,
    });

    // Log code to console (simulating email)
    console.log(`[Password Reset] Code for ${input.email}: ${code}`);

    return { success: true };
  }),
```

Add import at top:

```ts
import { passwordResetTokens } from './db/schema'
```

**Step 2: Test manually**

Run: `cd packages/api && bun run dev`
Test with existing user email - should see code in console.

**Step 3: Commit**

```bash
git add packages/api/src/router.ts
git commit -m "feat(api): add requestPasswordReset endpoint"
```

---

### Task 3: Add resetPassword Endpoint

**Files:**

- Modify: `packages/api/src/router.ts`

**Step 1: Add the resetPassword procedure**

Add after `requestPasswordReset`:

```ts
resetPassword: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      code: z.string().length(6),
      newPassword: z.string().min(8),
    })
  )
  .mutation(async ({ input }) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email));

    if (!user) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired code' });
    }

    const [token] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    if (!token) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired code' });
    }

    // Check expiry (10 minutes)
    const expiresAt = new Date(token.createdAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expiresAt) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id));
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code expired, please request a new one' });
    }

    // Check attempts
    if (token.attempts >= 3) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id));
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Too many attempts, please request a new code' });
    }

    // Verify code
    if (token.code !== input.code) {
      await db
        .update(passwordResetTokens)
        .set({ attempts: token.attempts + 1 })
        .where(eq(passwordResetTokens.id, token.id));
      const remaining = 2 - token.attempts;
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid code, ${remaining} attempt${remaining === 1 ? '' : 's'} remaining`,
      });
    }

    // Update password
    const passwordHash = await Bun.password.hash(input.newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

    // Delete token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id));

    return { success: true };
  }),
```

**Step 2: Test manually**

Test: request code, then reset with correct/incorrect codes.

**Step 3: Commit**

```bash
git add packages/api/src/router.ts
git commit -m "feat(api): add resetPassword endpoint"
```

---

### Task 4: Create ForgotPasswordForm Component

**Files:**

- Create: `packages/cli/src/components/ForgotPasswordForm.tsx`

**Step 1: Create the component**

```tsx
import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { trpcClient } from '../utils/trpc'
import { useRouter } from './Router'
import { Footer } from './Footer'

type ForgotPasswordFormProps = {
  onBack: () => void
}

type Stage = 'email' | 'reset'

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [activeField, setActiveField] = useState<
    'email' | 'code' | 'newPassword' | 'confirmPassword' | 'submit'
  >('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { navigate } = useRouter()

  const handleRequestCode = async () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      await trpcClient.requestPasswordReset.mutate({ email })
      setStage('reset')
      setActiveField('code')
    } catch (err: any) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!code.trim()) {
      setError('Code is required')
      setActiveField('code')
      return
    }
    if (code.length !== 6) {
      setError('Code must be 6 digits')
      setActiveField('code')
      return
    }
    if (!newPassword) {
      setError('New password is required')
      setActiveField('newPassword')
      return
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      setActiveField('newPassword')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setActiveField('confirmPassword')
      return
    }

    setLoading(true)
    setError('')

    try {
      await trpcClient.resetPassword.mutate({ email, code, newPassword })
      navigate('login', { successMessage: 'Password reset successfully!' })
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'An unexpected error occurred')
    }
  }

  const handleFieldSubmit = () => {
    if (stage === 'email') {
      if (activeField === 'email') {
        setActiveField('submit')
      }
    } else {
      if (activeField === 'code') setActiveField('newPassword')
      else if (activeField === 'newPassword') setActiveField('confirmPassword')
      else if (activeField === 'confirmPassword') setActiveField('submit')
    }
  }

  useInput((input, key) => {
    if (loading) return
    if (key.escape) {
      if (stage === 'reset') {
        setStage('email')
        setActiveField('email')
        setCode('')
        setNewPassword('')
        setConfirmPassword('')
        setError('')
      } else {
        onBack()
      }
    } else if (key.upArrow || (key.shift && key.tab)) {
      if (stage === 'email') {
        setActiveField((f) => (f === 'email' ? 'submit' : 'email'))
      } else {
        setActiveField((f) => {
          if (f === 'code') return 'submit'
          if (f === 'newPassword') return 'code'
          if (f === 'confirmPassword') return 'newPassword'
          return 'confirmPassword'
        })
      }
    } else if (key.downArrow || key.tab) {
      if (stage === 'email') {
        setActiveField((f) => (f === 'email' ? 'submit' : 'email'))
      } else {
        setActiveField((f) => {
          if (f === 'code') return 'newPassword'
          if (f === 'newPassword') return 'confirmPassword'
          if (f === 'confirmPassword') return 'submit'
          return 'code'
        })
      }
    } else if (key.return && activeField === 'submit') {
      if (stage === 'email') {
        handleRequestCode()
      } else {
        handleResetPassword()
      }
    }
  })

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>{stage === 'email' ? 'Requesting code...' : 'Resetting password...'}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>{stage === 'email' ? 'Forgot Password' : 'Reset Password'}</Text>
      </Box>

      {error && (
        <Box marginBottom={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {stage === 'email' && (
        <Box flexDirection="column">
          <Text dimColor marginBottom={1}>
            Enter your email to receive a reset code.
          </Text>
          <Box>
            <Text dimColor={activeField !== 'email'}>Email: </Text>
            {activeField === 'email' ? (
              <TextInput value={email} onChange={setEmail} onSubmit={handleFieldSubmit} />
            ) : (
              <Text dimColor>{email}</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text
              color={activeField === 'submit' ? 'green' : undefined}
              dimColor={activeField !== 'submit'}
            >
              [ Send Code ]
            </Text>
          </Box>
        </Box>
      )}

      {stage === 'reset' && (
        <Box flexDirection="column">
          <Text dimColor marginBottom={1}>
            Check your console for the 6-digit code.
          </Text>
          <Box>
            <Text dimColor={activeField !== 'code'}>Code: </Text>
            {activeField === 'code' ? (
              <TextInput value={code} onChange={setCode} onSubmit={handleFieldSubmit} />
            ) : (
              <Text dimColor>{code}</Text>
            )}
          </Box>
          <Box>
            <Text dimColor={activeField !== 'newPassword'}>New Password: </Text>
            {activeField === 'newPassword' ? (
              <TextInput
                value={newPassword}
                onChange={setNewPassword}
                onSubmit={handleFieldSubmit}
                mask="*"
              />
            ) : (
              <Text dimColor>{'*'.repeat(newPassword.length)}</Text>
            )}
          </Box>
          <Box>
            <Text dimColor={activeField !== 'confirmPassword'}>Confirm Password: </Text>
            {activeField === 'confirmPassword' ? (
              <TextInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                onSubmit={handleFieldSubmit}
                mask="*"
              />
            ) : (
              <Text dimColor>{'*'.repeat(confirmPassword.length)}</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text
              color={activeField === 'submit' ? 'green' : undefined}
              dimColor={activeField !== 'submit'}
            >
              [ Reset Password ]
            </Text>
          </Box>
        </Box>
      )}

      <Footer />
    </Box>
  )
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/ForgotPasswordForm.tsx
git commit -m "feat(cli): add ForgotPasswordForm component"
```

---

### Task 5: Update Router to Support Success Messages

**Files:**

- Modify: `packages/cli/src/components/Router.tsx`

**Step 1: Update RouterContext to support params**

Update the navigate function to accept optional params, and add state for route params:

```ts
// Add to context type
type RouteParams = Record<string, any>;

// Update context value to include params
const [routeParams, setRouteParams] = useState<RouteParams>({});

const navigate = (route: Route, params?: RouteParams) => {
  setHistory([...history, currentRoute]);
  setCurrentRoute(route);
  setRouteParams(params || {});
};

// Expose params in context
value={{ currentRoute, navigate, replace, back, params: routeParams }}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/Router.tsx
git commit -m "feat(cli): add route params support to Router"
```

---

### Task 6: Update LoginForm to Show Success Message

**Files:**

- Modify: `packages/cli/src/components/LoginForm.tsx`

**Step 1: Add success message display**

Get params from router and display success message if present:

```tsx
const { replace, params } = useRouter()

// Add after error display, before form
{
  params?.successMessage && (
    <Box marginBottom={1}>
      <Text color="green">{params.successMessage}</Text>
    </Box>
  )
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/LoginForm.tsx
git commit -m "feat(cli): display success message on login screen"
```

---

### Task 7: Add Forgot Password Link to LoginForm

**Files:**

- Modify: `packages/cli/src/components/LoginForm.tsx`

**Step 1: Add forgot password navigation**

Add 'forgot' to activeField type and add the link after the login button:

```tsx
// Update activeField type
const [activeField, setActiveField] = useState<'email' | 'password' | 'submit' | 'forgot'>('email')

// Add after [ Login ] box
;<Box>
  <Text color={activeField === 'forgot' ? 'cyan' : undefined} dimColor={activeField !== 'forgot'}>
    [ Forgot Password? ]
  </Text>
</Box>

// Update navigation handlers to include 'forgot'
// Update useInput to handle 'forgot' selection -> navigate('forgotPassword')
```

**Step 2: Commit**

```bash
git add packages/cli/src/components/LoginForm.tsx
git commit -m "feat(cli): add forgot password link to login form"
```

---

### Task 8: Register ForgotPassword Route

**Files:**

- Modify: `packages/cli/src/components/Router.tsx`
- Modify: `packages/cli/src/index.tsx` (if needed)

**Step 1: Add 'forgotPassword' to Route type and render ForgotPasswordForm**

```tsx
import { ForgotPasswordForm } from './ForgotPasswordForm';

// Add to Route type
type Route = 'auth' | 'login' | 'signup' | 'dashboard' | 'forgotPassword';

// Add case in render
case 'forgotPassword':
  return <ForgotPasswordForm onBack={back} />;
```

**Step 2: Test the full flow**

1. Start API: `cd packages/api && bun run dev`
2. Start CLI: `cd packages/cli && bun run dev`
3. Navigate to Login > Forgot Password
4. Enter email, get code from API console
5. Enter code and new password
6. Verify redirect to login with success message
7. Log in with new password

**Step 3: Commit**

```bash
git add packages/cli/src/components/Router.tsx
git commit -m "feat(cli): register forgotPassword route"
```

---

### Task 9: Final Testing and Cleanup

**Step 1: Test edge cases**

- Wrong code: should show attempts remaining
- Expired code: should show expiry message
- Max attempts: should invalidate code
- Email not found: should still show success (no enumeration)

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete forgot password implementation"
```
