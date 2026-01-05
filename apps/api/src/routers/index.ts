import { router } from '../trpc'
import { authRouter } from './auth'
import { userRouter } from './user'
import { motdRouter } from './motd'

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  motd: motdRouter,
})

export type AppRouter = typeof appRouter
