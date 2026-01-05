import { createHTTPServer } from '@trpc/server/adapters/standalone'
import { appRouter } from './router'
import { createContext } from './trpc'

const server = createHTTPServer({
  router: appRouter,
  createContext,
})

const PORT = process.env.PORT || 8080

server.listen(PORT)
console.log(`🚀 API server running on http://localhost:${PORT}`)
