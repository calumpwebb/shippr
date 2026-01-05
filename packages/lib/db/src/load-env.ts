/**
 * Simple .env loader for DB scripts.
 * Walks up to find monorepo root and loads .env file.
 */
import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'

export function loadEnvFile(): void {
  let dir = __dirname
  while (dir !== '/') {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      const envPath = join(dir, '.env')
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...rest] = trimmed.split('=')
            const value = rest.join('=')
            if (key && value !== undefined && !process.env[key]) {
              process.env[key] = value
            }
          }
        }
      }
      break
    }
    dir = dirname(dir)
  }
}
