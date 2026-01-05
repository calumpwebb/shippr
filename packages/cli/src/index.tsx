#!/usr/bin/env bun
import React from 'react';
import { render } from 'ink';
import { Router } from './components/Router';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import type { Route, RouteConfig } from './types';

const routes: Record<Route, RouteConfig> = {
  auth: {
    component: AuthScreen,
    protected: false,
  },
  dashboard: {
    component: Dashboard,
    protected: true,
  },
  settings: {
    component: Dashboard, // Placeholder
    protected: true,
  },
};

function App() {
  return <Router routes={routes} />;
}

// Enter alternate screen buffer
process.stdout.write('\x1b[?1049h');

const { waitUntilExit } = render(<App />);

waitUntilExit().then(() => {
  // Leave alternate screen buffer
  process.stdout.write('\x1b[?1049l');
});
