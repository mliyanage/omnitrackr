import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient instance
 * Exported separately to avoid circular dependencies
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
