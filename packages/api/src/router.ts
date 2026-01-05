import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './trpc';
import { db } from './db';
import { users, passwordResetTokens } from './db/schema';
import { eq } from 'drizzle-orm';
import { generateToken } from './utils/jwt';
import { TRPCError } from '@trpc/server';

export const appRouter = router({
  createUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const passwordHash = await Bun.password.hash(input.password);

      try {
        const [user] = await db
          .insert(users)
          .values({
            email: input.email,
            passwordHash,
          })
          .returning();

        const token = await generateToken({ userId: user.id, email: user.email });

        return { token, user: { id: user.id, email: user.email } };
      } catch (error: any) {
        // Check both the error itself and its cause for the constraint violation code
        const errorCode = error.code || error.cause?.code;
        if (errorCode === '23505') { // PostgreSQL unique constraint violation
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Email already registered',
          });
        }
        throw error;
      }
    }),
  loginUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      // Always verify a hash to prevent timing attacks
      // Use dummy hash if user doesn't exist
      const dummyHash = '$argon2id$v=19$m=65536,t=2,p=1$zJFSt+YqYEd+5lHrQlaptCI+AIblVJ/6XMR/pJ0u+hI$vmkic/xHx5Lq//TVmZCSUizJSG9Nl8jhiYfPrsvjVS4';
      const hashToVerify = user?.passwordHash || dummyHash;
      const isValid = await Bun.password.verify(input.password, hashToVerify);

      if (!user || !isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
      }

      const token = await generateToken({ userId: user.id, email: user.email });

      return { token, user: { id: user.id, email: user.email } };
    }),
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      if (!user) {
        // Return success anyway to prevent email enumeration
        return { success: true };
      }

      // Delete any existing token for this user
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

      // Generate 6-digit code
      const code = String(Math.floor(Math.random() * 900000) + 100000);

      // Insert new token
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        code,
      });

      // Log code to console (simulating email)
      console.log(`[Password Reset] Code for ${input.email}: ${code}`);

      return { success: true };
    }),
  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      if (!user) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired code' });
      }

      const [token] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id));

      if (!token) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired code' });
      }

      // Check expiry (10 minutes)
      const expiresAt = new Date(token.createdAt.getTime() + 10 * 60 * 1000);
      if (new Date() > expiresAt) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id));
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code expired, please request a new one' });
      }

      // Check attempts
      if (token.attempts >= 3) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id));
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Too many attempts, please request a new code' });
      }

      // Verify code
      if (token.code !== input.code) {
        await db
          .update(passwordResetTokens)
          .set({ attempts: token.attempts + 1 })
          .where(eq(passwordResetTokens.id, token.id));
        const remaining = 2 - token.attempts;
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid code, ${remaining} attempt${remaining === 1 ? '' : 's'} remaining`,
        });
      }

      // Update password
      const passwordHash = await Bun.password.hash(input.newPassword);
      await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

      // Delete token
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, token.id));

      return { success: true };
    }),
  refresh: protectedProcedure.query(() => {
    return { ok: true };
  }),
});

export type AppRouter = typeof appRouter;
