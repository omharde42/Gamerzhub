'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Eye, EyeOff, Check, X } from 'lucide-react';
import { AuthFormWrapper } from '@/components/auth/auth-form-wrapper';
import { SocialLogin } from '@/components/auth/social-login';
import api from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectTarget = (rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//'))
    ? rawRedirect
    : '/feed';

  const { user, isAuthenticated, login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);

  if (isAuthenticated && user) {
    return null;
  }

  const passwordChecks = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password === confirmPassword && confirmPassword.length > 0,
  };

  const allChecks = Object.values(passwordChecks).every(Boolean);
  const isValid = username.trim().length >= 3 && email.trim() && password && allChecks;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        email: email.trim(),
        password,
        username: username.trim(),
      });
      login(data.data.user, data.data.accessToken, data.data.refreshToken);
      toast.success('Account created! Welcome to GamerHub.');
      router.push(redirectTarget);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Registration failed';
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

  const CheckIcon = ({ ok }: { ok: boolean }) => ok
    ? <Check className="h-3.5 w-3.5 text-success animate-bounce-in" />
    : <X className="h-3.5 w-3.5 text-muted-foreground/50" />;

  return (
    <AuthFormWrapper
      title="Create Account"
      subtitle="Join the ultimate gaming network"
      footer={
        <span>
          Already have an account?{' '}
          <Link href={rawRedirect ? `/auth/login?redirect=${encodeURIComponent(rawRedirect)}` : "/auth/login"} className="text-primary hover:underline font-medium">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="GamerTag"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11"
            variant="neon"
            autoFocus
            disabled={loading}
            maxLength={30}
          />
          <p className="text-[10px] text-muted-foreground">3-30 characters, letters, numbers, underscores</p>
        </motion.div>

        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
            variant="neon"
            disabled={loading}
          />
        </motion.div>

        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
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
          {password && (
            <motion.div className="space-y-1.5 pt-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckIcon ok={passwordChecks.length} />
                <span className={passwordChecks.length ? 'text-success' : 'text-muted-foreground'}>At least 6 characters</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckIcon ok={passwordChecks.upper} />
                <span className={passwordChecks.upper ? 'text-success' : 'text-muted-foreground'}>One uppercase letter</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckIcon ok={passwordChecks.number} />
                <span className={passwordChecks.number ? 'text-success' : 'text-muted-foreground'}>One number</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11"
            variant="neon"
            disabled={loading}
          />
          {confirmPassword && (
            <div className="flex items-center gap-1.5 text-xs">
              <CheckIcon ok={passwordChecks.match} />
              <span className={passwordChecks.match ? 'text-success' : 'text-muted-foreground'}>Passwords match</span>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full h-12 gap-2"
            disabled={loading || !isValid}
            animate
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Create Account
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
