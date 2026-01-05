import { initTRPC, TRPCError } from '@trpc/server';
import { verifyToken } from './utils/jwt';

export const createContext = async ({ req }: { req: any }) => {
  // Handle both standard Request objects and Node.js IncomingMessage
  const authHeader = req.headers?.get?.('authorization') || req.headers?.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { user: null };
  }

  try {
    const payload = await verifyToken(token);
    return { user: payload };
  } catch {
    return { user: null };
  }
};

const t = initTRPC.context<typeof createContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { user: ctx.user } });
});
