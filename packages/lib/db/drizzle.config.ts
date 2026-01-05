import { defineConfig } from 'drizzle-kit'
import { loadEnvFile } from './src/load-env'

// Load .env from monorepo root
loadEnvFile()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for drizzle-kit')
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
