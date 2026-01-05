# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev           # Run CLI and API in parallel (watch mode)
pnpm cli           # Run CLI only
pnpm api           # Run API only

# Database
pnpm db:generate   # Generate migrations from schema changes
pnpm db:migrate    # Run migrations against database
pnpm db:studio     # Open Drizzle Studio GUI

# Code Quality
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix ESLint issues
pnpm typecheck     # Type check all packages

# Testing (in packages/api)
cd packages/api && bun test              # Run all tests
cd packages/api && bun test auth.test    # Run specific test file
```

## Architecture

**Monorepo** using pnpm workspaces with three packages:

### packages/db (`@shippr/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports:

- `./schema` - Drizzle table definitions (`users`, `passwordResetTokens`)
- `./client` - `createDb(connectionString)` factory returning typed Drizzle instance
- `./test-utils` - `setupTestDb()` spins up Docker PostgreSQL container with migrations

### packages/api

tRPC server with JWT auth. Key files:

- `src/trpc.ts` - tRPC initialization with `publicProcedure` and `protectedProcedure`
- `src/routers/index.ts` - `createAppRouter(db)` factory for injecting database (enables testing)
- `src/utils/jwt.ts` - JWT token creation/verification

**Pattern**: Router factories accept database instance for testability. Tests use `setupTestDb()` to get isolated PostgreSQL container.

### packages/cli

Ink (React for CLIs) application with custom routing. Key patterns:

- `src/routes.ts` - Route definitions with `protected` flag for auth guards
- `src/components/Router.tsx` - Stack-based navigation (`push`, `pop`, `replace`, `reset`)
- `src/utils/credentials.ts` - Token persistence
- Uses alternate screen buffer for clean terminal UI

## Code Style

- ESLint enforces `@typescript-eslint/explicit-function-return-type` on all functions
- Exception: tRPC router factory functions use `eslint-disable` comment because their return types are inferred via `typeof`
