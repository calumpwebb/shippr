import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client'
import superjson from 'superjson'
import type { AppRouter } from '@shippr/api/router'
import { getToken, clearToken } from './credentials'
import { logger } from './logger'

// Standardized error codes
export const ApiErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const

export type ApiErrorCodeType = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

export type ApiError = {
  code: ApiErrorCodeType
  message: string
  originalError?: unknown
}

// Helper to check if an error is a network error
function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('failed to fetch') ||
      msg.includes('unable to connect') ||
      error.name === 'TypeError' // fetch throws TypeError on network failure
    )
  }
  return false
}

// Convert any error to standardized ApiError
export function toApiError(error: unknown): ApiError {
  // Handle tRPC errors
  if (error instanceof TRPCClientError) {
    const code = error.data?.code

    if (code === 'UNAUTHORIZED') {
      // Clear token on 401 - router will redirect
      clearToken()
      return {
        code: ApiErrorCode.UNAUTHORIZED,
        message: 'Session expired. Please log in again.',
        originalError: error,
      }
    }

    if (code === 'BAD_REQUEST') {
      // Try to parse validation errors
      try {
        const issues = JSON.parse(error.message)
        if (Array.isArray(issues)) {
          return {
            code: ApiErrorCode.BAD_REQUEST,
            message: issues.map((i: { message?: string }) => i.message).join(', '),
            originalError: error,
          }
        }
      } catch {
        // JSON parse failed, use default message
      }
      return {
        code: ApiErrorCode.BAD_REQUEST,
        message: error.message || 'Invalid request',
        originalError: error,
      }
    }

    if (code === 'CONFLICT') {
      return {
        code: ApiErrorCode.CONFLICT,
        message: error.message || 'Resource already exists',
        originalError: error,
      }
    }

    // Check if tRPC error wraps a network error
    if (isNetworkError(error.cause) || isNetworkError(error)) {
      return {
        code: ApiErrorCode.NETWORK_ERROR,
        message: 'Cannot connect to server. Is the API running?',
        originalError: error,
      }
    }

    // For internal server errors, don't expose details to user
    if (code === 'INTERNAL_SERVER_ERROR') {
      return {
        code: ApiErrorCode.SERVER_ERROR,
        message: 'Something went wrong. Please try again later.',
        originalError: error,
      }
    }

    return {
      code: ApiErrorCode.SERVER_ERROR,
      message: 'Something went wrong. Please try again later.',
      originalError: error,
    }
  }

  // Handle raw network errors
  if (isNetworkError(error)) {
    return {
      code: ApiErrorCode.NETWORK_ERROR,
      message: 'Cannot connect to server. Is the API running?',
      originalError: error,
    }
  }

  // Unknown error - don't expose internal details
  return {
    code: ApiErrorCode.UNKNOWN,
    message: 'An unexpected error occurred. Please try again later.',
    originalError: error,
  }
}

// Retry delays: first retry after 100ms, second after 1s
const RETRY_DELAYS = [100, 1000]
const MAX_ATTEMPTS = 3

// Sleep helper
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Wrapper that adds retry logic and error normalization
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on auth errors or validation errors
      if (error instanceof TRPCClientError) {
        const code = error.data?.code
        if (code === 'UNAUTHORIZED' || code === 'BAD_REQUEST') {
          throw error
        }
      }

      // If we have more retries, wait and try again
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(RETRY_DELAYS[attempt])
      }
    }
  }

  throw lastError
}

// Create the base client
const baseClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: superjson,
      url: 'http://localhost:8080',
      headers() {
        const token = getToken()
        return token ? { authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})

// Check if an object is a procedure (has query or mutate methods)
function isProcedure(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return typeof obj.query === 'function' || typeof obj.mutate === 'function'
}

// Wrapper that adds logging around tRPC calls
async function withLogging<T>(
  type: 'query' | 'mutate',
  path: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    logger.info(
      { type, path, duration, status: 'OK' },
      `[tRPC] (${type}) /${path} - ${duration}ms OK`
    )
    return result
  } catch (error) {
    const duration = Date.now() - start
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error(
      { type, path, duration, status: 'ERROR', error: message },
      `[tRPC] (${type}) /${path} - ${duration}ms ERROR: ${message}`
    )
    throw error
  }
}

// Proxy handler that wraps all calls with retry logic and logging (supports nested routers)
function createRetryProxy<T extends object>(target: T, path: string[] = []): T {
  return new Proxy(target, {
    get(obj, prop): unknown {
      if (typeof prop === 'symbol') return (obj as Record<symbol, unknown>)[prop]

      const value = (obj as Record<string, unknown>)[prop]
      const currentPath = [...path, prop]

      if (typeof value === 'object' && value !== null) {
        if (isProcedure(value)) {
          // It's a procedure - wrap query/mutate with retry and logging
          const procedure = value as {
            query?: (input?: unknown) => Promise<unknown>
            mutate?: (input?: unknown) => Promise<unknown>
          }
          const procedurePath = currentPath.join('.')
          return {
            query: procedure.query
              ? async (input?: unknown): Promise<unknown> =>
                  withLogging('query', procedurePath, () =>
                    withRetry(() => procedure.query!(input))
                  )
              : undefined,
            mutate: procedure.mutate
              ? async (input?: unknown): Promise<unknown> =>
                  withLogging('mutate', procedurePath, () =>
                    withRetry(() => procedure.mutate!(input))
                  )
              : undefined,
          }
        } else {
          // It's a nested router - recursively wrap
          return createRetryProxy(value as object, currentPath)
        }
      }

      return value
    },
  })
}

// Export the wrapped client
export const trpcClient = createRetryProxy(baseClient)

// Re-export the base client if someone needs it without retries
export const trpcClientNoRetry = baseClient
