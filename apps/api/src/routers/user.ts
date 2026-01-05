import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'

export const userRouter = router({
  // Just checks the user is authenticated
  refresh: protectedProcedure.output(z.object({ ok: z.boolean() })).query(() => {
    return { ok: true }
  }),
})
