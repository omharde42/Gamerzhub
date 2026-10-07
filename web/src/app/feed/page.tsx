'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Gamepad2, RefreshCw, Newspaper, ExternalLink, Loader2, Zap, Sparkles } from 'lucide-react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { getSharedSocket } from '@/lib/socket-client';
import { getInitials } from '@/lib/utils';
import { PostCard } from '@/components/post/post-card';
import { PostCardSkeleton } from '@/components/post/post-card-skeleton';
import { CreatePost } from '@/components/post/create-post';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import ExistingUserProfileUpgradeModal from '@/components/profile/ExistingUserProfileUpgradeModal';

const SUGGESTED_PLAYERS = [
  { username: 'ProGamerX', rank: 'Diamond', role: 'Entry Fragger', game: 'Valorant' },
  { username: 'AceStriker', rank: 'Master', role: 'AWPer', game: 'CS2' },
  { username: 'ShadowBlade', rank: 'Platinum', role: 'Support', game: 'League of Legends' },
];

export default function FeedPage() {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerInstanceRef = useRef<IntersectionObserver | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['feed', filter],
    queryFn: ({ pageParam = 1 }) =>
      api.get(`/feed?page=${pageParam}&limit=10${filter !== 'all' ? `&hashtag=${filter}` : ''}`).then(r => r.data),
    getNextPageParam: (lastPage) => {
      const meta = lastPage?.meta;
      return meta?.hasNext ? meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const posts = data?.pages.flatMap((page: any) => page.data || []) || [];

  const { data: trending, isLoading: isTrendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => api.get('/posts/trending').then(r => r.data.data).catch(() => []),
  });

  const { data: newsData, isLoading: isNewsLoading } = useQuery({
    queryKey: ['gaming-news'],
    queryFn: () => api.get('/news').then(r => r.data.data).catch(() => []),
    refetchInterval: 60000,
  });

  useEffect(() => {
    const socket = getSharedSocket();
    if (!socket) return;

    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleNewPost = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['feed'] });
          throttleTimeout = null;
        }, 2000);
      }
    };

    socket.on('post:new', handleNewPost);

    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      socket.off('post:new', handleNewPost);
    };
  }, [accessToken, queryClient]);

  // Stable intersection observer for infinite scroll - avoids re-creating on every render
  useEffect(() => {
    // Disconnect any previous instance
    if (observerInstanceRef.current) {
      observerInstanceRef.current.disconnect();
    }

    observerInstanceRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { 
        rootMargin: '200px 0px',
        threshold: 0,
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observerInstanceRef.current.observe(sentinel);
    }

    return () => {
      observerInstanceRef.current?.disconnect();
    };
    // Only re-create observer when these critical values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNextPage, fetchNextPage]);

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Feed
          </h1>
          <p className="text-xs text-muted-foreground">See what the community is talking about</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <CreatePost />
          </motion.div>
          {isLoading ? (
            <PostCardSkeleton count={3} withMedia />
          ) : (
            <>
              {posts.map((post: any, i: number) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <PostCard post={post} onDelete={(id) => refetch()} priority={i < 2} />
                </motion.div>
              ))}
              
              <div ref={sentinelRef} className="py-4">
                {isFetchingNextPage ? (
                  <PostCardSkeleton count={1} withMedia />
                ) : posts.length > 0 && !hasNextPage ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-center">
                    <div className="w-10 h-[1px] bg-border/60" />
                    <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest">
                      You're all caught up
                    </span>
                    <div className="w-10 h-[1px] bg-border/60" />
                  </div>
                ) : (
                  <div className="h-4" /> /* Spacer for initial observer trigger */
                )}
              </div>
            </>
          )}
          {posts.length === 0 && !isLoading && (
            <Card variant="glass">
              <CardContent className="p-10 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Newspaper className="h-8 w-8 text-primary animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">No posts yet</h3>
                  <p className="text-xs text-muted-foreground max-w-xs">Be the first to share your gameplay, clips, or thoughts with the community!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4 hidden lg:block">
          {/* Trending Topics */}
          <Card variant="glass" className="border-border/60">
            <CardHeader className="pb-2">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-foreground"><Zap className="h-4 w-4 text-indigo-500" /> Trending Topics</h2>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {isTrendingLoading ? (
                <div className="space-y-2 pt-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-3 flex-1 max-w-[100px]" />
                      </div>
                      <Skeleton className="h-4 w-8 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {trending?.slice(0, 8).map((h: any, i: number) => (
                    <button key={i} onClick={() => setFilter(h.name)} className={`w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-all text-left group ${filter === h.name ? 'bg-primary/5 text-primary border border-primary/20' : 'border border-transparent'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                        </span>
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">#{h.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">{h.count}</Badge>
                    </button>
                  ))}
                  {filter !== 'all' && (
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-2 text-muted-foreground h-9" onClick={() => setFilter('all')}>Clear filter</Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card variant="glass" className="border-border/60">
            <CardHeader className="pb-2">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-foreground"><Newspaper className="h-4 w-4 text-primary" /> Gaming News</h2>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {isNewsLoading ? (
                <div className="space-y-2 pt-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2">
                      <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-[60%]" />
                        <Skeleton className="h-2 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : newsData?.length > 0 ? newsData.map((article: any, i: number) => (
                <a key={i} href={article.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/10 transition-all group">
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    {article.image ? (
                      <img
                        src={article.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Gamepad2 className="h-5 w-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors leading-relaxed">{article.title}</p>
                    <p className="text-[10px] text-primary font-mono font-semibold mt-0.5">{article.source || 'Gaming News'}</p>
                  </div>
                </a>
              )) : (
                <>
                  {[
                    { title: 'ESL Pro League Season 20: Teams & Schedule Revealed', source: 'ESL Gaming' },
                    { title: 'Valorant Champions Tour 2026: New Format Announced', source: 'Riot Games' },
                    { title: 'CS2 Major Championship: Prize Pool Hits $2M', source: 'HLTV' },
                    { title: 'League of Legends World Championship 2026 Dates', source: 'Riot Games' },
                    { title: 'BGMI Pro Series Returns with ₹1 Crore Prize', source: 'Krafton' },
                  ].map((article, i) => (
                    <motion.div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-all cursor-pointer" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/15">
                        <Gamepad2 className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium line-clamp-2 leading-relaxed">{article.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{article.source}</p>
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
              <Link href="/news">
                <Button variant="ghost" size="sm" className="w-full text-xs gap-1 mt-1 text-muted-foreground h-9">
                  <ExternalLink className="h-3 w-3" /> View All News
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card variant="glass" className="border-border/60">
            <CardHeader className="pb-2">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-foreground"><Users className="h-4 w-4 text-primary" /> Suggested Players</h2>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {SUGGESTED_PLAYERS.map((p, i) => (
                <motion.div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-all cursor-pointer group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Avatar className="h-9 w-9 border border-border/40">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{getInitials(p.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{p.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.rank} &bull; {p.role}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-muted text-muted-foreground select-none">
                    <Gamepad2 className="h-3 w-3 shrink-0" /> {p.game}
                  </Badge>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Existing User Profile Upgrade Prompt */}
      <ExistingUserProfileUpgradeModal />
    </div>
  );
}
