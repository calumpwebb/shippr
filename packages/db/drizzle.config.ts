import { defineConfig } from 'drizzle-kit'
import { env } from '@shippr/shared/env'

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
