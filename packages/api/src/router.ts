import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { db } from './db';
import { users } from './db/schema';
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
});

export type AppRouter = typeof appRouter;
