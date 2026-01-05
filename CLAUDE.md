# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See [todos.md](./todos.md) for project roadmap and outstanding tasks.

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

## Code Navigation (Serena MCP)

**Proactively use Serena MCP tools** for all code exploration and editing tasks. Serena provides semantic code intelligence that is more accurate and token-efficient than text-based search.

**Prefer Serena tools over basic search:**

- `get_symbols_overview` - First step when understanding a new file
- `find_symbol` - Locate classes, functions, methods by name path
- `find_referencing_symbols` - Find all usages of a symbol
- `replace_symbol_body` / `insert_after_symbol` / `insert_before_symbol` - Precise code edits
- `rename_symbol` - Refactor names across the entire codebase

**When to use Serena:**

- Exploring unfamiliar code → `get_symbols_overview` first, then `find_symbol` with `include_body=True`
- Finding where something is used → `find_referencing_symbols`
- Making code changes → symbolic editing tools over text-based find/replace
- Understanding relationships → follow symbol references rather than grepping

**Avoid reading entire files** unless necessary. Use symbolic tools to read only the specific functions/classes you need.
