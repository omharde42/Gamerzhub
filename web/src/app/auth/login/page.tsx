'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, Eye, EyeOff } from 'lucide-react';
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';
import { SocialLogin } from '@/components/auth/social-login';
import api from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectTarget = (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//'))
    ? rawRedirect
    : '/feed';

  const { user, isAuthenticated, login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  if (isAuthenticated && user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      login(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success(`Welcome back, ${data.data.user?.profile?.username || 'Gamer'}!`);
      router.push(redirectTarget);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Invalid credentials';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setSocialLoading(true);
    try {
      if (provider === 'discord') {
        window.location.href = API_URL + '/auth/discord?action=login';
        return;
      }
      if (provider === 'google') {
        window.location.href = API_URL + '/auth/google';
        return;
      }
      if (provider === 'steam') {
        window.location.href = API_URL + '/auth/steam';
        return;
      }

      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || `${provider} login failed. Please try again.`);
      setSocialLoading(false);
    }
  };

  return (
    <AuthFormWrapper
      title="Welcome Back"
      subtitle="Sign in to your GamerHub account"
      footer={
        <span>
          Don't have an account?{' '}
          <Link href={rawRedirect ? `/auth/register?redirect=${encodeURIComponent(rawRedirect)}` : "/auth/register"} className="text-primary hover:underline font-medium">Sign up</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            variant="neon"
            autoFocus
            disabled={loading}
          />
        </motion.div>

        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10"
              variant="neon"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors group-hover:animate-wiggle"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full h-12 gap-2"
            disabled={loading || !email.trim() || !password}
            animate
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
            Sign In
          </Button>
        </motion.div>
      </form>

      <SocialLogin
        onGoogle={() => handleSocialLogin('google')}
        onDiscord={() => handleSocialLogin('discord')}
        onSteam={() => handleSocialLogin('steam')}
        loading={socialLoading}
      />
    </AuthFormWrapper>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
