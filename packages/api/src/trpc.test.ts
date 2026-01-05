import { setupTestDb } from '@ink-starter/db/test-utils'
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { router, publicProcedure, protectedProcedure } from './trpc'
import { createAppRouter } from './routers'
import { verifyToken } from './utils/jwt'
import type { Database } from '@ink-starter/db/client'
import type { TestContainer } from '@ink-starter/db/test-utils'

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
let appRouter: ReturnType<typeof createAppRouter>

beforeAll(async () => {
  const testDb = await setupTestDb()
  container = testDb.container
  db = testDb.db
  appRouter = createAppRouter(db)
}, 60000)

afterAll(async () => {
  await container?.stop()
})

/** Helper to create a real user and get their token payload */
async function createRealUser(email: string, password: string) {
  const caller = appRouter.createCaller({ user: null })
  const { token } = await caller.auth.createUser({ email, password })
  return verifyToken(token)
}

describe('publicProcedure', () => {
  test('allows unauthenticated access', async () => {
    const caller = testRouter.createCaller({ user: null })
    const result = await caller.publicEndpoint()
    expect(result.public).toBe(true)
  })

  test('allows authenticated access', async () => {
    const user = await createRealUser('public-auth@example.com', 'password123')
    const caller = testRouter.createCaller({ user })
    const result = await caller.publicEndpoint()
    expect(result.public).toBe(true)
  })
})

describe('protectedProcedure', () => {
  test('rejects unauthenticated access', async () => {
    const caller = testRouter.createCaller({ user: null })
    expect(caller.protectedEndpoint()).rejects.toThrow('UNAUTHORIZED')
  })

  test('allows authenticated access and provides user context', async () => {
    const user = await createRealUser('protected-auth@example.com', 'password123')
    const caller = testRouter.createCaller({ user })
    const result = await caller.protectedEndpoint()
    expect(result.userId).toBe(user.userId)
  })
})
