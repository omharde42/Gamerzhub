'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  // Mirror `status` in a ref so the 3.5s fallback timer can read the latest
  // value. Adding `status` itself to the auth effect's deps would restart
  // OAuth/session processing every time it changes.
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    let isSubscribed = true;

    const errorParam = searchParams.get('error');
    if (errorParam) {
      if (isSubscribed) {
        setStatus('error');
        setError(decodeURIComponent(errorParam));
      }
      return;
    }

    const verifyAndLogin = async (accessToken: string, refreshToken: string) => {
      try {
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        login(data.data, accessToken, refreshToken);
        if (isSubscribed) {
          setStatus('success');
          setTimeout(() => router.push('/feed'), 1000);
        }
      } catch {
        if (isSubscribed) {
          setStatus('error');
          setError('Failed to verify user session after social login.');
        }
      }
    };

    const processSession = async () => {
      try {
        // 1. Hash parameters from Backend OAuth redirects (#accessToken=...)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hashAccess = hashParams.get('accessToken');
          const hashRefresh = hashParams.get('refreshToken');
          if (hashAccess && hashRefresh) {
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
            await verifyAndLogin(hashAccess, hashRefresh);
            return;
          }
        }

        // 2. Legacy query parameters (kept for backward compatibility)
        const queryAccess = searchParams.get('accessToken');
        const queryRefresh = searchParams.get('refreshToken');
        if (queryAccess && queryRefresh) {
          await verifyAndLogin(queryAccess, queryRefresh);
          return;
        }

        // 3. Google OAuth Code Parameter (?code=...)
        const code = searchParams.get('code');
        if (code) {
          try {
            const { data } = await api.post('/auth/google', { code });
            login(data.data.user, data.data.accessToken, data.data.refreshToken);
            if (isSubscribed) {
              setStatus('success');
              setTimeout(() => router.push('/feed'), 1000);
            }
            return;
          } catch (codeErr: any) {
            if (isSubscribed) {
              setStatus('error');
              setError(codeErr.response?.data?.message || codeErr.message || 'Google authentication failed');
            }
            return;
          }
        }

        // 4. Hash parameters from Direct Google OAuth (#access_token=... or #id_token=...)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const googleAccessToken = hashParams.get('access_token');
          const googleIdToken = hashParams.get('id_token');

          if (googleAccessToken || googleIdToken) {
            // Clean sensitive tokens from URL fragment immediately
            window.history.replaceState(null, document.title, window.location.pathname + window.location.search);

            try {
              let userInfo: any = null;
              if (googleAccessToken) {
                try {
                  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${googleAccessToken}` },
                  });
                  if (userInfoRes.ok) {
                    userInfo = await userInfoRes.json();
                  }
                } catch (fetchErr) {
                  console.warn('Browser Google UserInfo fetch skipped, delegating to server:', fetchErr);
                }
              }

              const { data } = await api.post('/auth/google', {
                email: userInfo?.email || undefined,
                displayName: userInfo?.name || (userInfo?.email ? userInfo.email.split('@')[0] : undefined),
                avatar: userInfo?.picture || null,
                googleId: userInfo?.sub || undefined,
                token: googleAccessToken || undefined,
                access_token: googleAccessToken || undefined,
                id_token: googleIdToken || undefined,
              });

              login(data.data.user, data.data.accessToken, data.data.refreshToken);
              if (isSubscribed) {
                setStatus('success');
                setTimeout(() => router.push('/feed'), 1000);
              }
              return;
            } catch (googleErr: any) {
              console.error('Google OAuth backend validation failed:', googleErr);
              if (isSubscribed) {
                setStatus('error');
                setError(googleErr.response?.data?.message || googleErr.message || 'Google authentication failed');
              }
              return;
            }
          }
        }

        // 5. Supabase Auth session (Google / Discord via Supabase)
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.access_token) {
          const provider = session.user?.app_metadata?.provider || 'google';
          const { data } = await api.post('/auth/social-login', {
            token: session.access_token,
            provider,
          });

          login(data.data.user, data.data.accessToken, data.data.refreshToken);
          if (isSubscribed) {
            setStatus('success');
            setTimeout(() => router.push('/feed'), 1000);
          }
          return;
        }

        // 6. Supabase auth state listener fallback
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: any, newSession: any) => {
          if (newSession && newSession.access_token && isSubscribed) {
            try {
              const provider = newSession.user?.app_metadata?.provider || 'google';
              const { data } = await api.post('/auth/social-login', {
                token: newSession.access_token,
                provider,
              });

              login(data.data.user, data.data.accessToken, data.data.refreshToken);
              setStatus('success');
              setTimeout(() => router.push('/feed'), 1000);
            } catch (err: any) {
              setStatus('error');
              setError(err.response?.data?.message || 'Failed to process social login');
            }
          }
        });

        // 7. Fallback timer if no credentials or provider found
        const timer = setTimeout(() => {
          if (isSubscribed && statusRef.current === 'loading') {
            setStatus('error');
            setError('Authentication cancelled or session expired. Please try signing in again.');
          }
        }, 4000);

        return () => {
          authListener.subscription.unsubscribe();
          clearTimeout(timer);
        };
      } catch (err: any) {
        if (isSubscribed) {
          setStatus('error');
          setError(err.response?.data?.message || err.message || 'Authentication exchange failed');
        }
      }
    };

    processSession();

    return () => {
      isSubscribed = false;
    };
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-background/95">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Completing authentication...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle className="h-16 w-16 text-success" />
            </motion.div>
            <p className="text-lg font-semibold">Authenticated!</p>
            <p className="text-sm text-muted-foreground">Redirecting to your feed...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-destructive" />
            <p className="text-lg font-semibold">Authentication Failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
