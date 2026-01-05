import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Route, RouteConfig, RouterContextType, RouteStackItem } from '../types';
import { getToken, clearToken, isTokenValid } from '../utils/credentials';
import { Footer } from './Footer';

const RouterContext = createContext<RouterContextType>({
  push: () => {},
  pop: () => {},
  replace: () => {},
  currentRoute: 'auth',
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
    { name: 'auth' },
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
        setRouteStack([{ name: 'auth' }]);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const push = (route: Route, params?: any) => {
    setRouteStack([...routeStack, { name: route, params }]);
  };

  const pop = () => {
    if (routeStack.length > 1) {
      setRouteStack(routeStack.slice(0, -1));
    }
  };

  const replace = (route: Route, params?: any) => {
    setRouteStack([...routeStack.slice(0, -1), { name: route, params }]);
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
          setRouteStack([{ name: 'auth' }]);
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
