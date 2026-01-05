import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import type { JwtPayload, JwtService } from '@shippr/shared/jwt'
import type { Database } from '@shippr/db'

type ContextRequest = {
  headers?: { get?: (name: string) => string | null; authorization?: string }
}

// Type for the context - used by routers
export type Context = {
  db: Database
  jwt: JwtService
  user: JwtPayload | null
}

export interface ContextDeps {
  db: Database
  jwt: JwtService
}

/**
 * Creates the context factory for tRPC.
 * Dependencies (db, jwt) are injected and available to all procedures via ctx.
 */
export function createContextFactory({ db, jwt }: ContextDeps) {
  return async function createContext({ req }: { req: ContextRequest }): Promise<Context> {
    const authHeader = req.headers?.get?.('authorization') || req.headers?.authorization
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return { db, jwt, user: null }
    }

    try {
      const payload = await jwt.verifyToken(token)
      return { db, jwt, user: payload }
    } catch {
      return { db, jwt, user: null }
    }
  }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now()

  // sleep for 0.5s (between 200 and 500ms randomly) to simultate some delay for development
  let sleepTime = Math.floor(Math.random() * 300) + 200

  // for 5% of requests, add 1s extra
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
