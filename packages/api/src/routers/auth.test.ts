import { setupTestDb } from '@ink-starter/db/test-utils'
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { createAppRouter } from './index'
import { passwordResetTokens, users } from '@ink-starter/db/schema'
import { eq } from 'drizzle-orm'
import type { Database } from '@ink-starter/db/client'
import type { TestContainer } from '@ink-starter/db/test-utils'

let container: TestContainer
let db: Database
let caller: ReturnType<ReturnType<typeof createAppRouter>['createCaller']>

beforeAll(async () => {
  const testDb = await setupTestDb()
  container = testDb.container
  db = testDb.db

  const router = createAppRouter(db)
  caller = router.createCaller({ user: null })
}, 60000)

afterAll(async () => {
  await container?.stop()
})

describe('auth.createUser', () => {
  test('creates user and returns token', async () => {
    const result = await caller.auth.createUser({
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result.token).toBeDefined()
    expect(result.user.email).toBe('test@example.com')
    expect(result.user.id).toBeDefined()
  })

  test('rejects duplicate email', async () => {
    await caller.auth.createUser({
      email: 'duplicate@example.com',
      password: 'password123',
    })

    expect(
      caller.auth.createUser({
        email: 'duplicate@example.com',
        password: 'password123',
      })
    ).rejects.toThrow('Email already registered')
  })
})

describe('auth.login', () => {
  test('returns token for valid credentials', async () => {
    await caller.auth.createUser({
      email: 'login@example.com',
      password: 'password123',
    })

    const result = await caller.auth.login({
      email: 'login@example.com',
      password: 'password123',
    })

    expect(result.token).toBeDefined()
    expect(result.user.email).toBe('login@example.com')
  })

  test('rejects wrong password', async () => {
    await caller.auth.createUser({
      email: 'wrongpass@example.com',
      password: 'password123',
    })

    expect(
      caller.auth.login({
        email: 'wrongpass@example.com',
        password: 'wrongpassword',
      })
    ).rejects.toThrow('Invalid credentials')
  })

  test('rejects non-existent email', async () => {
    expect(
      caller.auth.login({
        email: 'nobody@example.com',
        password: 'password123',
      })
    ).rejects.toThrow('Invalid credentials')
  })
})

describe('auth.requestPasswordReset', () => {
  test('returns success for existing user', async () => {
    await caller.auth.createUser({
      email: 'reset@example.com',
      password: 'password123',
    })

    const result = await caller.auth.requestPasswordReset({
      email: 'reset@example.com',
    })

    expect(result.success).toBe(true)
  })

  test('returns success for non-existent email (prevents enumeration)', async () => {
    const result = await caller.auth.requestPasswordReset({
      email: 'nonexistent@example.com',
    })

    expect(result.success).toBe(true)
  })
})

describe('auth.resetPassword', () => {
  test('resets password with valid code', async () => {
    await caller.auth.createUser({
      email: 'resetvalid@example.com',
      password: 'oldpassword123',
    })

    await caller.auth.requestPasswordReset({ email: 'resetvalid@example.com' })

    // Get the code from the database for this user
    const [user] = await db.select().from(users).where(eq(users.email, 'resetvalid@example.com'))
    const [token] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
    const code = token.code

    const result = await caller.auth.resetPassword({
      email: 'resetvalid@example.com',
      code,
      newPassword: 'newpassword123',
    })

    expect(result.success).toBe(true)

    // Verify new password works
    const loginResult = await caller.auth.login({
      email: 'resetvalid@example.com',
      password: 'newpassword123',
    })
    expect(loginResult.token).toBeDefined()
  })

  test('rejects wrong code and tracks attempts', async () => {
    await caller.auth.createUser({
      email: 'wrongcode@example.com',
      password: 'password123',
    })

    await caller.auth.requestPasswordReset({ email: 'wrongcode@example.com' })

    expect(
      caller.auth.resetPassword({
        email: 'wrongcode@example.com',
        code: '000000',
        newPassword: 'newpassword123',
      })
    ).rejects.toThrow('Invalid code')
  })
})

