import { createContext, useContext } from 'react'
import type { RouterContextType } from '../types'

export const RouterContext = createContext<RouterContextType>({
  push: () => {},
  pop: () => {},
  replace: () => {},
  reset: () => {},
  currentRoute: 'welcome',
  params: undefined,
  canGoBack: false,
})

export function useRouter(): RouterContextType {
  return useContext(RouterContext)
}
