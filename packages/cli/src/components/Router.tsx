import { createContext, useContext, useState, useEffect } from 'react';
import type { Route } from '../routes';
import type { RouteConfig, RouterContextType, RouteStackItem } from '../types';
import { getToken, clearToken, isTokenValid } from '../utils/credentials';
import { Footer } from './Footer';

const RouterContext = createContext<RouterContextType>({
  push: () => {},
  pop: () => {},
  replace: () => {},
  reset: () => {},
  currentRoute: 'welcome',
  params: undefined,
  canGoBack: false,
});

export const useRouter = () => useContext(RouterContext);

type RouterProps = {
  routes: Record<Route, RouteConfig>;
  children?: React.ReactNode;
};

export function Router({ routes }: RouterProps) {
  const [routeStack, setRouteStack] = useState<RouteStackItem[]>([
    { name: 'welcome' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();

      if (token && await isTokenValid(token)) {
        setRouteStack([{ name: 'dashboard' }]);
      } else {
        if (token) {
          clearToken();
        }
        setRouteStack([{ name: 'welcome' }]);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const push = (route: Route, params?: unknown) => {
    setRouteStack([...routeStack, { name: route, params }]);
  };

  const pop = () => {
    if (routeStack.length > 1) {
      setRouteStack(routeStack.slice(0, -1));
    }
  };

  const replace = (route: Route, params?: unknown) => {
    setRouteStack([...routeStack.slice(0, -1), { name: route, params }]);
  };

  const reset = (route: Route, params?: unknown) => {
    setRouteStack([{ name: route, params }]);
  };

  const current = routeStack[routeStack.length - 1];
  const routeConfig = routes[current.name];

  // Check auth guard
  useEffect(() => {
    const checkGuard = async () => {
      if (routeConfig.protected) {
        const token = getToken();
        if (!token || !(await isTokenValid(token))) {
          clearToken();
          setRouteStack([{ name: 'welcome' }]);
        }
      }
    };

    checkGuard();
  }, [current.name, routeConfig.protected]);

  if (loading) {
    return null;
  }

  const Component = routeConfig.component;

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
      <Component />
      <Footer />
    </RouterContext.Provider>
  );
}
