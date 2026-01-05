import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { createDbService } from '@shippr/db'
import { createJwtService } from '@shippr/shared/jwt'
import { appRouter } from './router'
import { createContextFactory } from './trpc'
import { validateEnv } from './env'

// Validate environment - this is the ONLY place this happens
const env = validateEnv()

// Create dependencies
const db = createDbService(env.DATABASE_URL)
const jwt = createJwtService(env.JWT_SECRET)

// Create context factory with dependencies
const createContext = createContextFactory({ db, jwt })

// Start server
const server = createHTTPServer({
  router: appRouter,
  createContext,
})

server.listen(env.PORT)
console.log(`🚀 API server running on http://localhost:${env.PORT}, env=${env.ENVIRONMENT}`)
