import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- return type used via typeof for Database
export function createDb(connectionString: string) {
  const client = postgres(connectionString)
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof createDb>
