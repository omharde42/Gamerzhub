'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Sparkles, Gamepad2, Shield, CheckCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExistingUserProfileUpgradeModal() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gamerzId, setGamerzId] = useState<string>('');
  
  // Form State
  const [game, setGame] = useState('Free Fire');
  const [gameUid, setGameUid] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [rank, setRank] = useState('Heroic');
  const [region, setRegion] = useState('ASIA');
  const [role, setRole] = useState('Rusher');
  const [availability, setAvailability] = useState('Daily 8pm-11pm');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Fetch user's profile and GamerZ ID status
    api.get('/profiles/me')
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          if (data.user?.gamerzId) {
            setGamerzId(data.user.gamerzId);
          }
          // If profile is incomplete, prompt user politely
          if (data.isProfileComplete === false) {
            setIsOpen(true);
          }
        }
      })
      .catch((err) => console.warn('[ProfileCheck] Error checking user profile completeness:', err?.message));
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameUid.trim()) {
      setError('Please enter your In-Game UID.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/profiles/setup-game', {
        game,
        gameUid: gameUid.trim(),
        inGameName: inGameName.trim() || undefined,
        rank,
        region,
        role,
        availability,
        isPrimary: true,
      });

      const updatedData = res.data?.data;
      setSuccess(true);

      // Update auth store with updated profile
      if (user && updatedData?.profile) {
        setUser({
          ...user,
          gamerzId: updatedData.gamerzId || gamerzId || user.gamerzId,
          profile: {
            ...(user.profile || {}),
            ...updatedData.profile,
          } as any,
        });
      }

      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update game profile.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-[#0A0E17]/95 p-6 shadow-2xl shadow-emerald-950/50 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">GamerZ Hub Update</h3>
              <p className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Identity: {gamerzId || user?.gamerzId || 'GZH-ACTIVE'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="space-y-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs text-gray-300">
          <p className="font-bold text-white text-sm">GamerZ Hub has updated its player profile system.</p>
          <p>You can now complete your gaming profile to get better player recommendations, skill-based friend suggestions, and tournament matchmaking.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
              <p className="font-extrabold text-base text-white">Profile Updated Successfully!</p>
              <p className="text-xs text-gray-300">Your GamerZ ID & game profile are active.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Select Game</label>
                  <select
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="Free Fire" className="bg-slate-900">Free Fire</option>
                    <option value="PUBG" className="bg-slate-900">PUBG Mobile / BGMI</option>
                    <option value="Valorant" className="bg-slate-900">Valorant</option>
                    <option value="CS2" className="bg-slate-900">Counter-Strike 2</option>
                    <option value="Apex Legends" className="bg-slate-900">Apex Legends</option>
                    <option value="League of Legends" className="bg-slate-900">League of Legends</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">In-Game UID / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 518492041"
                    value={gameUid}
                    onChange={(e) => setGameUid(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Rank / Tier</label>
                  <input
                    type="text"
                    placeholder="e.g. Heroic / Diamond II"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="ASIA" className="bg-slate-900">Asia / India</option>
                    <option value="NA-East" className="bg-slate-900">NA-East</option>
                    <option value="NA-West" className="bg-slate-900">NA-West</option>
                    <option value="EU" className="bg-slate-900">Europe</option>
                    <option value="SA" className="bg-slate-900">South America</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Primary Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="Rusher" className="bg-slate-900">Rusher / Entry</option>
                    <option value="IGL" className="bg-slate-900">IGL (Shotcaller)</option>
                    <option value="Sniper" className="bg-slate-900">Sniper</option>
                    <option value="Support" className="bg-slate-900">Support / Sentinel</option>
                    <option value="Flex" className="bg-slate-900">Flex Controller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Active Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily 8pm-11pm"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border-white/15 text-gray-300 hover:text-white"
                >
                  Remind Me Later
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110 shadow-lg shadow-emerald-500/25 px-6"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    'Complete My Profile'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
