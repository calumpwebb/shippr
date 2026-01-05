import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { verifyToken } from './utils/jwt'

type ContextRequest = {
  headers?: { get?: (name: string) => string | null; authorization?: string }
}

export async function createContext({
  req,
}: {
  req: ContextRequest
}): Promise<{ user: Awaited<ReturnType<typeof verifyToken>> | null }> {
  // Handle both standard Request objects and Node.js IncomingMessage
  const authHeader = req.headers?.get?.('authorization') || req.headers?.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return { user: null }
  }

  try {
    const payload = await verifyToken(token)
    return { user: payload }
  } catch {
    return { user: null }
  }
}

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
})

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()

  // sleep for 0.5s (between 200 and 500ms randomly) to simultate some delay for development
  let sleepTime = Math.floor(Math.random() * 300) + 200

  // for 5% of requests, add 1s exyra
  if (Math.random() < 0.05) {
    sleepTime += 1000
  }

  await new Promise((resolve) => setTimeout(resolve, sleepTime))

  try {
    const result = await next()
    const duration = Date.now() - start
    if (!result.ok) {
      console.error(
        `[tRPC] (${type}) /${path} - ::${duration - sleepTime}ms actual, ${sleepTime}ms sleep, ${duration}ms total:: ERROR:`,
        result.error
      )
    } else {
      console.log(
        `[tRPC] (${type}) /${path} - ::${duration - sleepTime}ms actual, ${sleepTime}ms sleep, ${duration}ms total:: OK`
      )
    }
    return result
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      `[tRPC] (${type}) /${path} - ::${duration - sleepTime}ms actual, ${sleepTime}ms sleep, ${duration}ms total:: UNCAUGHT:`,
      err
    )
    throw err
  }
})

export const router = t.router

const baseProcedure = t.procedure.use(loggerMiddleware)

export const publicProcedure = baseProcedure

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { user: ctx.user } })
})
