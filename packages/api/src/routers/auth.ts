import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { users, passwordResetTokens, eq, type Database } from '@shippr/db'
import { generateToken } from '../utils/jwt'
import { TRPCError } from '@trpc/server'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- tRPC router type used via typeof
export function createAuthRouter(db: Database) {
  return router({
    createUser: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8),
        })
      )
      .output(
        z.object({
          token: z.string(),
          user: z.object({ id: z.string(), email: z.string() }),
        })
      )
      .mutation(async ({ input }) => {
        const passwordHash = await Bun.password.hash(input.password)

        try {
          const [user] = await db
            .insert(users)
            .values({
              email: input.email,
              passwordHash,
            })
            .returning()

          const token = await generateToken({ userId: user.id, email: user.email })

          return { token, user: { id: user.id, email: user.email } }
        } catch (error: unknown) {
          const err = error as { code?: string; cause?: { code?: string } }
          const errorCode = err.code || err.cause?.code
          if (errorCode === '23505') {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Email already registered',
            })
          }
          throw error
        }
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .output(
        z.object({
          token: z.string(),
          user: z.object({ id: z.string(), email: z.string() }),
        })
      )
      .mutation(async ({ input }) => {
        const [user] = await db.select().from(users).where(eq(users.email, input.email))

        const dummyHash =
          '$argon2id$v=19$m=65536,t=2,p=1$zJFSt+YqYEd+5lHrQlaptCI+AIblVJ/6XMR/pJ0u+hI$vmkic/xHx5Lq//TVmZCSUizJSG9Nl8jhiYfPrsvjVS4'
        const hashToVerify = user?.passwordHash || dummyHash
        const isValid = await Bun.password.verify(input.password, hashToVerify)

        if (!user || !isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
        }

        const token = await generateToken({ userId: user.id, email: user.email })

        return { token, user: { id: user.id, email: user.email } }
      }),

    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .output(z.object({ success: z.boolean() }))
      .mutation(async ({ input }) => {
        const [user] = await db.select().from(users).where(eq(users.email, input.email))

        if (!user) {
          return { success: true }
        }

        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))

        const code = String(Math.floor(Math.random() * 900000) + 100000)

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          code,
        })

        console.log(`[Password Reset] Code for ${input.email}: ${code}`)

        return { success: true }
      }),

    resetPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          code: z.string().length(6),
          newPassword: z.string().min(8),
        })
      )
      .output(z.object({ success: z.boolean() }))
      .mutation(async ({ input }) => {
        const [user] = await db.select().from(users).where(eq(users.email, input.email))

        if (!user) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired code' })
        }

        const [token] = await db
          .select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, user.id))

        if (!token) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired code' })
        }

        const expiresAt = new Date(token.createdAt.getTime() + 10 * 60 * 1000)
        if (new Date() > expiresAt) {
          await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id))
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Code expired, please request a new one',
          })
        }

        if (token.attempts >= 3) {
          await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id))
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Too many attempts, please request a new code',
          })
        }

        if (token.code !== input.code) {
          await db
            .update(passwordResetTokens)
            .set({ attempts: token.attempts + 1 })
            .where(eq(passwordResetTokens.id, token.id))
          const remaining = 2 - token.attempts
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid code, ${remaining} attempt${remaining === 1 ? '' : 's'} remaining`,
          })
        }

        const passwordHash = await Bun.password.hash(input.newPassword)
        await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))

        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id))

        return { success: true }
      }),
  })
}
