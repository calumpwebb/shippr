# Ink Starter

Monorepo starter template with:

- **CLI**: Ink (React for CLIs) + TypeScript + Bun
- **API**: tRPC + Drizzle ORM + PostgreSQL

## Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Setup environment variables:**

   ```bash
   # Copy the example env file
   cp packages/api/.env.example packages/api/.env

   # Edit packages/api/.env with your database credentials
   ```

3. **Run PostgreSQL:**

   ```bash
   # Start PostgreSQL using Docker Compose
   docker-compose up -d

   # Check if it's running
   docker-compose ps
   ```

   The Docker Compose setup includes:
   - PostgreSQL 16 on port 5432
   - Credentials matching `.env.example` (user/password/ink-starter)
   - Persistent volume for data storage
   - Health checks

   **Useful commands:**

   ```bash
   docker-compose down           # Stop the database
   docker-compose down -v        # Stop and remove all data
   docker-compose logs -f postgres  # View logs
   ```

4. **Setup database:**

   ```bash
   # Generate migration from schema
   pnpm db:generate

   # Run migrations
   pnpm db:migrate
   ```

## Development

```bash
# Run both CLI and API in development mode
pnpm dev

# Or run individually:
pnpm cli    # Run CLI
pnpm api    # Run API server
```

## Database Commands

```bash
pnpm db:generate  # Generate migrations from schema
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio (database GUI)
```

## Build & Deploy

```bash
# Build CLI as standalone binary
cd packages/cli
bun run compile  # Creates ./cli executable

# Build API
cd packages/api
bun run build    # Creates dist/index.js
```

## API Endpoints

The tRPC API runs on `http://localhost:8080` by default.

### `createUser`

Creates a new user with email and password.

**Input:**

```typescript
{
  email: string,    // Valid email
  password: string  // Min 8 characters
}
```

**Returns:**

```typescript
{
  id: string,
  email: string,
  createdAt: Date
}
```

## Project Structure

```
ink-starter/
├── packages/
│   ├── cli/              # Ink CLI application
│   │   ├── src/
│   │   │   └── index.tsx
│   │   └── package.json
│   └── api/              # tRPC API server
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts
│       │   │   ├── index.ts
│       │   │   └── migrate.ts
│       │   ├── router.ts
│       │   ├── trpc.ts
│       │   └── index.ts
│       └── package.json
└── package.json
```

## TypeScript

All packages use strict mode with these settings:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
