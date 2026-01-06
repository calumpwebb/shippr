import { useState, useEffect } from 'react'
import { Box } from 'ink'
import type { Route } from '../routes'
import type { RouteConfig, RouteStackItem } from '../types'
import { getToken, clearToken, isTokenValid } from '../utils/credentials'
import { Footer } from './Footer'
import { Header } from './Header'
import { RouterContext } from './RouterContext'

// Re-export useRouter for convenience
export { useRouter } from './RouterContext'

type RouterProps = {
  routes: Record<Route, RouteConfig>
  children?: React.ReactNode
}

export function Router({ routes }: RouterProps): React.ReactNode {
  const [routeStack, setRouteStack] = useState<RouteStackItem[]>([{ name: 'welcome' }])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth(): Promise<void> {
      const token = getToken()

      if (token && (await isTokenValid(token))) {
        setRouteStack([{ name: 'dashboard' }])
      } else {
        if (token) {
          clearToken()
        }
        setRouteStack([{ name: 'welcome' }])
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  function push(route: Route, params?: unknown): void {
    setRouteStack([...routeStack, { name: route, params }])
  }

  function pop(): void {
    if (routeStack.length > 1) {
      setRouteStack(routeStack.slice(0, -1))
    }
  }

  function replace(route: Route, params?: unknown): void {
    setRouteStack([...routeStack.slice(0, -1), { name: route, params }])
  }

  function reset(route: Route, params?: unknown): void {
    setRouteStack([{ name: route, params }])
  }

  const current = routeStack[routeStack.length - 1]
  const routeConfig = routes[current.name]

  // Check auth guard
  useEffect(() => {
    async function checkGuard(): Promise<void> {
      if (routeConfig.protected) {
        const token = getToken()
        if (!token || !(await isTokenValid(token))) {
          clearToken()
          setRouteStack([{ name: 'welcome' }])
        }
      }
    }

    checkGuard()
  }, [current.name, routeConfig.protected])

  if (loading) {
    return null
  }

  const Component = routeConfig.component

  return (
    <RouterContext.Provider
      value={{
        push,
        pop,
        replace,
        reset,
        currentRoute: current.name,
        params: current.params,
        canGoBack: routeStack.length > 1,
      }}
    >
      <Box marginLeft={2} marginTop={1}>
        <Box flexDirection="column" gap={1}>
          <Header />
          <Box flexDirection="column">
            <Component />
          </Box>
          <Footer />
        </Box>
      </Box>
    </RouterContext.Provider>
  )
}
