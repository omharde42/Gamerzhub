'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Gamepad2, Search, CheckCircle2, XCircle, Loader2, Sparkles,
  AlertCircle, Shield, User, Users, Layers, Check, X, Plus, Edit2, Trash2,
  Globe, Eye, EyeOff
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

const GENRES = [
  'ALL', 'FPS', 'Battle Royale', 'MOBA', 'Strategy', 'Sports',
  'Racing', 'Fighting', 'Action', 'Sandbox', 'Tactical', 'Mobile', 'Other'
];

interface PlatformGame {
  id: string;
  name: string;
  slug: string;
  genre: string;
  category: string;
  description?: string;
  logo?: string;
  bannerUrl?: string;
  platforms: string[];
  modes: string[];
  isEnabled: boolean;
  isFeatured: boolean;
  totalPlayers?: number;
  sortOrder: number;
}

export function AdminGamesTab() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'catalog' | 'requests' | 'identities'>('catalog');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Gamer identities state
  const [identityPage, setIdentityPage] = useState(1);
  const [identityVerifiedFilter, setIdentityVerifiedFilter] = useState('ALL');

  // Add / Edit Game Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<PlatformGame | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    genre: 'Battle Royale',
    category: 'Popular',
    description: '',
    logo: '',
    bannerUrl: '',
    platforms: 'PC, Mobile',
    modes: 'Solo, Squad',
    isEnabled: true,
    isFeatured: false,
  });

  // Query Supported Games Catalog
  const { data: catalogGames, isLoading: catalogLoading } = useQuery<PlatformGame[]>({
    queryKey: ['admin-games-catalog'],
    queryFn: () => api.get('/admin/games/catalog').then((r) => r.data.data || []),
    enabled: subTab === 'catalog',
  });

  // Query Community Game Requests
  const { data: gameRequests, isLoading: grLoading } = useQuery({
    queryKey: ['admin-game-requests'],
    queryFn: () => api.get('/game-requests/all').then((r) => r.data.data || []),
    enabled: subTab === 'requests',
  });

  // Query Gamer Identities Queue
  const { data: identitiesData, isLoading: idLoading } = useQuery({
    queryKey: ['admin-gamer-identities', identityPage, identityVerifiedFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', identityPage.toString());
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (identityVerifiedFilter !== 'ALL') params.append('verified', identityVerifiedFilter);

      const res = await api.get(`/admin/gamer-identities?${params.toString()}`);
      return res.data;
    },
    enabled: subTab === 'identities',
  });

  // Toggle Game Enabled / Disabled
  const toggleGameMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/games/${id}/toggle`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-games-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['approved-games'] });
      toast.success(res.data.message || 'Game status updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to toggle game'),
  });

  // Save (Create or Update) Game
  const saveGameMutation = useMutation({
    mutationFn: (payload: any) => {
      const body = {
        ...payload,
        platforms: typeof payload.platforms === 'string'
          ? payload.platforms.split(',').map((s: string) => s.trim()).filter(Boolean)
          : payload.platforms,
        modes: typeof payload.modes === 'string'
          ? payload.modes.split(',').map((s: string) => s.trim()).filter(Boolean)
          : payload.modes,
      };

      if (editingGame) {
        return api.put(`/admin/games/${editingGame.id}`, body);
      }
      return api.post('/admin/games', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['approved-games'] });
      setIsModalOpen(false);
      setEditingGame(null);
      resetForm();
      toast.success(editingGame ? 'Game updated successfully!' : 'New game added to website!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save game'),
  });

  // Delete Game
  const deleteGameMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/games/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-games-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['approved-games'] });
      setDeleteConfirmId(null);
      toast.success('Game removed from catalog');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete game'),
  });

  // Approve Game Request
  const approveGame = useMutation({
    mutationFn: (id: string) =>
      api.post(`/game-requests/${id}/approve`, { adminNote: adminNotes[id] || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-game-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-games-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['approved-games'] });
      toast.success('Game request approved and added!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve'),
  });

  // Reject Game Request
  const rejectGame = useMutation({
    mutationFn: (id: string) =>
      api.post(`/game-requests/${id}/reject`, { adminNote: adminNotes[id] || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-game-requests'] });
      toast.success('Game request rejected');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject'),
  });

  // Verify Gamer Identity Mutation
  const verifyIdentity = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      api.patch(`/admin/gamer-identities/${id}/verify`, { verified }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gamer-identities'] });
      toast.success('Gamer identity verification updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update verification'),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      genre: 'Battle Royale',
      category: 'Popular',
      description: '',
      logo: '',
      bannerUrl: '',
      platforms: 'PC, Mobile',
      modes: 'Solo, Squad',
      isEnabled: true,
      isFeatured: false,
    });
  };

  const openCreateModal = () => {
    setEditingGame(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (game: PlatformGame) => {
    setEditingGame(game);
    setFormData({
      name: game.name,
      slug: game.slug,
      genre: game.genre,
      category: game.category,
      description: game.description || '',
      logo: game.logo || '',
      bannerUrl: game.bannerUrl || '',
      platforms: (game.platforms || []).join(', '),
      modes: (game.modes || []).join(', '),
      isEnabled: game.isEnabled,
      isFeatured: game.isFeatured,
    });
    setIsModalOpen(true);
  };

  // Filter Catalog Games
  const filteredCatalog = (catalogGames || []).filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.genre.toLowerCase().includes(search.toLowerCase());
    const matchesGenre =
      genreFilter === 'ALL' || g.genre.toLowerCase() === genreFilter.toLowerCase();
    return matchesSearch && matchesGenre;
  });

  const enabledCount = (catalogGames || []).filter((g) => g.isEnabled).length;
  const disabledCount = (catalogGames || []).filter((g) => !g.isEnabled).length;

  return (
    <div className="space-y-6">
      {/* Sub navigation pills */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-muted/40 border border-border/50 max-w-fit">
        <button
          onClick={() => setSubTab('catalog')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            subTab === 'catalog'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gamepad2 className="h-3.5 w-3.5" />
          Website Games Catalog
          <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
            {catalogGames?.length || 0}
          </Badge>
        </button>
        <button
          onClick={() => setSubTab('requests')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            subTab === 'requests'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Community Game Requests
          {gameRequests?.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
              {gameRequests.length}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setSubTab('identities')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            subTab === 'identities'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Gamer Identities &amp; UIDs
        </button>
      </div>

      {/* ─── Sub-Tab 1: Games Catalog CMS ──────────────────────────────────── */}
      {subTab === 'catalog' && (
        <div className="space-y-4">
          {/* Top Actions & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 p-4 rounded-2xl border border-border/50">
            <div>
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" /> Website Games Management
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control which games appear on GamerZ Hub. Add new games, toggle live availability, or edit details.
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] font-medium">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {enabledCount} Active on Website
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  {disabledCount} Hidden / Disabled
                </span>
              </div>
            </div>

            <Button
              onClick={openCreateModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 shrink-0 h-10 px-4 rounded-xl shadow-md shadow-primary/20"
            >
              <Plus className="h-4 w-4" /> Add New Game
            </Button>
          </div>

          {/* Search & Genre Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search games by name or genre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 text-xs h-10 rounded-xl bg-card/50"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground shrink-0 font-medium">Genre:</span>
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger className="w-full sm:w-44 text-xs h-10 rounded-xl bg-card/50">
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g} className="text-xs">
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Games Grid */}
          {catalogLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2 bg-card/20 rounded-2xl border border-dashed border-border/60 p-6">
              <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="font-bold text-foreground text-sm">No games matched your search</p>
              <p className="text-xs">Try clearing your filters or click "Add New Game" above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCatalog.map((game) => (
                <div
                  key={game.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3.5 relative overflow-hidden ${
                    game.isEnabled
                      ? 'bg-card/40 border-border/60 hover:border-primary/40 shadow-sm'
                      : 'bg-card/20 border-dashed border-border/40 opacity-75'
                  }`}
                >
                  {/* Top Bar: Icon/Logo, Title, and Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 overflow-hidden">
                        {game.logo ? (
                          <img src={game.logo} alt={game.name} className="w-full h-full object-cover" />
                        ) : (
                          <Gamepad2 className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-sm text-foreground truncate">{game.name}</h4>
                          {game.isFeatured && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1 py-0">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">{game.genre}</p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 font-bold shrink-0 ${
                        game.isEnabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border/50'
                      }`}
                    >
                      {game.isEnabled ? 'Live on Website' : 'Hidden'}
                    </Badge>
                  </div>

                  {/* Platforms & Modes */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Platforms:</span>
                      <span className="font-semibold text-foreground">
                        {(game.platforms || []).join(', ') || 'Any'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Modes:</span>
                      <span className="font-semibold text-foreground">
                        {(game.modes || []).join(', ') || 'Squad'}
                      </span>
                    </div>
                    {typeof game.totalPlayers === 'number' && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/30">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-primary" /> Active Profiles:
                        </span>
                        <span className="font-bold text-foreground font-mono">{game.totalPlayers}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                    <Button
                      variant={game.isEnabled ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleGameMutation.mutate(game.id)}
                      disabled={toggleGameMutation.isPending}
                      className={`h-8 text-xs font-bold gap-1.5 flex-1 ${
                        game.isEnabled
                          ? 'border-border/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {game.isEnabled ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hide from Site
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Enable on Site
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(game)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Edit Game"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(game.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                      title="Delete Game"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Sub-Tab 2: Community Game Requests ────────────────────────────── */}
      {subTab === 'requests' && (
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" /> Community Game Library Submissions
              </h3>
              <p className="text-xs text-muted-foreground">
                Review titles requested by players for inclusion into GamerZ Hub platform.
              </p>
            </div>

            {grLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : !gameRequests || gameRequests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="font-semibold text-foreground text-sm">No game submissions</p>
                <p className="text-xs">No pending game addition requests from users.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameRequests.map((req: any) => {
                  const isPending = req.status === 'PENDING';
                  return (
                    <div
                      key={req.id}
                      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                        isPending
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : req.status === 'APPROVED'
                          ? 'border-emerald-500/20 bg-emerald-500/5'
                          : 'border-red-500/20 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-card border flex items-center justify-center shrink-0">
                          {req.logo ? (
                            <img src={req.logo} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <Gamepad2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground truncate">{req.gameName}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {req.genre}
                            </Badge>
                            <Badge
                              className={`text-[9px] px-1.5 py-0 ${
                                isPending
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : req.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}
                            >
                              {req.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                            <span>Requested by: @{req.user?.profile?.username || 'User'}</span>
                            <span>•</span>
                            <span>{formatDate(req.createdAt)}</span>
                          </div>
                          {req.adminNote && (
                            <p className="text-[11px] text-foreground/80 mt-1 italic">
                              Admin Note: {req.adminNote}
                            </p>
                          )}
                        </div>
                      </div>

                      {isPending && (
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto shrink-0">
                          <Input
                            placeholder="Add approval / rejection note..."
                            value={adminNotes[req.id] || ''}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                            }
                            className="text-xs h-8 w-full sm:w-56"
                          />
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              onClick={() => approveGame.mutate(req.id)}
                              disabled={approveGame.isPending}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 font-semibold flex-1 sm:flex-none"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectGame.mutate(req.id)}
                              disabled={rejectGame.isPending}
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs h-8 px-3 font-semibold flex-1 sm:flex-none"
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Sub-Tab 3: Gamer Identities & UIDs ────────────────────────────── */}
      {subTab === 'identities' && (
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> Gamer UIDs &amp; Identity Verification
                </h3>
                <p className="text-xs text-muted-foreground">
                  Verify game UIDs and linked gamer profiles submitted by users.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Select value={identityVerifiedFilter} onValueChange={setIdentityVerifiedFilter}>
                  <SelectTrigger className="w-32 text-xs h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All</SelectItem>
                    <SelectItem value="false" className="text-xs">Unverified</SelectItem>
                    <SelectItem value="true" className="text-xs">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {idLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : !identitiesData?.data?.items || identitiesData.data.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Shield className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="font-semibold text-foreground text-sm">No identities found</p>
                <p className="text-xs">No gamer profiles match the current filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {identitiesData.data.items.map((idRec: any) => (
                  <div
                    key={idRec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/50 bg-card/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={idRec.user?.profile?.avatar} />
                        <AvatarFallback className="text-xs">
                          {idRec.user?.profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground truncate">
                            @{idRec.user?.profile?.username || 'User'}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {idRec.game}
                          </Badge>
                          {idRec.verified ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0">
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] px-1.5 py-0">
                              Unverified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                          <span>UID: <strong className="text-foreground font-mono">{idRec.gameUid || 'None'}</strong></span>
                          <span>•</span>
                          <span>IGN: <strong className="text-foreground">{idRec.inGameName || 'N/A'}</strong></span>
                          {idRec.rank && (
                            <>
                              <span>•</span>
                              <span>Rank: <strong className="text-primary">{idRec.rank}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={idRec.verified ? 'outline' : 'default'}
                        onClick={() =>
                          verifyIdentity.mutate({ id: idRec.id, verified: !idRec.verified })
                        }
                        disabled={verifyIdentity.isPending}
                        className={`text-xs h-7 px-3 font-semibold ${
                          idRec.verified
                            ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {idRec.verified ? 'Revoke Verification' : 'Verify Identity'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Add / Edit Game Modal ────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Gamepad2 className="h-5 w-5 text-primary" />
              {editingGame ? 'Edit Game Information' : 'Add New Game to Website'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingGame
                ? 'Update game catalog metadata, platforms, and visibility state.'
                : 'Enter game details to register it into GamerZ Hub platform catalog.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Game Name *</label>
                <Input
                  placeholder="e.g. Valorant, BGMI, GTA VI"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Genre *</label>
                <Input
                  placeholder="e.g. Battle Royale, FPS, MOBA"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Category</label>
                <Input
                  placeholder="e.g. Tactical Shooter, Popular"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Platforms (comma-separated)</label>
                <Input
                  placeholder="e.g. PC, Mobile, PlayStation, Xbox"
                  value={formData.platforms}
                  onChange={(e) => setFormData({ ...formData, platforms: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Game Modes (comma-separated)</label>
              <Input
                placeholder="e.g. Solo, Duo, Squad, Ranked, 5v5"
                value={formData.modes}
                onChange={(e) => setFormData({ ...formData, modes: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Logo / Icon URL (Optional)</label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Banner URL (Optional)</label>
                <Input
                  placeholder="https://example.com/banner.jpg"
                  value={formData.bannerUrl}
                  onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Description (Optional)</label>
              <textarea
                placeholder="Brief description of the game..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Visibility & Feature Switches */}
            <div className="p-3 rounded-xl bg-card/60 border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">Show on Website Immediately</p>
                <p className="text-[11px] text-muted-foreground">
                  If turned off, the game will be registered but hidden from public pages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.isEnabled}
                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
            </div>

            <div className="p-3 rounded-xl bg-card/60 border border-border flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">Mark as Featured Game</p>
                <p className="text-[11px] text-muted-foreground">Highlight on homepage &amp; games hero section.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveGameMutation.mutate(formData)}
              disabled={saveGameMutation.isPending || !formData.name || !formData.genre}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
            >
              {saveGameMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingGame ? 'Save Changes' : 'Publish Game'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Modal ────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base font-bold">
              <AlertCircle className="h-5 w-5" /> Remove Game from Catalog?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this game? It will be removed from platform catalogs. This action is logged.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && deleteGameMutation.mutate(deleteConfirmId)}
              disabled={deleteGameMutation.isPending}
              className="text-xs font-bold gap-1.5"
            >
              {deleteGameMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
