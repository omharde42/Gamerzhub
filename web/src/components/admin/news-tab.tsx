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
  Newspaper,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  ExternalLink,
  Loader2,
  Calendar,
  User,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NewsArticle {
  id: string;
  title: string;
  slug?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
  category: string;
  author?: string;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
}

const CATEGORIES = ['Esports', 'Game Updates', 'Community', 'Tournaments', 'Patch Notes', 'Guides'];

export function AdminNewsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    imageUrl: '',
    source: 'GamerZ Hub Editorial',
    sourceUrl: '',
    category: 'Esports',
    author: 'GamerZ Hub Admin',
    isFeatured: false,
    isPublished: true,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-news', page, search, categoryFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get('/admin/news', {
        params: {
          page,
          limit: 12,
          search: search || undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        },
      });
      return res.data;
    },
  });

  const articles: NewsArticle[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      if (editingArticle) {
        return api.put(`/admin/news/${editingArticle.id}`, formData);
      }
      return api.post('/admin/news', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(editingArticle ? 'Article updated successfully!' : 'Article published successfully!');
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save news article');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/news/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success('News article removed');
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete article');
    },
  });

  // Toggle Publish Mutation
  const togglePublishMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/news/${id}/toggle-publish`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(res.data.message || 'Status updated');
    },
    onError: () => toast.error('Failed to toggle publication status'),
  });

  // Toggle Featured Mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/news/${id}/toggle-feature`);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-news'] });
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(res.data.message || 'Featured state updated');
    },
    onError: () => toast.error('Failed to toggle featured status'),
  });

  function openCreateModal() {
    setEditingArticle(null);
    setFormData({
      title: '',
      summary: '',
      content: '',
      imageUrl: '',
      source: 'GamerZ Hub Editorial',
      sourceUrl: '',
      category: 'Esports',
      author: 'GamerZ Hub Admin',
      isFeatured: false,
      isPublished: true,
    });
    setIsModalOpen(true);
  }

  function openEditModal(art: NewsArticle) {
    setEditingArticle(art);
    setFormData({
      title: art.title,
      summary: art.summary || '',
      content: art.content || '',
      imageUrl: art.imageUrl || '',
      source: art.source || 'GamerZ Hub Editorial',
      sourceUrl: art.sourceUrl || '',
      category: art.category || 'Esports',
      author: art.author || 'GamerZ Hub Admin',
      isFeatured: Boolean(art.isFeatured),
      isPublished: Boolean(art.isPublished),
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingArticle(null);
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">News &amp; Editorial CMS</h2>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {meta.total} Articles
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, publish, feature, or remove gaming news across the GamerZ Hub platform
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 h-9 text-xs font-semibold shrink-0">
          <Plus className="h-4 w-4" /> Add News Article
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search headline, summary, or author..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 pl-9 text-xs bg-card/40 border-border/60"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg text-xs bg-card border border-border/60 text-foreground focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 rounded-lg text-xs bg-card border border-border/60 text-foreground focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="DRAFT">Drafts Only</option>
            <option value="FEATURED">Featured Only</option>
          </select>
        </div>
      </div>

      {/* Articles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card/40">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/20">
          <CardContent className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Newspaper className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">No news articles found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {search || categoryFilter !== 'ALL'
                  ? 'No articles match your current filters. Try resetting the search or category.'
                  : 'Start publishing official gaming news, patch notes, and esports coverage for your community.'}
              </p>
            </div>
            <Button onClick={openCreateModal} variant="outline" size="sm" className="gap-2 h-8 text-xs mt-2">
              <Plus className="h-3.5 w-3.5" /> Add First Article
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((art) => (
            <Card
              key={art.id}
              className={`border transition-all flex flex-col justify-between overflow-hidden ${
                art.isFeatured
                  ? 'border-amber-500/30 bg-amber-500/[0.02] shadow-sm shadow-amber-500/5'
                  : 'border-border/60 bg-card/40 hover:border-border'
              }`}
            >
              <div>
                {/* Thumbnail / Header */}
                <div className="relative h-36 w-full bg-muted/40 overflow-hidden border-b border-border/40">
                  {art.imageUrl ? (
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50">
                      <Newspaper className="h-8 w-8 mb-1" />
                      <span className="text-[10px]">No Cover Image</span>
                    </div>
                  )}

                  {/* Floating Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] bg-card/90 backdrop-blur-sm border-border/80">
                      {art.category}
                    </Badge>
                    {art.isFeatured && (
                      <Badge className="text-[10px] bg-amber-500 text-black border-none font-bold gap-1 shadow-sm">
                        <Star className="h-2.5 w-2.5 fill-current" /> Featured
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] backdrop-blur-sm ${
                        art.isPublished
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                      }`}
                    >
                      {art.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug hover:text-primary transition-colors">
                    {art.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {art.summary || art.content?.slice(0, 140) || 'No summary available.'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1 truncate max-w-[140px]">
                      <User className="h-3 w-3 shrink-0 text-primary" /> {art.author || art.source}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePublishMutation.mutate(art.id)}
                    disabled={togglePublishMutation.isPending}
                    title={art.isPublished ? 'Unpublish to Draft' : 'Publish to Live'}
                    className="h-8 px-2 text-xs"
                  >
                    {art.isPublished ? (
                      <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleFeaturedMutation.mutate(art.id)}
                    disabled={toggleFeaturedMutation.isPending}
                    title={art.isFeatured ? 'Unfeature' : 'Feature on Top'}
                    className="h-8 px-2 text-xs"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        art.isFeatured ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'
                      }`}
                    />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditModal(art)}
                    title="Edit Article"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div>
                  {deleteConfirmId === art.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(art.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 px-2 text-[10px]"
                      >
                        Confirm Delete
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
                      onClick={() => setDeleteConfirmId(art.id)}
                      title="Delete Article"
                      className="h-8 px-2 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {meta.totalPages} ({meta.total} total articles)
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

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/80 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  {editingArticle ? 'Edit News Article' : 'Publish New Gaming Headline'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4"
            >
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Article Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Valorant Patch 9.08: Complete Agent Buffs & Map Changes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xs bg-muted/20"
                />
              </div>

              {/* Category & Author Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg text-xs bg-muted/20 border border-border text-foreground focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Author / Byline
                  </label>
                  <Input
                    placeholder="e.g. GamerZ Hub Editorial"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="text-xs bg-muted/20"
                  />
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Cover Image URL
                </label>
                <Input
                  placeholder="https://images.unsplash.com/... or CDN link"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="text-xs bg-muted/20"
                />
                {formData.imageUrl && (
                  <div className="mt-2 h-24 w-full rounded-lg overflow-hidden border border-border/60 bg-muted/30">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Summary / Excerpt */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Summary / Excerpt
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief synopsis shown on cards and previews..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full p-2.5 rounded-lg text-xs bg-muted/20 border border-border text-foreground focus:outline-none"
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Full Article Body
                </label>
                <textarea
                  rows={6}
                  placeholder="Full article content, breakdown, patch notes, or tournament announcement details..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2.5 rounded-lg text-xs bg-muted/20 border border-border text-foreground focus:outline-none"
                />
              </div>

              {/* Source Link (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Source Name
                  </label>
                  <Input
                    placeholder="e.g. GamerZ Hub / Official Steam / Riot"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="text-xs bg-muted/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    External / Reference URL
                  </label>
                  <Input
                    placeholder="https://..."
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                    className="text-xs bg-muted/20"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2 border-t border-border/60">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Feature on Top of News Feed ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Publish Immediately (Live to Public)</span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveMutation.isPending}
                  className="h-9 text-xs font-semibold gap-1.5"
                >
                  {saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingArticle ? 'Save Changes' : 'Publish Article'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
