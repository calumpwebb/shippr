import { setupTestDb } from '@shippr/db/test-utils'
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { createAppRouter } from './index'
import { motd } from '@shippr/db/schema'
import type { Database } from '@shippr/db/client'
import type { TestContainer } from '@shippr/db/test-utils'

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

describe('motd.getRandom', () => {
  test('returns null when no messages exist', async () => {
    await db.delete(motd)

    const result = await caller.motd.getRandom()

    expect(result.message).toBeNull()
  })

  test('returns message when active messages exist', async () => {
    await db.delete(motd)
    await db.insert(motd).values({
      message: 'Hello, world!',
      active: true,
    })

    const result = await caller.motd.getRandom()

    expect(result.message).toBe('Hello, world!')
  })

  test('ignores inactive messages', async () => {
    await db.delete(motd)

    await db.insert(motd).values({
      message: 'Inactive message',
      active: false,
    })

    const result = await caller.motd.getRandom()

    expect(result.message).toBeNull()
  })

  test('returns one of the active messages when multiple exist', async () => {
    // Clear existing messages
    await db.delete(motd)

    const messages = ['Message 1', 'Message 2', 'Message 3']
    await db.insert(motd).values(messages.map((message) => ({ message, active: true })))

    const result = await caller.motd.getRandom()

    expect(result.message).not.toBeNull()
    expect(messages).toContain(result.message!)
  })
})
