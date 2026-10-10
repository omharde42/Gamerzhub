'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { GAMES, ROLES, API_URL } from '@/lib/constants';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Shield, Bell, User, Gamepad2, X, Loader2, Sparkles, Camera, Eye, EyeOff, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { BackHeader } from '@/components/common/back-header';
import { AdvancedSettingsTab } from '@/components/settings/advanced-settings';
import { LegalSettingsTab } from '@/components/settings/legal-settings';
import { uploadMediaFile } from '@/lib/upload';

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Profile Form States
  const [game, setGame] = useState('Free Fire');
  const [gameUid, setGameUid] = useState('');
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || '');
  const [rank, setRank] = useState('Heroic');
  const [level, setLevel] = useState('50');
  const [region, setRegion] = useState('ASIA');
  const [role, setRole] = useState('Rusher');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [isPublic, setIsPublic] = useState(user?.profile?.allowComparison !== false);

  // ID Screenshot Proof State
  const [screenshotUrl, setScreenshotUrl] = useState<string>('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotProgress, setScreenshotProgress] = useState(0);

  // Avatar Upload State
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Sync initial user state
  useEffect(() => {
    if (user?.profile) {
      if (user.profile.displayName) setDisplayName(user.profile.displayName);
      if (user.profile.bio) setBio(user.profile.bio);
      if (user.profile.rank) setRank(user.profile.rank);
      if (user.profile.role) setRole(user.profile.role);
      if (user.profile.country) setRegion(user.profile.country);
      if (user.profile.allowComparison !== undefined) setIsPublic(user.profile.allowComparison);
    }
  }, [user]);

  // Handle ID Screenshot Proof File Change
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingScreenshot(true);
    setScreenshotProgress(10);
    try {
      const url = await uploadMediaFile(file, {
        endpoint: '/posts/upload',
        folder: 'chat',
        fieldName: 'media',
        onProgress: (p) => setScreenshotProgress(p),
      });
      setScreenshotUrl(url);
      toast.success('ID Screenshot proof uploaded successfully!');
    } catch (err: any) {
      console.error('Screenshot upload error:', err);
      toast.error(err.message || 'Failed to upload screenshot proof.');
    } finally {
      setUploadingScreenshot(false);
      setScreenshotProgress(0);
    }
  };

  // Handle Avatar Change
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setAvatarProgress(10);
    try {
      const avatarUrl = await uploadMediaFile(file, {
        endpoint: '/profiles/avatar',
        fieldName: 'avatar',
        onProgress: (p) => setAvatarProgress(p),
      });

      setUser({ ...user, profile: { ...user?.profile, avatar: avatarUrl } } as any);
      const username = user?.profile?.username || (user as any)?.username;
      if (username) {
        queryClient.invalidateQueries({ queryKey: ['profile', username] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
      toast.success('Avatar updated successfully!');
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      toast.error(err.message || 'Failed to upload avatar.');
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(0);
    }
  };

  // Connected Accounts Query & Mutations
  const { data: linkedData, refetch: refetchAccounts } = useQuery({
    queryKey: ['linked-accounts'],
    queryFn: () => api.get('/auth/accounts').then((r) => r.data.data).catch(() => null),
    enabled: !!user,
  });

  const linkedAccounts = linkedData?.accounts || (Array.isArray(linkedData) ? linkedData : []);
  const discordData = linkedData?.discord;
  const steamData = linkedData?.steam;

  const disconnectDiscord = useMutation({
    mutationFn: () => api.post('/auth/discord/disconnect'),
    onSuccess: () => {
      refetchAccounts();
      toast.success('Discord account unlinked');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to disconnect Discord'),
  });

  const disconnectSteam = useMutation({
    mutationFn: () => api.post('/steam/disconnect'),
    onSuccess: () => {
      refetchAccounts();
      toast.success('Steam account unlinked');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to disconnect Steam'),
  });

  const handleLinkSocial = async (provider: string) => {
    if (provider === 'discord') {
      try {
        const { data } = await api.post('/auth/discord/link');
        if (data?.data?.url) {
          window.location.href = data.data.url;
        } else if (data?.data?.linked) {
          refetchAccounts();
          toast.success('Discord account linked');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to start Discord link');
      }
      return;
    }
    if (provider === 'steam') {
      window.location.href = API_URL + '/auth/steam';
      return;
    }
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || `Failed to link ${provider}`);
    }
  };

  // Submit Main Simple Profile Form
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gameUid.trim()) {
      toast.error('Please enter your In-Game UID.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Save game profile data to /api/profiles/setup-game
      const res = await api.post('/profiles/setup-game', {
        game,
        gameUid: gameUid.trim(),
        inGameName: displayName || undefined,
        rank,
        level: parseInt(level, 10) || 50,
        region,
        role,
        isPrimary: true,
        allowComparison: isPublic,
      });

      // 2. Update general profile fields
      const updatedProfileRes = await api.put('/profiles', {
        displayName: displayName.trim() || user?.profile?.displayName,
        bio: bio.trim() || user?.profile?.bio,
        country: region,
        rank,
        role,
        mainGames: [game],
        allowComparison: isPublic,
      });

      const updatedData = res.data?.data;
      const updatedProfile = updatedProfileRes.data?.data;

      toast.success('Profile Saved Successfully!');

      if (user) {
        setUser({
          ...user,
          gamerzId: updatedData?.gamerzId || user.gamerzId,
          profile: {
            ...(user.profile || {}),
            ...updatedProfile,
          } as any,
        });
      }

      const currentUsername = updatedProfile?.username || user?.profile?.username || (user as any)?.username;

      if (currentUsername) {
        queryClient.invalidateQueries({ queryKey: ['profile', currentUsername] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        router.push(`/profile/${currentUsername}`);
      } else {
        router.push('/feed');
      }
    } catch (err: any) {
      console.error('Profile save error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save gamer profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const gameOptions = ['Free Fire', 'PUBG', 'Valorant', 'CS2', 'Apex Legends', 'Fortnite', 'League of Legends', 'Clash of Clans'];
  const roleOptions = [
    { label: 'Player', value: 'Player' },
    { label: 'Creator', value: 'Creator' },
    { label: 'Gamer', value: 'Gamer' },
    { label: 'Rusher / Entry', value: 'Rusher' },
    { label: 'IGL (Leader)', value: 'IGL' },
    { label: 'Sniper', value: 'Sniper' },
    { label: 'Support', value: 'Support' },
    { label: 'Flex', value: 'Flex' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Header */}
      <BackHeader title="Settings" />

      {/* Main Header with GamerZ ID */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border/60">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-primary" />
            Gamer Profile Setup & Settings
          </h1>
          <p className="text-xs text-muted-foreground">
            Set up your game UID, rank, role, and screenshot proof so other gamers can view your public profile.
          </p>
        </div>
        {user?.gamerzId && (
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 shrink-0">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>GamerZ ID: {user.gamerzId}</span>
          </div>
        )}
      </div>

      {/* Modern Tabs */}
      <Tabs defaultValue="setup" className="space-y-6">
        <TabsList className="w-full border-b border-border/50 rounded-none bg-transparent h-12 p-0 gap-4 flex md:inline-flex overflow-x-auto whitespace-nowrap scrollbar-none justify-start">
          <TabsTrigger
            value="setup"
            className="shrink-0 data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-3 py-3 bg-transparent font-bold text-sm gap-2"
          >
            <Gamepad2 className="h-4 w-4" /> Game Profile
          </TabsTrigger>
          <TabsTrigger
            value="accounts"
            className="shrink-0 data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-3 py-3 bg-transparent font-bold text-sm gap-2"
          >
            <Shield className="h-4 w-4" /> Connected Accounts
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            className="shrink-0 data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent rounded-none px-3 py-3 bg-transparent font-bold text-sm gap-2"
          >
            <Bell className="h-4 w-4" /> Account & Preferences
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: STREAMLINED GAME PROFILE SETUP FORM */}
        <TabsContent value="setup">
          <Card variant="glass" className="border-primary/20 shadow-xl">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleSubmitProfile} className="space-y-6">
                
                {/* 1. SELECT GAME */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Select Game *
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {gameOptions.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGame(g)}
                        className={`h-11 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 px-3 ${
                          game === g
                            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                            : 'bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        <Gamepad2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{g}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. GAME UID & DISPLAY ALIAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gameUid" className="text-xs font-bold text-foreground">
                      In-Game UID / ID *
                    </Label>
                    <Input
                      id="gameUid"
                      type="text"
                      required
                      placeholder="Enter your Game UID (e.g. 518492041)"
                      value={gameUid}
                      onChange={(e) => setGameUid(e.target.value)}
                      className="h-11 font-mono rounded-xl bg-background/50 border-border/80 text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-xs font-bold text-foreground">
                      Gaming Display Name / Alias
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="e.g. ShadowHunter, LegendGamer"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-11 rounded-xl bg-background/50 border-border/80 text-foreground"
                    />
                  </div>
                </div>

                {/* 3. RANK, LEVEL, ROLE & REGION */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Rank</Label>
                    <Select value={rank} onValueChange={setRank}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/80">
                        <SelectValue placeholder="Select rank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Grandmaster">Grandmaster 👑</SelectItem>
                        <SelectItem value="Heroic">Heroic / Master 🔥</SelectItem>
                        <SelectItem value="Ace">Ace / Radiant ⚡</SelectItem>
                        <SelectItem value="Diamond">Diamond 💎</SelectItem>
                        <SelectItem value="Ascendant">Ascendant 🏆</SelectItem>
                        <SelectItem value="Platinum">Platinum 🛡️</SelectItem>
                        <SelectItem value="Gold">Gold 🥇</SelectItem>
                        <SelectItem value="Silver">Silver / Bronze 🥉</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Role / Type</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/80">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Region</Label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/80">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ASIA">Asia / India 🇮🇳</SelectItem>
                        <SelectItem value="NA-East">NA-East 🇺🇸</SelectItem>
                        <SelectItem value="NA-West">NA-West 🇺🇸</SelectItem>
                        <SelectItem value="EU">Europe 🇪🇺</SelectItem>
                        <SelectItem value="SA">South America 🇧🇷</SelectItem>
                        <SelectItem value="Global">Global 🌐</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level" className="text-xs font-bold text-foreground">Level</Label>
                    <Input
                      id="level"
                      type="number"
                      placeholder="Level (e.g. 65)"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="h-11 font-mono rounded-xl bg-background/50 border-border/80 text-foreground"
                    />
                  </div>
                </div>

                {/* 4. ID SCREENSHOT PROOF UPLOAD */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>ID Screenshot Proof (Option to attach screenshot)</span>
                    <span className="text-[11px] text-muted-foreground font-normal">Supports JPG, PNG, WEBP (Max 10MB)</span>
                  </Label>
                  <div className="border-2 border-dashed border-border/60 hover:border-primary/50 rounded-2xl p-4 bg-muted/20 text-center relative transition-colors">
                    {screenshotUrl ? (
                      <div className="relative inline-block group">
                        <img
                          src={screenshotUrl}
                          alt="In-game ID Screenshot Proof"
                          className="max-h-48 rounded-xl object-contain shadow-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setScreenshotUrl('')}
                          className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full shadow hover:scale-110 transition-transform"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="mt-2 flex items-center justify-center gap-1 text-xs text-emerald-400 font-bold">
                          <CheckCircle2 className="w-4 h-4" /> Screenshot Attached
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2 py-2">
                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div className="text-xs">
                          <span className="font-bold text-primary">Click to upload</span> in-game ID screenshot
                        </div>
                        <p className="text-[11px] text-muted-foreground">Upload profile or stats screenshot for player verification</p>
                      </div>
                    )}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      disabled={uploadingScreenshot}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  {uploadingScreenshot && (
                    <div className="flex items-center gap-2 text-xs text-primary font-medium mt-1">
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading screenshot... {screenshotProgress}%
                    </div>
                  )}
                </div>

                {/* 5. BIO / GAMER SUMMARY */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-xs font-bold text-foreground">Bio / Gamer Summary</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Introduce yourself to teammates! Share your active hours, playstyle, or favorite weapons."
                    rows={3}
                    className="rounded-xl bg-background/50 border-border/80 resize-none text-foreground"
                  />
                </div>

                {/* 6. PROFILE VISIBILITY TOGGLE */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div>
                    <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      {isPublic ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
                      Public Profile Visibility
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isPublic
                        ? 'Public — Other gamers can find and view your profile card & game stats'
                        : 'Private — Hidden from player search & matchmaking'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isPublic
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    {isPublic ? 'Public' : 'Private'}
                  </button>
                </div>

                {/* 7. AVATAR UPLOAD OPTION */}
                <div className="flex items-center justify-between border-t border-border/40 pt-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-primary/40">
                      <AvatarImage src={user?.profile?.avatar || ''} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {getInitials(user?.profile?.username || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-bold text-foreground">Profile Avatar</p>
                      <p className="text-[11px] text-muted-foreground">Change your public avatar picture</p>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" className="relative h-9 px-4 rounded-xl cursor-pointer" disabled={avatarUploading}>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={handleAvatarChange}
                      disabled={avatarUploading}
                    />
                    {avatarUploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        <span>{avatarProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        <span>Change Avatar</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* 8. SAVE PROFILE BUTTON */}
                <Button
                  type="submit"
                  disabled={submitting}
                  variant="gradient"
                  className="w-full h-12 rounded-xl font-extrabold text-sm gap-2 shadow-lg shadow-primary/10"
                  animate
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Gamer Profile...
                    </>
                  ) : (
                    'Save Profile & Publish'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CONNECTED ACCOUNTS */}
        <TabsContent value="accounts">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Connected Social & Gaming Accounts
              </CardTitle>
              <CardDescription>
                Link your Google, Discord, and Steam accounts for quick login and gaming identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  provider: 'GOOGLE',
                  name: 'Google',
                  icon: (
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  ),
                },
                {
                  provider: 'DISCORD',
                  name: 'Discord',
                  icon: (
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#5865F2">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                    </svg>
                  ),
                },
                {
                  provider: 'STEAM',
                  name: 'Steam',
                  icon: (
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#171A21">
                      <path d="M12 2C6.48 2 2 6.48 2 12c0 2.03.6 3.92 1.64 5.5l3.76-1.56a3.24 3.24 0 0 1-.28-1.3c0-1.79 1.45-3.24 3.24-3.24.94 0 1.79.4 2.38 1.04l5.7-2.27A6.96 6.96 0 0 0 12 2zm7.96 9.72l-5.46 2.18c.07.25.11.52.11.79 0 1.79-1.45 3.24-3.24 3.24-.5 0-.97-.12-1.39-.32l-3.78 1.57A6 6 0 0 0 12 22c5.52 0 10-4.48 10-10 0-.87-.11-1.72-.32-2.53-.06-.25-.13-.5-.22-.75zM7.08 14.4l-2.48 1.02A5.96 5.96 0 0 0 6 18.4c.48.73 1.1 1.34 1.83 1.82l-.75-2.5a1.26 1.26 0 0 1-.7-.22 1.32 1.32 0 0 1-.5-1.43c.11-.35.33-.65.63-.85.29-.2.64-.28.99-.23.19.03.37.1.52.2l.75-2.5a4.73 4.73 0 0 0-2.29-.08zm1.8-1.31c-.65 0-1.18-.53-1.18-1.18s.53-1.18 1.18-1.18 1.18.53 1.18 1.18-.53 1.18-1.18 1.18zm3.72 5.72c1.37 0 2.48-1.11 2.48-2.48s-1.11-2.48-2.48-2.48-2.48 1.11-2.48 2.48 1.11 2.48 2.48 2.48z" />
                    </svg>
                  ),
                },
              ].map((item) => {
                const isDiscord = item.provider === 'DISCORD';
                const isSteam = item.provider === 'STEAM';
                const isDiscordConnected = isDiscord && discordData?.connected;
                const isSteamConnected = isSteam && steamData?.connected;
                const linkedAcc = (linkedAccounts || []).find((a: any) => a.provider === item.provider);
                const isConnected = isDiscordConnected || isSteamConnected || !!linkedAcc;

                return (
                  <div key={item.provider} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/40">
                    <div className="flex items-center gap-3">
                      {isDiscordConnected && discordData?.avatar ? (
                        <Avatar className="h-10 w-10 border border-[#5865F2]/40 shadow-sm shrink-0">
                          <AvatarImage src={discordData.avatar} alt={discordData.username} />
                          <AvatarFallback className="bg-[#5865F2] text-white font-bold text-xs">{getInitials(discordData.username)}</AvatarFallback>
                        </Avatar>
                      ) : isSteamConnected && steamData?.avatar ? (
                        <Avatar className="h-10 w-10 border border-primary/40 shadow-sm shrink-0">
                          <AvatarImage src={steamData.avatar} alt={steamData.username} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">{getInitials(steamData.username)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="p-2 rounded-lg bg-muted/40 shrink-0">{item.icon}</div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{item.name}</p>
                          {isConnected && (
                            <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                              🟢 Connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isDiscordConnected ? `@${discordData.username}` : isSteamConnected ? steamData.username : linkedAcc ? `Connected` : 'Not connected'}
                        </p>
                      </div>
                    </div>
                    {isDiscordConnected ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => disconnectDiscord.mutate()}
                        disabled={disconnectDiscord.isPending}
                      >
                        Disconnect
                      </Button>
                    ) : isSteamConnected ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => disconnectSteam.mutate()}
                        disabled={disconnectSteam.isPending}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-xl"
                        onClick={() => handleLinkSocial(item.provider.toLowerCase())}
                      >
                        Connect {item.name}
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ADVANCED PREFERENCES */}
        <TabsContent value="advanced">
          <AdvancedSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}