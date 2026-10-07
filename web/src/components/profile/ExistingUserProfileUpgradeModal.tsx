'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Gamepad2, Shield, CheckCircle, Loader2, X, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExistingUserProfileUpgradeModal() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gamerzId, setGamerzId] = useState<string>('');
  const [existingUsername, setExistingUsername] = useState<string>('');
  
  // Form State with Auto-Detection & Pre-filling
  const [game, setGame] = useState('Free Fire');
  const [gameUid, setGameUid] = useState('');
  const [inGameName, setInGameName] = useState('');
  const [rank, setRank] = useState('Heroic');
  const [level, setLevel] = useState('50');
  const [region, setRegion] = useState('ASIA');
  const [role, setRole] = useState('Rusher');
  const [availability, setAvailability] = useState('Daily 8pm-11pm');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    setLoading(true);
    // Fetch user's existing profile data to pre-fill available fields
    api.get('/profiles/me')
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          const userObj = data.user;
          const profileObj = data.profile;
          const primaryGameProfile = data.gameProfiles?.[0];
          const primaryGameAccount = data.gameAccounts?.[0];

          if (userObj?.gamerzId) {
            setGamerzId(userObj.gamerzId);
          }
          if (profileObj?.username) {
            setExistingUsername(profileObj.username);
          }

          // Pre-fill fields from old profile or existing GameProfile
          setGame(primaryGameProfile?.game || profileObj?.mainGames?.[0] || 'Free Fire');
          setGameUid(primaryGameProfile?.gameUid || primaryGameAccount?.inGameUid || '');
          setInGameName(primaryGameProfile?.inGameName || profileObj?.displayName || profileObj?.username || '');
          setRank(primaryGameProfile?.rank || profileObj?.rank || 'Heroic');
          setLevel(primaryGameProfile?.level ? String(primaryGameProfile.level) : '50');
          setRegion(primaryGameProfile?.region || profileObj?.country || 'ASIA');
          setRole(primaryGameProfile?.role || profileObj?.role || 'Rusher');
          setAvailability(primaryGameProfile?.availability || profileObj?.availability || 'Daily 8pm-11pm');
          setIsPublic(profileObj?.allowComparison !== false);

          // Prompt user if profile is missing game profile or game UID
          if (data.isProfileComplete === false || !primaryGameProfile?.gameUid) {
            setIsOpen(true);
          }
        }
      })
      .catch((err) => console.warn('[ProfileCheck] Error checking user profile completeness:', err?.message))
      .finally(() => setLoading(false));
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
        inGameName: inGameName.trim() || existingUsername || undefined,
        rank,
        level: parseInt(level, 10) || 50,
        region,
        role,
        availability,
        isPrimary: true,
        allowComparison: isPublic,
      });

      const updatedData = res.data?.data;
      setSuccess(true);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-emerald-500/40 bg-[#070A11]/95 p-6 shadow-2xl shadow-emerald-950/60 space-y-5 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Complete Your GamerZ Profile</span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">Player Identity & Game Specs</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permanent GamerZ ID Display */}
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">Permanent GamerZ ID</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Verified Identity
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono tracking-wider">
            {gamerzId || user?.gamerzId || 'GZH-GENERATING'}
          </p>
          <p className="text-[11px] text-emerald-300/80 font-mono">
            This ID is permanent and cannot be changed. It connects all your gaming records across GamerZ Hub.
          </p>
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
            <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <p className="font-extrabold text-lg text-white">Profile Updated Successfully!</p>
              <p className="text-xs text-gray-300">Your GamerZ ID and game parameters are active.</p>
            </div>
          ) : (
            <>
              {/* Game Selector Buttons */}
              <div className="space-y-1.5">
                <label className="block text-gray-200 font-bold text-xs">Primary Game</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Free Fire', 'PUBG', 'Valorant', 'CS2', 'Apex Legends', 'League of Legends'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGame(g)}
                      className={`h-9 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 px-2 ${
                        game === g
                          ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/20'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{g}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Game UID & Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">In-Game UID / Player ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 518492041"
                    value={gameUid}
                    onChange={(e) => setGameUid(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none placeholder:text-gray-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">In-Game Level</label>
                  <input
                    type="number"
                    placeholder="e.g. 65"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none placeholder:text-gray-500 font-mono"
                  />
                </div>
              </div>

              {/* Rank & Region */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Current Rank / Rating</label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
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

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Playing Region</label>
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

              {/* Role & Availability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Competitive Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="Rusher" className="bg-slate-900">Rusher / Entry Fragger</option>
                    <option value="IGL" className="bg-slate-900">IGL (In-Game Leader)</option>
                    <option value="Sniper" className="bg-slate-900">Sniper / Marksman</option>
                    <option value="Support" className="bg-slate-900">Support / Sentinel</option>
                    <option value="Flex" className="bg-slate-900">Flex Controller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Active Playing Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-white focus:border-emerald-400 outline-none"
                  >
                    <option value="Daily 8pm-11pm" className="bg-slate-900">Daily Evenings (8 PM - 11 PM)</option>
                    <option value="Weekends Only" className="bg-slate-900">Weekends Only</option>
                    <option value="Full Time / Flexible" className="bg-slate-900">Full Time / Flexible Hours</option>
                    <option value="Late Night" className="bg-slate-900">Late Night (11 PM - 3 AM)</option>
                  </select>
                </div>
              </div>

              {/* Profile Visibility Switch */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="font-bold text-white text-xs flex items-center gap-1.5">
                    {isPublic ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
                    Profile Visibility
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {isPublic ? 'Public & Discoverable for Matchmaking & Squads' : 'Private (Hidden from Public Suggestions)'}
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

              {/* Action Buttons */}
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
                  className="rounded-xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110 shadow-lg shadow-emerald-500/25 px-7"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    'Save Profile'
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
