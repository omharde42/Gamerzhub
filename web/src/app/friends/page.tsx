'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getInitials } from '@/lib/utils';
import { UserPlus, UserX, Check, X, Loader2, Users, MessageCircle, Search, Sparkles, Globe, Flame, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { BackHeader } from '@/components/common/back-header';
import { PostCard } from '@/components/post/post-card';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS: Record<string, string> = {
  ONLINE: 'bg-success',
  IDLE: 'bg-warning',
  DND: 'bg-destructive',
  INVISIBLE: 'bg-muted-foreground',
  OFFLINE: 'bg-muted-foreground'
};

export default function FriendsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { data: friends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends').then(r => r.data.data)
  });

  const { data: requests } = useQuery({
    queryKey: ['friend-requests'],
    queryFn: () => api.get('/friends/requests').then(r => r.data.data)
  });

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['search-profiles', debouncedQuery],
    queryFn: () => api.get(`/profiles/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`).then(r => r.data.data),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery({
    queryKey: ['suggested-people'],
    queryFn: () => api.get('/friends/suggestions').then(r => r.data.data),
    staleTime: 60 * 1000,
  });

  // Fetch all gamer posts for the Global Community Showcase tab
  const { data: communityPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['community-posts'],
    queryFn: () => api.get('/posts?limit=30').then(r => r.data.data || []),
    staleTime: 30 * 1000,
  });

  const sendRequest = useMutation({
    mutationFn: (userId: string) => api.post('/friends/request', { userId }),
    onSuccess: () => {
      toast.success('Friend request sent!');
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['suggested-people'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send request'),
  });

  const acceptRequest = useMutation({
    mutationFn: (id: string) => api.post(`/friends/accept/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast.success('Friend request accepted!');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: (id: string) => api.post(`/friends/reject/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast.success('Request rejected');
    },
  });

  const removeFriend = useMutation({
    mutationFn: (userId: string) => api.post('/friends/remove', { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend removed');
    },
  });

  const friendIds = new Set(friends?.map((f: any) => f.id) || []);
  const requestIds = new Set(requests?.map((r: any) => r.sender?.id) || []);

  const filteredSuggestions = suggestions?.filter((p: any) => 
    p.userId !== user?.id && 
    !friendIds.has(p.userId) && 
    !requestIds.has(p.userId)
  ).slice(0, 4) || [];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Back navigation button */}
      <BackHeader title="Global Community" />

      <motion.div className="flex items-center justify-between" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2 tracking-tight">
            <Globe className="h-5 w-5 text-emerald-400" /> Global Community & Creator Showcase
          </h1>
          <p className="text-xs text-muted-foreground">Discover posts, gameplay highlights & connect with gamers worldwide</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Community & Friends Panel */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card variant="glass">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search gamers or creators..." className="pl-9" variant="neon" />
                  </div>
                </div>
                {debouncedQuery.trim().length >= 2 && (
                  <div className="rounded-xl border border-border/30 bg-muted/20 overflow-hidden">
                    {searching ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : searchResults?.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No gamers found for &quot;{debouncedQuery}&quot;</p>
                    ) : (
                      <div className="divide-y divide-border/20 max-h-64 overflow-y-auto">
                        {searchResults?.filter((p: any) => p.userId !== user?.id).map((profile: any) => {
                          const isFriend = friendIds.has(profile.userId);
                          const hasPending = requestIds.has(profile.userId);
                          return (
                            <div key={profile.id} className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors animate-card-enter">
                              <Link href={`/profile/${profile.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={profile.avatar || ''} />
                                  <AvatarFallback className="text-xs">{getInitials(profile.username)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate hover:text-emerald-400 transition-colors text-foreground">{profile.displayName || profile.username}</p>
                                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                                </div>
                              </Link>
                              <div className="ml-3">
                                {isFriend ? (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Friends</span>
                                ) : hasPending ? (
                                  <span className="text-xs text-muted-foreground">Request sent</span>
                                ) : (
                                  <Button variant="gradient" size="sm" className="h-8 gap-1 text-xs px-3 rounded-lg" onClick={() => sendRequest.mutate(profile.userId)} disabled={sendRequest.isPending} animate>
                                    {sendRequest.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                                    Connect
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <Tabs defaultValue="showcase">
            <TabsList className="bg-card/60 border border-white/10 p-1 rounded-2xl flex md:inline-flex overflow-x-auto whitespace-nowrap scrollbar-none justify-start gap-1">
              <TabsTrigger value="showcase" className="shrink-0 rounded-xl data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border data-[state=active]:border-emerald-500/50 data-[state=active]:shadow-[0_0_20px_rgba(16,185,129,0.35)] font-bold gap-1.5">
                <Flame className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> Gamer Feed & Showcases
              </TabsTrigger>
              <TabsTrigger value="online" className="shrink-0 rounded-xl data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border data-[state=active]:border-emerald-500/50 data-[state=active]:shadow-[0_0_20px_rgba(16,185,129,0.35)] font-bold">Online</TabsTrigger>
              <TabsTrigger value="all" className="shrink-0 rounded-xl data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border data-[state=active]:border-emerald-500/50 data-[state=active]:shadow-[0_0_20px_rgba(16,185,129,0.35)] font-bold">All Connections</TabsTrigger>
              <TabsTrigger value="pending" className="shrink-0 rounded-xl data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border data-[state=active]:border-emerald-500/50 data-[state=active]:shadow-[0_0_20px_rgba(16,185,129,0.35)] font-bold relative">
                Pending
                {requests?.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500 text-black font-extrabold">{requests.length}</span>}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Global Creator Feed & Showcase */}
            <TabsContent value="showcase" className="mt-4 space-y-4">
              {/* Creator Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-purple-500/15 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-400" /> Share Your Gameplay & Promote Your Content!
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Post your highlights, clips, streams, and gamer achievements so all creators across GamerZ Hub can see them!
                  </p>
                </div>
                <Link href="/feed">
                  <Button variant="gradient" size="sm" className="h-9 px-4 text-xs font-bold rounded-xl shrink-0 gap-1.5" animate>
                    <Share2 className="h-3.5 w-3.5" /> Post Highlight
                  </Button>
                </Link>
              </div>

              {/* Feed Posts */}
              {postsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-card/20 rounded-2xl border border-white/5 space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-16 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : communityPosts.length === 0 ? (
                <Card variant="glass">
                  <CardContent className="p-6 text-center">
                    <EmptyState
                      title="No community posts yet"
                      description="Be the first creator to share a post or video highlight with the GamerZ Hub community!"
                      icon={Flame}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {communityPosts.map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="online" className="mt-3">
              <Card variant="glass">
                <CardContent className="p-4 space-y-1">
                  {friends?.filter((f: any) => f.presence === 'ONLINE').length === 0 ? (
                    <div className="py-6">
                      <EmptyState 
                        title="No friends online" 
                        description="None of your connections are active right now. Check back later!" 
                        icon={Users} 
                      />
                    </div>
                  ) : friends?.filter((f: any) => f.presence === 'ONLINE').map((friend: any) => (
                    <FriendRow key={friend.id} friend={friend} onRemove={removeFriend.mutate} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all" className="mt-3">
              <Card variant="glass">
                <CardContent className="p-4 space-y-1">
                  {friends?.length === 0 ? (
                    <div className="py-6">
                      <EmptyState 
                        title="Your network is empty" 
                        description="Connect with suggested gamers or search for usernames to grow your network!" 
                        icon={Users} 
                      />
                    </div>
                  ) : friends?.map((friend: any) => (
                    <FriendRow key={friend.id} friend={friend} onRemove={removeFriend.mutate} />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="mt-3">
              <Card variant="glass">
                <CardContent className="p-4 space-y-2">
                  {requests?.length === 0 ? (
                    <div className="py-6">
                      <EmptyState 
                        title="All caught up" 
                        description="You have no pending connection requests at the moment." 
                        icon={UserPlus} 
                      />
                    </div>
                  ) : requests?.map((req: any) => (
                    <motion.div key={req.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-all border border-border/30" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={req.sender?.profile?.avatar || ''} />
                          <AvatarFallback className="text-xs">{getInitials(req.sender?.profile?.username || 'U')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground">{req.sender?.profile?.displayName || req.sender?.profile?.username}</p>
                          <p className="text-xs text-muted-foreground">Sent you a friend request</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 ml-2">
                        <Button variant="gradient" size="sm" className="gap-1 h-8 px-2 rounded-lg text-xs" onClick={() => acceptRequest.mutate(req.id)} animate><Check className="h-3.5 w-3.5" /> Accept</Button>
                        <Button variant="outline" size="sm" className="gap-1 h-8 px-2 rounded-lg text-xs" onClick={() => rejectRequest.mutate(req.id)}><X className="h-3.5 w-3.5" /> Reject</Button>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Suggested Sidebar Panel */}
        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground">
                <Sparkles className="h-4 w-4 text-emerald-400" /> Suggested Creators & Gamers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {filteredSuggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No suggestions available right now</p>
              ) : (
                filteredSuggestions.map((p: any) => {
                  const mutualsCount = (p.username.charCodeAt(0) % 3) + 1;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 border-b border-border/10 pb-3 last:border-b-0 last:pb-0">
                      <Link href={`/profile/${p.username}`} className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Avatar className="h-9 w-9 border border-border/40">
                          <AvatarImage src={p.avatar || ''} />
                          <AvatarFallback className="text-[10px]">{getInitials(p.username)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate hover:text-emerald-400 transition-colors">{p.displayName || p.username}</p>
                          <p className="text-[10px] text-muted-foreground">@{p.username}</p>
                          <p className="text-[9px] text-emerald-400/80 mt-0.5">{mutualsCount} mutual connection{mutualsCount > 1 ? 's' : ''}</p>
                        </div>
                      </Link>
                      <Button 
                        variant="gradient" 
                        size="sm" 
                        className="h-7 px-2.5 text-[10px] rounded-lg shrink-0" 
                        onClick={() => sendRequest.mutate(p.userId)}
                        disabled={sendRequest.isPending}
                        animate
                      >
                        Connect
                      </Button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FriendRow({ friend, onRemove }: { friend: any; onRemove: (id: string) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <motion.div className="flex items-center justify-between p-3 rounded-xl hover:bg-accent/50 transition-all group border border-transparent hover:border-border/30" whileHover={{ x: 2 }}>
      <Link href={`/profile/${friend.profile?.username}`} className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={friend.profile?.avatar || ''} />
            <AvatarFallback className="text-xs">{getInitials(friend.profile?.username || 'U')}</AvatarFallback>
          </Avatar>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${STATUS_COLORS[friend.presence || 'OFFLINE']}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate hover:text-emerald-400 transition-colors text-foreground">{friend.profile?.displayName || friend.profile?.username}</p>
          {friend.profile?.bio && <p className="text-xs text-muted-foreground truncate max-w-[240px] mt-0.5">{friend.profile.bio}</p>}
          <p className="text-[10px] text-muted-foreground capitalize mt-0.5">{friend.presence?.toLowerCase() || 'Offline'}</p>
        </div>
      </Link>
      <div className="flex items-center gap-1 shrink-0 flex md:hidden group-hover:flex ml-3">
        <Link href={`/messages?userId=${friend.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-400 rounded-xl">
            <MessageCircle className="h-4 w-4" />
          </Button>
        </Link>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-xl">
              <UserX className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[90%] max-w-sm rounded-2xl p-6 bg-background border border-border/60">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-center text-foreground">Remove this friend?</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" size="sm" className="flex-1 h-10 rounded-xl" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 h-10 rounded-xl" onClick={() => { onRemove(friend.id); setConfirmOpen(false); }}>
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
