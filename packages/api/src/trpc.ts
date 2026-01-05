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

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  console.log(`[tRPC] (${type}) /${path} - ${duration}ms, ${JSON.stringify(result)}`);
  return result;
});

export const router = t.router;

const baseProcedure = t.procedure.use(loggerMiddleware);

export const publicProcedure = baseProcedure;

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { user: ctx.user } });
});
