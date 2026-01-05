import { setupTestDb } from '@shippr/db/test-utils'
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { appRouter } from './index'
import { motd } from '@shippr/db/schema'
import { createJwtService } from '@shippr/shared/jwt'
import type { Database } from '@shippr/db/client'
import type { TestContainer } from '@shippr/db/test-utils'

// Test secret - must be at least 32 characters
const TEST_JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
const jwt = createJwtService(TEST_JWT_SECRET)

let container: TestContainer
let db: Database
let caller: ReturnType<typeof appRouter.createCaller>

beforeAll(async () => {
  const testDb = await setupTestDb()
  container = testDb.container
  db = testDb.db

  caller = appRouter.createCaller({ db, jwt, user: null })
}, 60000)

beforeEach(async () => {
  // Clear existing messages
  await db.delete(motd)
})

afterAll(async () => {
  await container?.stop()
})

describe('motd.getRandom', () => {
  test('returns null when no messages exist', async () => {
    const result = await caller.motd.getRandom()

    expect(result.message).toBeNull()
  })

  test('returns message when active messages exist', async () => {
    await db.insert(motd).values({
      message: 'Hello, world!',
      active: true,
    })

    const result = await caller.motd.getRandom()

    expect(result.message).toBe('Hello, world!')
  })

  test('ignores inactive messages', async () => {
    await db.insert(motd).values({
      message: 'Inactive message',
      active: false,
    })

    const result = await caller.motd.getRandom()

    expect(result.message).toBeNull()
  })

  test('returns one of the active messages when multiple exist', async () => {
    const messages = ['Message 1', 'Message 2', 'Message 3']
    await db.insert(motd).values(messages.map((message) => ({ message, active: true })))

    const result = await caller.motd.getRandom()

    expect(result.message).not.toBeNull()
    expect(messages).toContain(result.message!)
  })
})
