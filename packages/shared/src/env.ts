import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { findUpSync } from 'find-up'
import { z } from 'zod'

// Find monorepo root by looking for pnpm-workspace.yaml
const workspaceFile = findUpSync('pnpm-workspace.yaml', {
  cwd: dirname(fileURLToPath(import.meta.url)),
})

if (workspaceFile) {
  const rootDir = dirname(workspaceFile)
  const envPath = join(rootDir, '.env')

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        if (key && value !== undefined && !process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
}

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // API Server
  PORT: z.coerce.number().default(8080),
  JWT_SECRET: z.string().min(1),
  ENVIRONMENT: z.enum(['local', 'production']),

  // CLI
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
})

export type Env = z.infer<typeof envSchema>

function createEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }

  return result.data
}

export const env = createEnv()
