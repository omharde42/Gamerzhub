'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, setUser, logout } = useAuthStore();
  const hasValidated = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasValidated.current) {
      hasValidated.current = true;
      // Silently validate token and refresh user profile data in the background
      api.get('/auth/me')
        .then(({ data }: { data: any }) => {
          if (data?.data) {
            setUser(data.data);
          }
        })
        .catch((err: any) => {
          // If the server explicitly rejected the token (401/403), sign out
          if (err.response?.status === 401 || err.response?.status === 403) {
            logout();
          }
        });
    }
  }, [isAuthenticated, setUser, logout]);

  /**
   * Helper function for protected actions embedded inside public or mixed pages.
   * If the user is authenticated, executes `actionFn()`.
   * Otherwise, redirects to `/auth/login?redirect=<targetPath>` without executing `actionFn`.
   */
  const requireAuth = useCallback(
    (actionFn: () => void | Promise<void>, overrideRedirectPath?: string) => {
      if (isAuthenticated) {
        return actionFn();
      }

      let redirectPath = overrideRedirectPath;
      if (!redirectPath && typeof window !== 'undefined') {
        redirectPath = `${window.location.pathname}${window.location.search}`;
      }

      const safePath = redirectPath || pathname || '/';
      router.push(`/auth/login?redirect=${encodeURIComponent(safePath)}`);
    },
    [isAuthenticated, pathname, router]
  );

  return { user, isAuthenticated, setUser, logout, requireAuth };
}
