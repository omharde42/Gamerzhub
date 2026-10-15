'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Search,
  Pin,
  Trash2,
  Heart,
  MessageCircle,
  Calendar,
  AlertTriangle,
  ExternalLink,
  Shield,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FeedPost {
  id: string;
  type: string;
  content: string;
  media: string[];
  tags: string[];
  isPinned: boolean;
  isPublished: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile?: {
      username: string;
      displayName?: string;
      avatar?: string;
    };
  };
  _count: {
    comments: number;
    likes: number;
  };
}

export function AdminFeedTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-feed-posts', page, search, filter],
    queryFn: async () => {
      const res = await api.get('/admin/feed/posts', {
        params: {
          page,
          limit: 15,
          search: search || undefined,
          filter: filter !== 'ALL' ? filter : undefined,
        },
      });
      return res.data;
    },
  });

  const posts: FeedPost[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Delete Post Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/feed/posts/${id}`, {
        data: { reason: 'Admin moderation removal' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feed-posts'] });
      toast.success('Post removed by administrator');
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to remove post');
    },
  });

  // Toggle Pin Mutation
  const togglePinMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/feed/posts/${id}/toggle-pin`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feed-posts'] });
      toast.success(res.data.message || 'Pin status updated');
    },
    onError: () => toast.error('Failed to update pin status'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Community Feed Moderation</h2>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {meta.total} Posts
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor gamer posts, pin official announcements, and remove toxic or spam content
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by post text or author username..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 pl-9 text-xs bg-card/40 border-border/60"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-lg text-xs bg-card border border-border/60 text-foreground focus:outline-none"
        >
          <option value="ALL">All Posts</option>
          <option value="PINNED">Pinned Only</option>
          <option value="PUBLISHED">Published Feed</option>
        </select>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card/40">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/20">
          <CardContent className="p-12 text-center space-y-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No posts found</h3>
            <p className="text-xs text-muted-foreground">No community activity matching the current criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card
              key={post.id}
              className={`border transition-all ${
                post.isPinned
                  ? 'border-primary/40 bg-primary/[0.02] shadow-sm'
                  : 'border-border/60 bg-card/40 hover:border-border'
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Author */}
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary overflow-hidden">
                      {post.user.profile?.avatar ? (
                        <img
                          src={post.user.profile.avatar}
                          alt={post.user.profile.username || 'user'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        post.user.profile?.username?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {post.user.profile?.displayName || post.user.profile?.username || 'Anonymous Gamer'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          @{post.user.profile?.username || post.user.email.split('@')[0]}
                        </span>
                        {post.isPinned && (
                          <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30 gap-1 py-0">
                            <Pin className="h-2.5 w-2.5 fill-current" /> Pinned
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => togglePinMutation.mutate(post.id)}
                      disabled={togglePinMutation.isPending}
                      className="h-8 px-2 text-xs"
                      title={post.isPinned ? 'Unpin Post' : 'Pin Post to Top'}
                    >
                      <Pin
                        className={`h-3.5 w-3.5 ${
                          post.isPinned ? 'text-primary fill-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </Button>

                    {deleteConfirmId === post.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(post.id)}
                          disabled={deleteMutation.isPending}
                          className="h-7 px-2 text-[10px]"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          className="h-7 px-1.5 text-[10px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(post.id)}
                        className="h-8 px-2 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Delete Post"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap pl-11">
                  {post.content}
                </p>

                {/* Media Preview */}
                {post.media && post.media.length > 0 && (
                  <div className="pl-11 flex items-center gap-2 overflow-x-auto py-1">
                    {post.media.map((m, idx) => (
                      <a
                        key={idx}
                        href={m}
                        target="_blank"
                        rel="noreferrer"
                        className="h-16 w-24 rounded-lg overflow-hidden border border-border/60 bg-muted/20 shrink-0 relative block"
                      >
                        <img
                          src={m}
                          alt="Media attachment"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Engagement Stats */}
                <div className="pl-11 flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 text-rose-500/70" /> {post._count.likes} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3 text-sky-500/70" /> {post._count.comments} comments
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {meta.totalPages} ({meta.total} total posts)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
