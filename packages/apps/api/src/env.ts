import { z } from 'zod'

/**
 * API environment schema.
 * Bun automatically loads .env from the working directory.
 */
const envSchema = z.object({
  ENVIRONMENT: z.enum(['local', 'production']),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().default(8080),
})

export type ApiEnv = z.infer<typeof envSchema>

/**
 * Validates environment variables.
 * Called once at app startup.
 */
export function validateEnv(): ApiEnv {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('Invalid environment variables:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }

  return result.data
}
