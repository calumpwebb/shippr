import type { Route } from './routes'

export type RouteConfig = {
  component: React.ComponentType
  protected: boolean
}

export type RouteParams = {
  welcome: undefined
  login: { successMessage?: string }
  'create-account': undefined
  'forgot-password': undefined
  'reset-password': { email: string }
  dashboard: undefined
  settings: undefined
}

export type RouteStackItem = {
  name: Route
  params?: unknown
}

// Helper: check if params are required, optional, or none
// - undefined → no args needed
// - all optional props → optional arg
// - any required props → required arg
type ParamsArgs<R extends Route> = RouteParams[R] extends undefined
  ? []
  : Record<string, never> extends RouteParams[R]
    ? [params?: RouteParams[R]]
    : [params: RouteParams[R]]

export type RouterContextType = {
  push: <R extends Route>(route: R, ...args: ParamsArgs<R>) => void
  pop: () => void
  replace: <R extends Route>(route: R, ...args: ParamsArgs<R>) => void
  reset: <R extends Route>(route: R, ...args: ParamsArgs<R>) => void
  currentRoute: Route
  params?: unknown
  canGoBack: boolean
}

export type Credentials = {
  token: string
}
