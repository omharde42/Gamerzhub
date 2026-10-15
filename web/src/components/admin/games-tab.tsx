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
  AlertCircle, Shield, User, Layers, Check, X
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AdminGamesTab() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'registry' | 'requests' | 'identities'>('registry');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  // Gamer identities state
  const [identityPage, setIdentityPage] = useState(1);
  const [identityVerifiedFilter, setIdentityVerifiedFilter] = useState('ALL');

  // Query Supported Games Registry
  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ['admin-games-registry'],
    queryFn: () => api.get('/admin/games').then((r) => r.data.data),
    enabled: subTab === 'registry',
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

  // Approve Game Request
  const approveGame = useMutation({
    mutationFn: (id: string) =>
      api.post(`/game-requests/${id}/approve`, { adminNote: adminNotes[id] || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-game-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Game request approved!');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to approve'),
  });

  // Reject Game Request
  const rejectGame = useMutation({
    mutationFn: (id: string) =>
      api.post(`/game-requests/${id}/reject`, { adminNote: adminNotes[id] || '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-game-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Gamer identity verification updated');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update verification'),
  });

  const canonicalGames = gamesData?.canonical || [];
  const identities = identitiesData?.data || [];
  const idMeta = identitiesData?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-4">
      {/* Sub navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          onClick={() => setSubTab('registry')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'registry'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Supported Games Registry
        </button>
        <button
          onClick={() => setSubTab('requests')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'requests'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Community Game Requests
        </button>
        <button
          onClick={() => setSubTab('identities')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'identities'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Gamer Identities &amp; UIDs
        </button>
      </div>

      {/* Registry Tab */}
      {subTab === 'registry' && (
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" /> Supported Game Engine Registry
              </h3>
              <p className="text-xs text-muted-foreground">
                Canonical list of platform-integrated titles with identity schemas and matchmaking models.
              </p>
            </div>

            {gamesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {canonicalGames.map((game: any) => (
                  <div
                    key={game.gameId}
                    className="p-3.5 rounded-2xl bg-card/30 border border-border/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{game.displayName}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {game.category}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>
                        ID Schema: <span className="font-mono text-primary font-bold">{game.identityType}</span>
                      </div>
                      <div>
                        Verification: <span className="text-foreground">{game.verificationCapability}</span>
                      </div>
                      <div>
                        Matchmaking: <span className="text-foreground">{game.teamModel || 'SQUAD'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Platforms:</span>
                      <span className="font-semibold text-foreground">
                        {(game.platforms || []).join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Community Game Requests Tab */}
      {subTab === 'requests' && (
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-primary" /> Community Game Library Submissions
              </h3>
              <p className="text-xs text-muted-foreground">
                Review user-requested titles for inclusion in platform matchmaking and stats.
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
                        {req.logo ? (
                          <img
                            src={req.logo}
                            alt={req.gameName}
                            className="h-12 w-12 rounded-xl object-cover border border-primary/20 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 text-primary">
                            <Gamepad2 className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground">{req.gameName}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            <span className="font-semibold text-primary">{req.genre}</span>
                            <span>•</span>
                            <span>by {req.user?.profile?.username || 'Community Gamer'}</span>
                            <span>•</span>
                            <span>{formatDate(req.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <Input
                              value={adminNotes[req.id] || ''}
                              onChange={(e) =>
                                setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                              }
                              placeholder="Review note (optional)"
                              className="h-8 text-xs w-44"
                            />
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1 text-xs"
                              onClick={() => approveGame.mutate(req.id)}
                              disabled={approveGame.isPending}
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 gap-1 text-xs"
                              onClick={() => rejectGame.mutate(req.id)}
                              disabled={rejectGame.isPending}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        ) : (
                          <Badge
                            variant="outline"
                            className={`text-xs font-semibold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                          >
                            {req.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gamer Identities & UIDs Sub-Tab */}
      {subTab === 'identities' && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by UID, IGN, gamer username..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setIdentityPage(1);
                  }}
                  className="pl-9 h-8 text-xs border-border/60"
                />
              </div>

              <Select
                value={identityVerifiedFilter}
                onValueChange={(val) => {
                  setIdentityVerifiedFilter(val);
                  setIdentityPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-36 border-border/60">
                  <SelectValue placeholder="All Verification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Verification</SelectItem>
                  <SelectItem value="true">Verified UIDs</SelectItem>
                  <SelectItem value="false">Unverified UIDs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {idLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : identities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Gamepad2 className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs">No gamer identities found matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-card/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3">Gamer</th>
                      <th className="py-2.5 px-3">Game</th>
                      <th className="py-2.5 px-3">In-Game Name (IGN)</th>
                      <th className="py-2.5 px-3">Game UID</th>
                      <th className="py-2.5 px-3">Rank</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {identities.map((idRec: any) => (
                      <tr key={idRec.id} className="hover:bg-card/30">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-foreground">
                            {idRec.user?.profile?.displayName || idRec.user?.profile?.username || 'Gamer'}
                          </span>
                          <div className="text-[10px] text-muted-foreground">{idRec.user?.email}</div>
                        </td>

                        <td className="py-2.5 px-3 font-semibold uppercase text-primary">
                          {idRec.game}
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {idRec.inGameName || 'N/A'}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-muted-foreground">
                          {idRec.gameUid || 'N/A'}
                        </td>

                        <td className="py-2.5 px-3 text-muted-foreground">
                          {idRec.rank || 'Unranked'}
                        </td>

                        <td className="py-2.5 px-3">
                          {idRec.verified ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">
                              VERIFIED
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-muted-foreground">
                              UNVERIFIED
                            </Badge>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-border/60"
                            onClick={() =>
                              verifyIdentity.mutate({
                                id: idRec.id,
                                verified: !idRec.verified,
                              })
                            }
                            disabled={verifyIdentity.isPending}
                          >
                            <Sparkles className="h-3 w-3 mr-1 text-primary" />
                            {idRec.verified ? 'Revoke' : 'Approve'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
