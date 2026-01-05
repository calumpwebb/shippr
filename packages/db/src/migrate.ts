import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { env } from '@shippr/shared/env'

const client = postgres(env.DATABASE_URL, { max: 1 })
const db = drizzle(client)

async function main(): Promise<void> {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations completed!')
  await client.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
