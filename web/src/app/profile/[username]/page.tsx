'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { MapPin, Trophy, Target, Gamepad2, Twitch, Youtube, MessageCircle, ExternalLink, Star, Shield, Users, Award, Swords, X, Loader2, Heart, UserCheck, UserPlus, Sparkles, Settings, Camera, MessageSquare, Search, ImagePlus } from 'lucide-react';
import { formatDate, formatViewCount, getInitials, getRankColor } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useOverlayStore } from '@/store/overlayStore';
import { useSocket } from '@/hooks/useSocket';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { PremiumModal } from '@/components/ui/premium-modal';
import { PostCard } from '@/components/post/post-card';
import { SteamShowcase } from '@/components/profile/steam-showcase';
import { ClashOfClansCard } from '@/components/game-sync/clash-of-clans-card';
import { ModularGameHub } from '@/components/profile/modular-game-hub';
import { ChallengeButton } from '@/components/challenges/challenge-button';
import { BackHeader } from '@/components/common/back-header';
import { LevelChip } from '@/components/hud/level-chip';
import { gamerLevel } from '@/lib/gamer-level';

function StatCard({ value, label, color, delay = 0 }: { value: string | number; label: string; color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card variant="glass" hover={false}>
        <CardContent className="p-4 text-center">
          <motion.p
            className={`text-2xl font-bold ${color}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.2, type: 'spring', stiffness: 100 }}
          >
            {value}
          </motion.p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProfilePage() {
  const { username: paramUsername } = useParams();
  // When rendered inside the Profile overlay panel the username is provided by
  // the overlay store; as a normal route it comes from the URL params.
  const panelEmbedded = useOverlayStore((s) => s.panel === 'profile');
  const panelUsername = useOverlayStore((s) => s.panelUsername);
  const username = (panelEmbedded ? panelUsername : paramUsername) as string;
  const embedded = panelEmbedded;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: profile, isLoading } = useQuery({ queryKey: ['profile', username], queryFn: () => api.get(`/profiles/${username}`).then(r => r.data.data) });
  const { data: posts } = useQuery({ queryKey: ['profile-posts', username], queryFn: () => api.get(`/posts?userId=${profile?.user?.id}`).then(r => r.data.data).catch(() => []), enabled: !!profile?.user?.id });

  const [following, setFollowing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const { data: followingList } = useQuery({ queryKey: ['following-me'], queryFn: () => api.get('/feed/following').then(r => r.data.data.map((f: any) => f.following?.id)).catch(() => []), enabled: !!user });
  useEffect(() => { if (followingList && profile?.user?.id) setFollowing(followingList.includes(profile.user.id)); }, [followingList, profile?.user?.id]);
  const { data: friendList } = useQuery({ queryKey: ['friends'], queryFn: () => api.get('/friends').then(r => r.data.data.map((f: any) => f.id)).catch(() => []), enabled: !!user });
  const { data: friendRequests } = useQuery({ queryKey: ['friend-requests'], queryFn: () => api.get('/friends/requests').then(r => r.data.data.map((r: any) => r.sender?.id)).catch(() => []), enabled: !!user });
  useEffect(() => {
    if (profile?.friendshipStatus !== undefined) {
      setFriendStatus(profile.friendshipStatus);
    } else {
      if (!profile?.user?.id || !user) return;
      if (friendList?.includes(profile.user.id)) setFriendStatus('friends');
      else if (friendRequests?.includes(profile.user.id)) setFriendStatus('pending');
      else setFriendStatus(null);
    }
  }, [friendList, friendRequests, profile?.user?.id, profile?.friendshipStatus, user]);

  const toggleFollow = useMutation({
    mutationFn: () => following ? api.post(`/feed/unfollow/${profile?.user?.id}`) : api.post(`/feed/follow/${profile?.user?.id}`),
    onSuccess: () => { setFollowing(!following); queryClient.invalidateQueries({ queryKey: ['following-me'] }); toast.success(following ? 'Unfollowed' : `Following @${profile?.username}`); },
  });

  const sendFriendReq = useMutation({
    mutationFn: () => api.post('/friends/request', { userId: profile!.user!.id }),
    onSuccess: () => { setFriendStatus('pending'); toast.success('Friend request sent!'); },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  // Photo Upload State & Handler
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  const uploadPhoto = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'avatar' | 'banner' }) => {
      const form = new FormData();
      form.append(type === 'avatar' ? 'avatar' : 'banner', file);
      return api.post(`/profiles/${type}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      setUploading(null);
      const newUrl = variables.type === 'avatar' ? data.data?.avatar : data.data?.banner;
      if (user && newUrl) {
        if (variables.type === 'avatar') {
          useAuthStore.getState().setUser({ ...user, profile: { ...user.profile, avatar: newUrl } as any });
        } else {
          useAuthStore.getState().setUser({ ...user, profile: { ...user.profile, banner: newUrl } as any });
        }
      }
      toast.success(`${variables.type === 'avatar' ? 'Avatar' : 'Banner'} updated successfully!`);
    },
    onError: (err: any) => {
      setUploading(null);
      const msg = err.response?.data?.message || err.message || 'Upload failed. Please try again.';
      toast.error(msg);
    },
  });

  const handlePhotoUpload = (type: 'avatar' | 'banner') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error('Unsupported file format. Please upload JPG, PNG, or WebP.');
        return;
      }

      const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`Image is too large. Maximum size is ${type === 'avatar' ? '5MB' : '10MB'}.`);
        return;
      }

      setUploading(type);
      uploadPhoto.mutate({ file, type });
    };
    input.click();
  };
  const [listModalOpen, setListModalOpen] = useState(false);
  const [listType, setListType] = useState<'connections' | 'followers' | 'following' | null>(null);
  const [listSearch, setListSearch] = useState('');

  const { data: rawListData, isLoading: listLoading } = useQuery({
    queryKey: ['profile-social-list', listType, profile?.userId],
    queryFn: async () => {
      if (!listType || !profile?.userId) return [];
      if (listType === 'connections') {
        return api.get(`/friends?userId=${profile.userId}`).then(r => r.data.data);
      }
      if (listType === 'followers') {
        const res = await api.get(`/feed/followers?userId=${profile.userId}`);
        return res.data.data.map((item: any) => item.follower).filter(Boolean);
      }
      if (listType === 'following') {
        const res = await api.get(`/feed/following?userId=${profile.userId}`);
        return res.data.data.map((item: any) => item.following).filter(Boolean);
      }
      return [];
    },
    enabled: !!listType && !!profile?.userId && listModalOpen,
  });

  const listData = rawListData || [];

  const filteredList = listData.filter((item: any) => {
    if (!item) return false;
    const username = item.profile?.username?.toLowerCase() || '';
    const displayName = item.profile?.displayName?.toLowerCase() || '';
    const search = listSearch.toLowerCase();
    return username.includes(search) || displayName.includes(search);
  });

  const listToggleFollow = useMutation({
    mutationFn: (targetId: string) => {
      const isCurrentlyFollowing = followingList?.includes(targetId);
      return isCurrentlyFollowing 
        ? api.post(`/feed/unfollow/${targetId}`) 
        : api.post(`/feed/follow/${targetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following-me'] });
      queryClient.invalidateQueries({ queryKey: ['profile-social-list'] });
      toast.success('Updated follow status');
    },
  });

  const listConnect = useMutation({
    mutationFn: (targetId: string) => api.post('/friends/request', { userId: targetId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['profile-social-list'] });
      toast.success('Connection request sent!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to connect'),
  });

  const openSocialList = (type: 'connections' | 'followers' | 'following') => {
    setListType(type);
    setListSearch('');
    setListModalOpen(true);
  };

  const router = useRouter();
  const openMessages = () => {
    if (profile?.user?.id) {
      router.push(`/messages?userId=${profile.user.id}`);
    }
  };

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (socket) {
      const onOnline = (userId: string) => setOnlineUsers(p => new Set(p).add(userId));
      const onOffline = (userId: string) => setOnlineUsers(p => { const n = new Set(p); n.delete(userId); return n; });
      socket.on('user:online', onOnline);
      socket.on('user:offline', onOffline);
      return () => { socket.off('user:online', onOnline); socket.off('user:offline', onOffline); };
    }
  }, [socket]);

  if (isLoading) return <div className="max-w-4xl mx-auto space-y-6"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!profile) return <div className="text-center py-20"><h2 className="text-2xl font-bold">Profile not found</h2></div>;

  const profileLevel = gamerLevel(Number(profile.totalMatches || 0));

  const isOwn = user?.profile?.username === username;
  const socialLinks = [
    { icon: Twitch, href: profile.twitch, label: 'Twitch' },
    { icon: Youtube, href: profile.youtube, label: 'YouTube' },
    { icon: MessageCircle, href: profile.discord ? `https://discord.com/users/${profile.discord}` : null, label: 'Discord' },
    { icon: ExternalLink, href: profile.steam ? `https://steamcommunity.com/profiles/${profile.steam}` : null, label: 'Steam' },
  ].filter(s => s.href);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back navigation button (hidden when embedded as an overlay panel) */}
      {!embedded && <BackHeader title={profile.displayName || profile.username} />}

      {/* Profile header */}
      <Card variant="glass" className="overflow-hidden border-border/60" hover={false}>
        <motion.div
          className={`h-48 md:h-64 bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950 relative overflow-hidden ${user?.profile?.username === username ? 'group cursor-pointer' : ''}`}
          onClick={() => user?.profile?.username === username && handlePhotoUpload('banner')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {profile.banner ? (
            <img src={profile.banner} alt="Profile banner" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-slate-500 pointer-events-none">
                <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-600/70 flex items-center justify-center">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest">Add Cover Photo</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-grid opacity-5" />
          {user?.profile?.username === username && (
            <>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center gap-1 text-white text-xs font-semibold">
                  <Camera className="h-6 w-6" /> {profile.banner ? 'Edit Banner' : 'Add Banner'}
                </div>
              </div>
              {/* Always-visible edit button (LinkedIn-style) */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePhotoUpload('banner'); }}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 border border-white/20 text-white text-xs font-bold backdrop-blur-md hover:bg-emerald-600/80 hover:border-emerald-400/60 hover:shadow-[0_0_16px_rgba(16,185,129,0.5)] transition-all"
              >
                {uploading === 'banner' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {profile.banner ? 'Edit Cover' : 'Add Cover'}
              </button>
            </>
          )}
          {uploading === 'banner' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 pointer-events-none">
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest">Uploading Cover...</span>
              </div>
            </div>
          )}
        </motion.div>
        <CardContent className="relative px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 md:-mt-20 mb-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className={`relative ${user?.profile?.username === username ? 'group cursor-pointer' : ''}`} onClick={() => user?.profile?.username === username && handlePhotoUpload('avatar')}>
              <div className="level-ring" style={{ ['--lvl-pct' as any]: `${profileLevel.xp}%` }}>
                <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-background">
                  <AvatarImage src={profile.avatar || ''} />
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">{getInitials(profile.username)}</AvatarFallback>
                </Avatar>
              </div>
              {user?.profile?.username === username && (
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center text-white">
                  <Camera className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              {uploading === 'avatar' && (
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              )}
            </motion.div>
            <div className="flex-1 pt-14 md:pt-0">
              <motion.div className="flex flex-col md:flex-row md:items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{profile.displayName || profile.username}</h1>
                <span className="text-muted-foreground">@{profile.username}</span>
                {(profile.gamerzId || profile.user?.gamerzId) && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/40 shrink-0">
                    GamerZ ID: {profile.gamerzId || profile.user?.gamerzId}
                  </span>
                )}
              </motion.div>
              <motion.div className="flex flex-wrap items-center gap-2 mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <LevelChip totalMatches={Number(profile.totalMatches || 0)} />
                <Badge variant="rank" className={getRankColor(profile.rank)}><Trophy className="h-3 w-3 mr-1" />{profile.rank || 'Unranked'}</Badge>
                <Badge variant="outline">{profile.role || 'Flex'}</Badge>
                {profile.country && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{profile.country}</Badge>}
                
                {profile.winRate >= 60 && (
                  <Badge variant="neon" className="bg-success/5 border-success/30 text-success gap-1 text-[10px] py-0.5 px-2">
                    <Sparkles className="h-2.5 w-2.5 animate-pulse" /> Dominator
                  </Badge>
                )}
                {profile.kd >= 2.0 && (
                  <Badge variant="neon" className="bg-primary/5 border-primary/30 text-primary gap-1 text-[10px] py-0.5 px-2">
                    <Target className="h-2.5 w-2.5" /> Sharp Shooter
                  </Badge>
                )}
                {profile.achievements?.length >= 5 && (
                  <Badge variant="neon" className="bg-yellow-500/5 border-yellow-500/30 text-yellow-500 gap-1 text-[10px] py-0.5 px-2">
                    <Award className="h-2.5 w-2.5 text-yellow-500" /> Completionist
                  </Badge>
                )}
              </motion.div>
            </div>
            {!isOwn ? (
              <motion.div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                {friendStatus === 'friends' ? (
                  <>
                    <Badge variant="neon" className="bg-success/5 border-success/30 text-success gap-1.5 px-3 h-11 text-xs font-semibold rounded-xl w-full sm:w-auto justify-center">
                      <UserCheck className="h-4 w-4 text-success" /> Connected
                    </Badge>
                    <Button variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto h-11" onClick={openMessages}>
                      <MessageCircle className="h-4 w-4" /> Message
                    </Button>
                  </>
                ) : friendStatus === 'pending' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 w-full sm:w-auto h-11"
                    disabled={true}
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    Pending
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    size="sm"
                    className="gap-1.5 w-full sm:w-auto h-11"
                    onClick={() => sendFriendReq.mutate()}
                    disabled={sendFriendReq.isPending}
                    animate
                  >
                    <UserPlus className="h-4 w-4" /> Connect
                  </Button>
                )}

                <Button
                  variant={following ? 'secondary' : 'gradient'}
                  size="sm"
                  className="gap-1.5 min-w-[100px] w-full sm:w-auto h-11"
                  onClick={() => toggleFollow.mutate()}
                  disabled={toggleFollow.isPending}
                  animate
                >
                  {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {following ? 'Following' : 'Follow'}
                </Button>
                <Link href={`/messages?userId=${profile.userId}`} className="w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="gap-1.5 min-w-[100px] w-full sm:w-auto h-11">
                    <MessageSquare className="h-4 w-4 text-primary" /> Message
                  </Button>
                </Link>
                <ChallengeButton
                  opponentId={profile.userId || profile.user?.id || profile.id}
                  opponentUsername={profile.username}
                  opponentDisplayName={profile.displayName}
                  opponentAvatar={profile.avatar}
                />
              </motion.div>
            ) : (
              <motion.div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <Link href="/profile/settings" className="w-full sm:w-auto">
                  <Button variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto h-11">
                    <Settings className="h-4 w-4" /> Edit Profile
                  </Button>
                </Link>
              </motion.div>
            )}
          </div>
          {profile.bio && <motion.p className="text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>{profile.bio}</motion.p>}

          {/* Social Counts Row */}
          <motion.div 
            className="flex flex-wrap items-center gap-5 py-3 my-4 border-t border-b border-border/30 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <button 
              onClick={() => openSocialList('connections')}
              className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
            >
              <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              <span className="font-bold">{profile.connectionsCount || 0}</span>
              <span className="text-muted-foreground text-xs">Connections</span>
            </button>
            <button 
              onClick={() => openSocialList('followers')}
              className="flex items-center gap-1.5 hover:text-gaming-pink transition-colors cursor-pointer group"
            >
              <Heart className="h-4 w-4 text-gaming-pink group-hover:scale-110 transition-transform" />
              <span className="font-bold">{(profile.user as any)?._count?.followers || 0}</span>
              <span className="text-muted-foreground text-xs">Followers</span>
            </button>
            <button 
              onClick={() => openSocialList('following')}
              className="flex items-center gap-1.5 hover:text-gaming-cyan transition-colors cursor-pointer group"
            >
              <UserCheck className="h-4 w-4 text-gaming-cyan group-hover:scale-110 transition-transform" />
              <span className="font-bold">{(profile.user as any)?._count?.following || 0}</span>
              <span className="text-muted-foreground text-xs">Following</span>
            </button>
            <div className="flex items-center gap-1.5 cursor-default group">
              <Sparkles className="h-4 w-4 text-yellow-500 group-hover:rotate-12 transition-transform" />
              <span className="font-bold">{formatViewCount(profile.profileViews)}</span>
              <span className="text-muted-foreground text-xs">Views</span>
            </div>
            <div className="flex items-center gap-1.5 cursor-default group">
              <Star className="h-4 w-4 text-gaming-purple group-hover:scale-110 transition-transform" />
              <span className="font-bold">{(profile.user as any)?._count?.posts || posts?.length || 0}</span>
              <span className="text-muted-foreground text-xs">Posts</span>
            </div>
          </motion.div>

          <motion.div className="flex flex-wrap gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            {profile.mainGames?.map((game: string, i: number) => (<Badge key={i} variant="secondary" className="gap-1"><Gamepad2 className="h-3 w-3" />{game}</Badge>))}
            {profile.languages?.map((lang: string, i: number) => (<Badge key={i} variant="outline">{lang}</Badge>))}
          </motion.div>
          {socialLinks.length > 0 && (
            <motion.div className="flex gap-2 mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              {socialLinks.map((link, i) => (
                <a key={i} href={link.href} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 hover:border-primary/50"><link.icon className="h-4 w-4" />{link.label}</Button>
                </a>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Modular Multi-Game Platform Hub with Dynamic Game Statistics */}
      <ModularGameHub userId={profile.userId || profile.user?.id || profile.id} isOwner={isOwn} />

      {/* Content tabs */}
      <Tabs defaultValue="achievements" className="w-full">
        <TabsList className="w-full bg-muted/30 p-1 rounded-xl flex md:inline-flex overflow-x-auto whitespace-nowrap scrollbar-none justify-start">
          <TabsTrigger value="steam" className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"><Gamepad2 className="h-4 w-4 mr-1" />Steam Library</TabsTrigger>
          <TabsTrigger value="achievements" className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"><Award className="h-4 w-4 mr-1" />Achievements ({profile.achievements?.length || 0})</TabsTrigger>
          <TabsTrigger value="history" className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"><Swords className="h-4 w-4 mr-1" />History ({profile.tournamentHistory?.length || 0})</TabsTrigger>
          <TabsTrigger value="posts" className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"><Star className="h-4 w-4 mr-1" />Posts ({posts?.length || 0})</TabsTrigger>
          <TabsTrigger value="about" className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"><Shield className="h-4 w-4 mr-1" />About</TabsTrigger>
        </TabsList>

        <TabsContent value="steam">
          <SteamShowcase userId={profile.userId || profile.user?.id || profile.id} />
        </TabsContent>

        <TabsContent value="achievements">
          <Card variant="glass">
            <CardContent className="p-6">
              {profile.achievements?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.achievements.map((a: any, i: number) => (
                    <motion.div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 transition-all bg-muted/10" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                        <Award className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No achievements yet</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card variant="glass">
            <CardContent className="p-6">
              {profile.tournamentHistory?.length > 0 ? (
                <div className="space-y-3">
                  {profile.tournamentHistory.map((h: any, i: number) => (
                    <motion.div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-primary/30 transition-all" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div>
                        <p className="text-sm font-medium">{h.tournamentName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                      </div>
                      <Badge variant={h.placement === '1st' ? 'default' : 'secondary'}>{h.placement}</Badge>
                    </motion.div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-center py-8">No tournament history</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4 outline-none">
          {posts && posts.length > 0 ? (
            posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={() => {
                  queryClient.invalidateQueries({ queryKey: ['profile-posts', username] });
                }}
              />
            ))
          ) : (
            <Card variant="glass">
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                No posts published yet.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="about">
          <Card variant="glass">
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold">Gaming Info</h3>
                  <div className="space-y-2 text-sm bg-muted/20 rounded-xl p-4 border border-border/30">
                    {[
                      { label: 'Play Style', value: profile.playStyle || 'Aggressive' },
                      { label: 'Communication', value: profile.communicationStyle || 'Shotcaller' },
                      { label: 'Active Time', value: profile.activeTime || 'Evenings & Weekends' },
                      { label: 'Experience', value: profile.experienceLevel || 'Competitive (3+ yrs)' },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="font-semibold">Stats Breakdown</h3>
                  <div className="space-y-4">
                    {(() => {
                      const winRateVal = profile.winRate;
                      const kdVal = profile.kd;
                      const accuracyVal = profile.accuracy;
                      return (
                        <>
                          <div>
                            <div className="flex justify-between text-sm mb-1.5"><span>Win Rate</span><span className="font-semibold text-emerald-400">{winRateVal ? `${winRateVal}%` : 'Not Available'}</span></div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <motion.div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" initial={{ width: 0 }} animate={{ width: `${winRateVal || 0}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1.5"><span>K/D Ratio</span><span className="font-semibold text-primary">{kdVal ? kdVal : 'Not Available'}</span></div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(((kdVal || 0) / 3) * 100, 100)}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1.5"><span>Accuracy</span><span className="font-semibold text-[#7C3AED]">{accuracyVal ? `${accuracyVal}%` : 'Not Available'}</span></div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <motion.div className="h-full bg-gradient-to-r from-purple-500 to-[#7C3AED] rounded-full" initial={{ width: 0 }} animate={{ width: `${accuracyVal || 0}%` }} transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }} />
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Social List Modal (Connections, Followers, Following) */}
      <PremiumModal
        open={listModalOpen && !!listType}
        onClose={() => setListModalOpen(false)}
        variant="center"
        size="lg"
        title={listType ? `${listType} list` : undefined}
        header={
          listType ? (
            <div className="flex w-full items-center justify-between">
              <div>
                <h3 className="font-bold text-base capitalize">{listType}</h3>
                <p className="text-xs text-muted-foreground">
                  {filteredList.length} {filteredList.length === 1 ? 'user' : 'users'} found
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setListModalOpen(false)} className="h-9 w-9 rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : undefined
        }
      >
        {listType && (
          <div>
            {/* Local Search input */}
            <div className="flex items-center gap-2 border-b border-border/30 bg-muted/5 px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="h-8 border-0 bg-transparent text-xs focus-visible:ring-0 px-0"
                variant="ghost"
              />
            </div>

            {/* List Content */}
            <div className="p-4">
              {listLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading list...</span>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredList.map((item: any) => {
                    if (!item) return null;
                    const isMe = item.id === user?.id;
                    const isFriend = friendList?.includes(item.id);
                    const isFollowingItem = followingList?.includes(item.id);

                    return (
                      <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/15 border border-transparent hover:border-border/30 transition-all duration-200">
                        {/* User Info */}
                        <Link 
                          href={`/profile/${item.profile?.username}`}
                          onClick={() => setListModalOpen(false)}
                          className="flex items-center gap-3 min-w-0"
                        >
                          <Avatar className="h-9 w-9 border border-border/30">
                            <AvatarImage src={item.profile?.avatar || ''} />
                            <AvatarFallback className="text-xs">{getInitials(item.profile?.username || '')}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate hover:text-primary transition-colors">
                              {item.profile?.displayName || item.profile?.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{item.profile?.username}
                            </p>
                          </div>
                        </Link>

                        {/* Action buttons */}
                        {!isMe && (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Follow / Unfollow */}
                            <Button
                              variant={isFollowingItem ? 'outline' : 'secondary'}
                              onClick={() => listToggleFollow.mutate(item.id)}
                              disabled={listToggleFollow.isPending}
                              className="h-7 text-[10px] px-2 rounded-lg font-bold"
                            >
                              {isFollowingItem ? 'Unfollow' : 'Follow'}
                            </Button>

                            {/* Connect / Connected */}
                            <Button
                              variant={isFriend ? 'default' : 'outline'}
                              onClick={() => !isFriend && listConnect.mutate(item.id)}
                              disabled={isFriend || listConnect.isPending}
                              className={`h-7 text-[10px] px-2 rounded-lg font-bold ${isFriend ? 'bg-success/10 text-success hover:bg-success/15 border-success/30' : ''}`}
                            >
                              {isFriend ? 'Connected' : 'Connect'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </PremiumModal>
    </div>
  );
}
