'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface AuthCredentials {
  hashAccess: string | null;
  hashRefresh: string | null;
  googleAccessToken: string | null;
  googleIdToken: string | null;
  queryAccess: string | null;
  queryRefresh: string | null;
  code: string | null;
  errorParam: string | null;
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  const isProcessingRef = useRef(false);
  const credentialsRef = useRef<AuthCredentials | null>(null);

  // Synchronously extract credentials on initial render before any re-renders or replaceState calls
  if (credentialsRef.current === null && typeof window !== 'undefined') {
    let hashAccess: string | null = null;
    let hashRefresh: string | null = null;
    let googleAccessToken: string | null = null;
    let googleIdToken: string | null = null;

    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      hashAccess = hashParams.get('accessToken');
      hashRefresh = hashParams.get('refreshToken');
      googleAccessToken = hashParams.get('access_token');
      googleIdToken = hashParams.get('id_token');
    }

    credentialsRef.current = {
      hashAccess,
      hashRefresh,
      googleAccessToken,
      googleIdToken,
      queryAccess: searchParams.get('accessToken'),
      queryRefresh: searchParams.get('refreshToken'),
      code: searchParams.get('code'),
      errorParam: searchParams.get('error'),
    };
  }

  useEffect(() => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const credentials = credentialsRef.current;
    if (!credentials) return;

    // Clean URL fragment immediately to remove sensitive tokens from address bar
    if (typeof window !== 'undefined' && window.location.hash) {
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }

    if (credentials.errorParam) {
      setStatus('error');
      setError(decodeURIComponent(credentials.errorParam));
      return;
    }

    const verifyAndLogin = async (accessToken: string, refreshToken: string) => {
      try {
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        login(data.data, accessToken, refreshToken);
        setStatus('success');
        setTimeout(() => router.push('/feed'), 1000);
      } catch (err: any) {
        setStatus('error');
        setError('Failed to verify user session after social login.');
      }
    };

    const processSession = async () => {
      try {
        // 1. Hash parameters from Backend OAuth redirects (#accessToken=...)
        if (credentials.hashAccess && credentials.hashRefresh) {
          await verifyAndLogin(credentials.hashAccess, credentials.hashRefresh);
          return;
        }

        // 2. Query parameters (accessToken & refreshToken)
        if (credentials.queryAccess && credentials.queryRefresh) {
          await verifyAndLogin(credentials.queryAccess, credentials.queryRefresh);
          return;
        }

        // 3. Google OAuth Code Parameter (?code=...)
        if (credentials.code) {
          try {
            const { data } = await api.post('/auth/google', { code: credentials.code });
            login(data.data.user, data.data.accessToken, data.data.refreshToken);
            setStatus('success');
            setTimeout(() => router.push('/feed'), 1000);
            return;
          } catch (codeErr: any) {
            setStatus('error');
            setError(codeErr.response?.data?.message || codeErr.message || 'Google authentication failed');
            return;
          }
        }

        // 4. Hash parameters from Direct Google OAuth (#access_token=... or #id_token=...)
        if (credentials.googleAccessToken || credentials.googleIdToken) {
          try {
            let userInfo: any = null;
            if (credentials.googleAccessToken) {
              try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${credentials.googleAccessToken}` },
                });
                if (userInfoRes.ok) {
                  userInfo = await userInfoRes.json();
                }
              } catch (fetchErr) {
                console.warn('Google UserInfo client fetch skipped, delegating to server:', fetchErr);
              }
            }

            const { data } = await api.post('/auth/google', {
              email: userInfo?.email || undefined,
              displayName: userInfo?.name || (userInfo?.email ? userInfo.email.split('@')[0] : undefined),
              avatar: userInfo?.picture || null,
              googleId: userInfo?.sub || undefined,
              token: credentials.googleAccessToken || undefined,
              access_token: credentials.googleAccessToken || undefined,
              id_token: credentials.googleIdToken || undefined,
            });

            login(data.data.user, data.data.accessToken, data.data.refreshToken);
            setStatus('success');
            setTimeout(() => router.push('/feed'), 1000);
            return;
          } catch (googleErr: any) {
            console.error('Google OAuth backend validation failed:', googleErr);
            setStatus('error');
            setError(googleErr.response?.data?.message || googleErr.message || 'Google authentication failed');
            return;
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
          setStatus('success');
          setTimeout(() => router.push('/feed'), 1000);
          return;
        }

        // 6. Supabase auth state listener fallback
        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event: any, newSession: any) => {
          if (newSession && newSession.access_token) {
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

        // 7. Fallback timer: ONLY runs if NO credentials or tokens were found in the URL at all
        const timer = setTimeout(() => {
          setStatus((prev) => (prev === 'loading' ? 'error' : prev));
          setError((prevErr) => prevErr || 'No authentication credentials found. Please try signing in again.');
        }, 8000);

        return () => {
          authListener.subscription.unsubscribe();
          clearTimeout(timer);
        };
      } catch (err: any) {
        setStatus('error');
        setError(err.response?.data?.message || err.message || 'Authentication exchange failed');
      }
    };

    processSession();
  }, [login, router]);

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
