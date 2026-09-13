'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { ReactNode, useState, useEffect } from 'react';
import { API_URL } from '@/lib/constants';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1, refetchOnWindowFocus: false } } }));

  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      const errorMsg = event.message || event.error?.message || '';
      if (errorMsg.includes('Loading chunk') || errorMsg.includes('ChunkLoadError')) {
        console.warn('Chunk load failure detected, reloading to fetch latest deployment bundle...', errorMsg);
        const storageKey = 'chunk_reload_timestamp';
        const lastReload = sessionStorage.getItem(storageKey);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem(storageKey, now.toString());
          window.location.reload();
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason || '';
      if (typeof reason === 'string' && (reason.includes('Loading chunk') || reason.includes('ChunkLoadError'))) {
        console.warn('Unhandled chunk rejection, reloading...', reason);
        const storageKey = 'chunk_reload_timestamp';
        const lastReload = sessionStorage.getItem(storageKey);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem(storageKey, now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Warm up backend API container asynchronously after initial page load & paint
    const warmupTimer = setTimeout(() => {
      const baseUrl = API_URL.replace(/\/api\/?$/, '');
      fetch(`${baseUrl}/health`).catch(() => {});
    }, 4000);

    return () => {
      clearTimeout(warmupTimer);
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" themes={['light', 'dark']} enableSystem={false}>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.75rem',
              backdropFilter: 'blur(16px)',
            },
            success: { iconTheme: { primary: 'hsl(var(--success))', secondary: 'hsl(var(--card))' } },
            error: { iconTheme: { primary: 'hsl(var(--destructive))', secondary: 'hsl(var(--card))' } },
            duration: 4000,
          }}
        />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
