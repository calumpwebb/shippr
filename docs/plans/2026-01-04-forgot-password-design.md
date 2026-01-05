# Forgot Password Feature Design

## Overview

Allow users to reset their password via a 6-digit verification code. Codes are printed to console for dev purposes (email integration can be added later).

## Database Schema

New `password_reset_tokens` table:

```ts
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  code: varchar('code', { length: 6 }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

Key points:
- `userId` has unique constraint (one token per user)
- Old tokens are deleted before creating new ones (belt-and-suspenders with unique constraint)
- Tokens deleted on successful password reset
- Code stored as plain text (acceptable given short expiry + attempt limits)

## API Endpoints

### `requestPasswordReset`

```ts
input: { email: string }
output: { success: true }
```

- Look up user by email
- If not found, still return success (prevent email enumeration)
- Delete any existing token for this user
- Generate 6-digit code using `crypto.randomInt(100000, 999999)`
- Insert new token with `createdAt = now()`
- Print code to console: `[Password Reset] Code for {email}: {code}`
- Return success

### `resetPassword`

```ts
input: { email: string, code: string, newPassword: string }
output: { success: true }
```

- Look up user by email
- Look up token by userId
- Validate token:
  - Exists → else "Invalid or expired code"
  - Not expired (`createdAt + 10 minutes > now()`) → else "Code expired"
  - Attempts < 3 → else "Too many attempts, request a new code"
  - Code matches → else increment attempts, "Invalid code, X attempts remaining"
- Hash new password with `Bun.password.hash()`
- Update user's passwordHash
- Delete the token
- Return success

## CLI Components

### ForgotPasswordForm

Two-stage form component:

**Stage 1: Request Code**
- Email input field
- Submit button
- On submit: call `requestPasswordReset`, move to stage 2

**Stage 2: Reset Password**
- Code input (6 digits)
- New password input (masked)
- Confirm password input (masked)
- Submit button
- Local validation: passwords match, min 8 chars
- On submit: call `resetPassword`
- On success: navigate to login with success message

### Navigation

- Add "Forgot password?" option to LoginForm (below login button)
- ESC key returns to previous screen (consistent with existing forms)
- After successful reset: navigate to login screen with success banner

### Login Screen Update

- Accept optional `successMessage` prop/state
- Display green success banner at top when present (e.g., "Password reset successfully!")

## Edge Cases

| Case | Handling |
|------|----------|
| Email not found | Return success anyway (no enumeration) |
| Code expired (>10 min) | "Code expired, please request a new one" |
| Wrong code | Increment attempts, "Invalid code, X attempts remaining" |
| Max attempts (3) | "Too many attempts, please request a new code" |
| Password too short | Validation error (<8 chars) |
| Passwords don't match | Local CLI validation before API call |
| Request new code | No resend button; user goes back and starts over |

## Security Considerations

- Codes generated with `crypto.randomInt()` (not Math.random)
- 10-minute expiry window
- 3 attempt limit prevents brute force
- No email enumeration (always return success on request)
- Plain text code storage acceptable given constraints above
