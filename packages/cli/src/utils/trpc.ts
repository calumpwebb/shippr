import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../api/src/router';
import { getToken } from './credentials';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:8080',
      headers() {
        const token = getToken();
        return token ? { authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
