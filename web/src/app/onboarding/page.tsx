'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gamepad2, Shield, Eye, EyeOff, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  // Step 6 New User Game Profile State
  const [game, setGame] = useState('Free Fire');
  const [gameUid, setGameUid] = useState('');
  const [rank, setRank] = useState('Heroic');
  const [level, setLevel] = useState('50');
  const [region, setRegion] = useState('ASIA');
  const [role, setRole] = useState('Rusher');
  const [availability, setAvailability] = useState('Daily 8pm-11pm');
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameUid.trim()) {
      toast.error('Please enter your In-Game UID.');
      return;
    }
    setSubmitting(true);

    try {
      // Uses the SAME backend profile system endpoint as existing-user profile completion
      const res = await api.post('/profiles/setup-game', {
        game,
        gameUid: gameUid.trim(),
        rank,
        level: parseInt(level, 10) || 50,
        region,
        role,
        availability,
        isPrimary: true,
        allowComparison: isPublic,
      });

      const updatedData = res.data?.data;
      toast.success('Gamer Profile Saved Successfully!');

      if (user && updatedData?.profile) {
        setUser({
          ...user,
          gamerzId: updatedData.gamerzId || user.gamerzId,
          profile: {
            ...(user.profile || {}),
            ...updatedData.profile,
          } as any,
        });
      }

      router.push('/feed');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save gamer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#05070E] text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-3xl border border-emerald-500/30 bg-[#070A11]/95 p-6 sm:p-8 shadow-2xl shadow-emerald-950/50 space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2 border-b border-white/10 pb-5">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>STEP 6 — NEW USER GAME PROFILE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Complete Your Gamer Profile
          </h1>
          {user?.gamerzId && (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-500/30">
              <Shield className="w-3.5 h-3.5" />
              <span>GamerZ ID: {user.gamerzId}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Game Selection Buttons */}
          <div className="space-y-2">
            <label className="block text-gray-200 font-bold text-xs">Game</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Free Fire', 'PUBG', 'Valorant', 'CS2', 'Apex Legends', 'League of Legends'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGame(g)}
                  className={`h-10 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 px-3 ${
                    game === g
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Gamepad2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{g}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Game UID */}
          <div className="space-y-1.5">
            <label className="block text-gray-300 font-semibold">Game UID *</label>
            <Input
              type="text"
              required
              placeholder="Enter your Game UID (e.g. 518492041)"
              value={gameUid}
              onChange={(e) => setGameUid(e.target.value)}
              className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none placeholder:text-gray-500 font-mono"
            />
          </div>

          {/* Rank & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-gray-300 font-semibold">Rank</label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
              >
                <option value="Grandmaster" className="bg-slate-900">Grandmaster</option>
                <option value="Heroic" className="bg-slate-900">Heroic / Master</option>
                <option value="Ace" className="bg-slate-900">Ace / Radiant</option>
                <option value="Diamond" className="bg-slate-900">Diamond II - IV</option>
                <option value="Ascendant" className="bg-slate-900">Ascendant I - III</option>
                <option value="Platinum" className="bg-slate-900">Platinum</option>
                <option value="Gold" className="bg-slate-900">Gold</option>
                <option value="Silver" className="bg-slate-900">Silver / Bronze</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-gray-300 font-semibold">Level</label>
              <Input
                type="number"
                placeholder="Level (e.g. 65)"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none font-mono"
              />
            </div>
          </div>

          {/* Region & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-gray-300 font-semibold">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
              >
                <option value="ASIA" className="bg-slate-900">Asia / India</option>
                <option value="NA-East" className="bg-slate-900">NA-East</option>
                <option value="NA-West" className="bg-slate-900">NA-West</option>
                <option value="EU" className="bg-slate-900">Europe</option>
                <option value="SA" className="bg-slate-900">South America</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-gray-300 font-semibold">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
              >
                <option value="Rusher" className="bg-slate-900">Rusher / Entry Fragger</option>
                <option value="IGL" className="bg-slate-900">IGL (In-Game Leader)</option>
                <option value="Sniper" className="bg-slate-900">Sniper / Marksman</option>
                <option value="Support" className="bg-slate-900">Support / Sentinel</option>
                <option value="Flex" className="bg-slate-900">Flex Controller</option>
              </select>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-1.5">
            <label className="block text-gray-300 font-semibold">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full h-11 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
            >
              <option value="Daily 8pm-11pm" className="bg-slate-900">Daily Evenings (8 PM - 11 PM)</option>
              <option value="Weekends Only" className="bg-slate-900">Weekends Only</option>
              <option value="Full Time / Flexible" className="bg-slate-900">Full Time / Flexible Hours</option>
              <option value="Late Night" className="bg-slate-900">Late Night (11 PM - 3 AM)</option>
            </select>
          </div>

          {/* Profile Visibility */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
            <div>
              <p className="font-bold text-white text-xs flex items-center gap-1.5">
                {isPublic ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
                Profile visibility
              </p>
              <p className="text-[11px] text-gray-400">
                {isPublic ? 'Public — Discoverable for squads & matchmaking' : 'Private — Hidden from public player search'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isPublic
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isPublic ? 'Public' : 'Private'}
            </button>
          </div>

          {/* Save Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110 shadow-lg shadow-emerald-500/25 text-sm"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Saving Profile...
              </span>
            ) : (
              'Save'
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
