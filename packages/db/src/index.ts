import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@shippr/shared/env'
import * as schema from './schema'

const client = postgres(env.DATABASE_URL)
export const db = drizzle(client, { schema })

export type { Database } from './client'
export * from './schema'

// Re-export commonly used drizzle-orm operators
export {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  sql,
} from 'drizzle-orm'
