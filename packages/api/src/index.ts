import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { env } from '@shippr/shared/env'
import { appRouter } from './router'
import { createContext } from './trpc'

const server = createHTTPServer({
  router: appRouter,
  createContext,
})

server.listen(env.PORT)
console.log(`🚀 API server running on http://localhost:${env.PORT}`)
