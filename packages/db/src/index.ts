// Re-export the factory and types - no env dependency
export { createDb, type Database } from './client'
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
