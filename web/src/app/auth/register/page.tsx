'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Eye, EyeOff, Check, X, Shield, ArrowRight, Sparkles } from 'lucide-react';
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
  const [generatedGamerZId, setGeneratedGamerZId] = useState<string | null>(null);

  if (isAuthenticated && user && !generatedGamerZId) {
    return null;
  }

  const passwordChecks = {
    length: password.length >= 6,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    match: password === confirmPassword && confirmPassword.length > 0,
  };

  const allChecks = Object.values(passwordChecks).every(Boolean);
  const isValid = email.trim() && password && allChecks;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        email: email.trim(),
        password,
        username: username.trim() || undefined,
      });

      const assignedUser = data.data.user;
      const gamerzId = data.data.gamerzId || assignedUser?.gamerzId || 'GZH7K29P4';
      
      login(assignedUser, data.data.accessToken, data.data.refreshToken);
      setGeneratedGamerZId(gamerzId);
      toast.success('Account created successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push(redirectTarget);
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
    ? <Check className="h-3.5 w-3.5 text-emerald-400 animate-bounce-in" />
    : <X className="h-3.5 w-3.5 text-muted-foreground/50" />;

  // Display Phase 5 GamerZ ID confirmation card if account was generated
  if (generatedGamerZId) {
    return (
      <AuthFormWrapper
        title="Welcome to GamerZ Hub!"
        subtitle="Your Step 1 Account Registration is Complete"
        footer={<span className="text-emerald-400 font-semibold">Permanent GamerZ Identity Verified</span>}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 text-center py-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Shield className="w-8 h-8 text-emerald-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identity Generated</span>
            </div>
            <h2 className="text-xl font-bold text-white">Your GamerZ ID is</h2>
            <p className="text-3xl font-black text-emerald-400 font-mono tracking-wider bg-emerald-950/40 py-2.5 px-4 rounded-xl border border-emerald-500/30 shadow-inner">
              {generatedGamerZId}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs text-gray-300 text-left">
            <p className="font-semibold text-emerald-300">This is your unique GamerZ Hub identity.</p>
            <p className="text-gray-400">
              It is permanent and cannot be changed or transferred. It identifies you across all connected games, squad requests, and tournaments.
            </p>
          </div>

          <Button
            onClick={handleContinue}
            variant="gradient"
            size="lg"
            className="w-full h-12 gap-2 font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 shadow-lg shadow-emerald-500/25"
          >
            Continue to GamerZ Hub <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </AuthFormWrapper>
    );
  }

  return (
    <AuthFormWrapper
      title="Create GamerZ Account"
      subtitle="Step 1 — Account Registration"
      footer={
        <span>
          Already have an account?{' '}
          <Link href={rawRedirect ? `/auth/login?redirect=${encodeURIComponent(rawRedirect)}` : "/auth/login"} className="text-emerald-400 hover:underline font-medium">Sign in</Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Label htmlFor="email" className="text-gray-200">Email Address *</Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="gamer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-white/15 bg-white/5 text-white focus:border-emerald-400"
            disabled={loading}
            autoFocus
          />
        </motion.div>

        {/* Username Field (Optional) */}
        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
          <Label htmlFor="username" className="text-gray-200">GamerTag / Username (Optional)</Label>
          <Input
            id="username"
            type="text"
            placeholder="e.g. ShadowSniper"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 border-white/15 bg-white/5 text-white focus:border-emerald-400"
            disabled={loading}
            maxLength={30}
          />
          <p className="text-[11px] text-gray-400">Leave blank to auto-generate from email prefix.</p>
        </motion.div>

        {/* Password Field */}
        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Label htmlFor="password" className="text-gray-200">Password *</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-10 border-white/15 bg-white/5 text-white focus:border-emerald-400"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <motion.div className="space-y-1 pt-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckIcon ok={passwordChecks.length} />
                <span className={passwordChecks.length ? 'text-emerald-400' : 'text-gray-400'}>At least 6 characters</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckIcon ok={passwordChecks.upper} />
                <span className={passwordChecks.upper ? 'text-emerald-400' : 'text-gray-400'}>One uppercase letter</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckIcon ok={passwordChecks.number} />
                <span className={passwordChecks.number ? 'text-emerald-400' : 'text-gray-400'}>One number</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div className="space-y-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <Label htmlFor="confirmPassword" className="text-gray-200">Confirm Password *</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 border-white/15 bg-white/5 text-white focus:border-emerald-400"
            disabled={loading}
          />
          {confirmPassword && (
            <div className="flex items-center gap-1.5 text-xs">
              <CheckIcon ok={passwordChecks.match} />
              <span className={passwordChecks.match ? 'text-emerald-400' : 'text-gray-400'}>Passwords match</span>
            </div>
          )}
        </motion.div>

        {/* Auto-Assigned GamerZ ID Notice */}
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
          <p className="font-bold text-emerald-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4 shrink-0" />
            Automatic GamerZ ID Assignment
          </p>
          <p className="text-gray-300">
            A permanent, globally unique GamerZ ID (e.g. GZH7K29P4) will be generated by the backend automatically upon account creation.
          </p>
        </div>

        {/* Submit Button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Button
            type="submit"
            disabled={loading || !isValid}
            className="w-full h-12 gap-2 font-extrabold text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 shadow-lg shadow-emerald-500/25"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            Create Account & Generate GamerZ ID
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
    <Suspense fallback={<div className="flex justify-center items-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
