import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { motd, eq, sql, type Database } from '@shippr/db'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- tRPC router type used via typeof
export function createMotdRouter(db: Database) {
  return router({
    getRandom: publicProcedure
      .output(
        z.object({
          message: z.string().nullable(),
        })
      )
      .query(async () => {
        const [result] = await db
          .select({ message: motd.message })
          .from(motd)
          .where(eq(motd.active, true))
          .orderBy(sql`random()`)
          .limit(1)

        return { message: result?.message ?? null }
      }),
  })
}
