import { router } from '../trpc'
import { db as defaultDb, type Database } from '@shippr/db'
import { createAuthRouter } from './auth'
import { createUserRouter } from './user'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- tRPC router type used via typeof
export function createAppRouter(db: Database) {
  return router({
    auth: createAuthRouter(db),
    user: createUserRouter(db),
  })
}

export const appRouter = createAppRouter(defaultDb as Database)

export type AppRouter = typeof appRouter
