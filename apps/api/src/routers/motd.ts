import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { motd, eq, sql } from '@shippr/db'

export const motdRouter = router({
  getRandom: publicProcedure
    .output(
      z.object({
        message: z.string().nullable(),
      })
    )
    .query(async ({ ctx }) => {
      const [result] = await ctx.db
        .select({ message: motd.message })
        .from(motd)
        .where(eq(motd.active, true))
        .orderBy(sql`random()`)
        .limit(1)

      return { message: result?.message ?? null }
    }),
})
