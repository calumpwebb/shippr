export type Route = 'auth' | 'dashboard' | 'settings';

export type RouteConfig = {
  component: React.ComponentType<any>;
  protected: boolean;
};

export type RouteStackItem = {
  name: Route;
  params?: any;
};

export type RouterContextType = {
  push: (route: Route, params?: any) => void;
  pop: () => void;
  replace: (route: Route, params?: any) => void;
  currentRoute: Route;
  params?: any;
};

export type Credentials = {
  token: string;
};
