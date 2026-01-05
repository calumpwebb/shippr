import { WelcomeScreen } from './screens/WelcomeScreen'
import { LoginScreen } from './screens/LoginScreen'
import { CreateAccountScreen } from './screens/CreateAccountScreen'
import { ForgotPasswordScreen } from './screens/ForgotPasswordScreen'
import { ResetPasswordScreen } from './screens/ResetPasswordScreen'
import { DashboardScreen } from './screens/DashboardScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import type { RouteConfig } from './types'

export const routes = {
  welcome: { component: WelcomeScreen, protected: false },
  login: { component: LoginScreen, protected: false },
  'create-account': { component: CreateAccountScreen, protected: false },
  'forgot-password': { component: ForgotPasswordScreen, protected: false },
  'reset-password': { component: ResetPasswordScreen, protected: false },
  dashboard: { component: DashboardScreen, protected: true },
  settings: { component: SettingsScreen, protected: true },
} as const satisfies Record<string, RouteConfig>

export type Route = keyof typeof routes
