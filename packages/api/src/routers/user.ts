import { router, protectedProcedure } from '../trpc'
import type { Database } from '@ink-starter/db'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- tRPC router type used via typeof
export function createUserRouter(db: Database) {
  void db // reserved for future use
  return router({
    // Just checks the user is authenticated
    refresh: protectedProcedure.query(() => {
      return { ok: true }
    }),
  })
}
