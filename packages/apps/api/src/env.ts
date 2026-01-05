import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { z } from 'zod'

/**
 * API environment schema.
 */
const apiSchema = z.object({
  ENVIRONMENT: z.enum(['local', 'production']),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().default(8080),
})

export type ApiEnv = z.infer<typeof apiSchema>

/**
 * Loads .env file from monorepo root.
 * Only sets variables that aren't already in process.env.
 */
function loadEnvFile(): void {
  // Walk up to find monorepo root (where pnpm-workspace.yaml is)
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

/**
 * Validates environment variables.
 * Called once at app startup.
 */
export function validateEnv(): ApiEnv {
  loadEnvFile()

  const result = apiSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌ Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }

  return result.data
}
