import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createDbService, type Database } from './client'

const MIGRATIONS_PATH = new URL('../drizzle', import.meta.url).pathname
const TEST_CONTAINER_LABEL = 'shippr-test'

async function exec(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' })
  const output = await new Response(proc.stdout).text()
  await proc.exited
  return output.trim()
}

/** Clean up any orphaned test containers from previous runs */
export async function cleanupTestContainers(): Promise<void> {
  const containers = await exec(['docker', 'ps', '-q', '--filter', `label=${TEST_CONTAINER_LABEL}`])
  if (containers) {
    const ids = containers.split('\n').filter(Boolean)
    if (ids.length > 0) {
      console.log(`[test-cleanup] Stopping ${ids.length} orphaned test container(s)...`)
      await exec(['docker', 'stop', ...ids])
    }
  }
}

async function waitForPostgres(connectionString: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const sql = postgres(connectionString, { max: 1, connect_timeout: 1 })
      await sql`SELECT 1`
      await sql.end()
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error('Postgres did not become ready')
}

export interface TestContainer {
  id: string
  stop: () => Promise<void>
}

export async function setupTestDb(): Promise<{ db: Database; container: TestContainer }> {
  console.log('[test-setup] Starting Postgres container...')

  // Clean up any orphaned containers from previous runs
  await cleanupTestContainers()

  // Start container and get ID
  const containerId = await exec([
    'docker',
    'run',
    '-d',
    '--rm',
    '--label',
    TEST_CONTAINER_LABEL,
    '-e',
    'POSTGRES_USER=test',
    '-e',
    'POSTGRES_PASSWORD=test',
    '-e',
    'POSTGRES_DB=test',
    '-p',
    '0:5432',
    'postgres:16-alpine',
  ])
  console.log('[test-setup] Container ID:', containerId)

  // Get mapped port
  const portInfo = await exec(['docker', 'port', containerId, '5432'])
  const port = portInfo.split(':').pop()
  console.log('[test-setup] Mapped port:', port)

  const connectionString = `postgres://test:test@localhost:${port}/test`
  console.log('[test-setup] Connection:', connectionString)

  console.log('[test-setup] Waiting for Postgres to be ready...')
  await waitForPostgres(connectionString)
  console.log('[test-setup] Postgres is ready!')

  const db = createDbService(connectionString)

  console.log('[test-setup] Running migrations from:', MIGRATIONS_PATH)
  await migrate(db, { migrationsFolder: MIGRATIONS_PATH })
  console.log('[test-setup] Migrations complete!')

  const container: TestContainer = {
    id: containerId,
    stop: async () => {
      await exec(['docker', 'stop', containerId])
    },
  }

  return { db, container }
}
