import { setupTestDb } from '@shippr/db/test-utils'
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { router, publicProcedure, protectedProcedure } from './trpc'
import { appRouter } from './routers'
import { createJwtService, type JwtPayload } from '@shippr/shared/jwt'
import type { Database } from '@shippr/db/client'
import type { TestContainer } from '@shippr/db/test-utils'

// Test secret - must be at least 32 characters
const TEST_JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
const jwt = createJwtService(TEST_JWT_SECRET)

// Minimal test router to verify procedure behavior
const testRouter = router({
  publicEndpoint: publicProcedure.query(() => {
    return { public: true }
  }),
  protectedEndpoint: protectedProcedure.query(({ ctx }) => {
    return { userId: ctx.user.userId }
  }),
})

let container: TestContainer
let db: Database

beforeAll(async () => {
  const testDb = await setupTestDb()
  container = testDb.container
  db = testDb.db
}, 60000)

afterAll(async () => {
  await container?.stop()
})

/** Helper to create a real user and get their token payload */
async function createRealUser(email: string, password: string): Promise<JwtPayload> {
  const caller = appRouter.createCaller({ db, jwt, user: null })
  const { token } = await caller.auth.createUser({ email, password })
  return jwt.verifyToken(token)
}

describe('publicProcedure', () => {
  test('allows unauthenticated access', async () => {
    const caller = testRouter.createCaller({ db, jwt, user: null })
    const result = await caller.publicEndpoint()
    expect(result.public).toBe(true)
  })

  test('allows authenticated access', async () => {
    const user = await createRealUser('public-auth@example.com', 'password123')
    const caller = testRouter.createCaller({ db, jwt, user })
    const result = await caller.publicEndpoint()
    expect(result.public).toBe(true)
  })
})

describe('protectedProcedure', () => {
  test('rejects unauthenticated access', async () => {
    const caller = testRouter.createCaller({ db, jwt, user: null })
    expect(caller.protectedEndpoint()).rejects.toThrow('UNAUTHORIZED')
  })

  test('allows authenticated access and provides user context', async () => {
    const user = await createRealUser('protected-auth@example.com', 'password123')
    const caller = testRouter.createCaller({ db, jwt, user })
    const result = await caller.protectedEndpoint()
    expect(result.userId).toBe(user.userId)
  })
})
