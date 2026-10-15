'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Trophy, Search, Eye, Loader2, AlertCircle, Calendar,
  Clock, CheckCircle2, XCircle, AlertTriangle, Users, Ban, Swords
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AdminTournamentsTab() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [gameFilter, setGameFilter] = useState('ALL');

  // Inspect tournament modal
  const [inspectTournamentId, setInspectTournamentId] = useState<string | null>(null);

  // Status transition modal
  const [statusTournament, setStatusTournament] = useState<any | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('REGISTRATION_OPEN');
  const [statusReason, setStatusReason] = useState<string>('');

  // Suspend modal
  const [suspendTournament, setSuspendTournament] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('');

  // Query tournaments
  const { data, isLoading } = useQuery({
    queryKey: ['admin-tournaments', page, search, statusFilter, gameFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (gameFilter !== 'ALL') params.append('game', gameFilter);

      const res = await api.get(`/admin/tournaments?${params.toString()}`);
      return res.data;
    },
  });

  // Query tournament detail
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-tournament-detail', inspectTournamentId],
    queryFn: async () => {
      if (!inspectTournamentId) return null;
      const res = await api.get(`/admin/tournaments/${inspectTournamentId}`);
      return res.data.data;
    },
    enabled: !!inspectTournamentId,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch(`/admin/tournaments/${id}/status`, { status, reason }),
    onSuccess: () => {
      toast.success('Tournament status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setStatusTournament(null);
      setStatusReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  // Suspend tournament mutation
  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/tournaments/${id}/suspend`, { reason }),
    onSuccess: () => {
      toast.success('Tournament suspended');
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSuspendTournament(null);
      setSuspendReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to suspend tournament');
    },
  });

  const tournaments = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary" className="text-[10px]">DRAFT</Badge>;
      case 'REGISTRATION_OPEN':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">REGISTRATION OPEN</Badge>;
      case 'REGISTRATION_CLOSED':
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">REGISTRATION CLOSED</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[10px]">IN PROGRESS</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">COMPLETED</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive" className="text-[10px]">CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments by title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-xs border-border/60"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-40 border-border/60">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REGISTRATION_OPEN">Registration Open</SelectItem>
                <SelectItem value="REGISTRATION_CLOSED">Registration Closed</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tournaments Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-foreground text-sm">No tournaments found</p>
              <p className="text-xs">Adjust search or filters to locate tournament records.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-card/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Tournament</th>
                    <th className="py-3 px-4">Game</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Teams / Players</th>
                    <th className="py-3 px-4">Prize Pool</th>
                    <th className="py-3 px-4">Start Schedule</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {tournaments.map((t: any) => (
                    <tr key={t.id} className="hover:bg-card/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground text-xs">{t.title}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">Format: {t.type}</div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5">
                          {t.game}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">{getStatusBadge(t.status)}</td>

                      <td className="py-3 px-4 font-mono">
                        <span className="font-bold text-foreground">{t._count?.teams || 0}</span> / {t.maxTeams} teams
                        <div className="text-[10px] text-muted-foreground">{t._count?.participants || 0} participants</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {t.prizePool > 0 ? `$${t.prizePool.toLocaleString()}` : 'Free Entry'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {formatDate(t.startDate)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setInspectTournamentId(t.id)}
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-border/60"
                            onClick={() => {
                              setStatusTournament(t);
                              setSelectedStatus(t.status);
                            }}
                          >
                            Status
                          </Button>

                          {t.status !== 'CANCELLED' && t.status !== 'COMPLETED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => setSuspendTournament(t)}
                            >
                              Suspend
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing {tournaments.length} of {meta.total} tournaments
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="px-2 font-mono text-foreground font-bold">
                {page} / {meta.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inspect Tournament Modal */}
      <Dialog open={!!inspectTournamentId} onOpenChange={(open) => !open && setInspectTournamentId(null)}>
        <DialogContent className="max-w-2xl glass-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-violet-400" /> Tournament Operations &amp; Roster
            </DialogTitle>
            <DialogDescription className="text-xs">
              Live registration list, matches, and participant teams.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !detailData ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              <div className="p-3 rounded-xl bg-card/40 border border-border/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    {detailData.title}
                    {getStatusBadge(detailData.status)}
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    Game: {detailData.game} • Format: {detailData.type} • Prize Pool: ${detailData.prizePool}
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div>Capacity: <span className="font-bold text-foreground">{detailData.teams?.length || 0} / {detailData.maxTeams}</span></div>
                  <div>Players: <span className="font-bold text-primary">{detailData.participants?.length || 0}</span></div>
                </div>
              </div>

              {/* Registered Teams */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Registered Teams ({detailData.teams?.length || 0})
                </h4>
                {!detailData.teams || detailData.teams.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px] p-2 bg-card/20 rounded-xl">
                    No teams registered yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailData.teams.map((tt: any) => (
                      <div key={tt.id} className="p-2 rounded-xl bg-card/30 border border-border/40">
                        <div className="font-bold text-foreground flex items-center justify-between">
                          <span>{tt.team?.name || 'Unnamed Squad'}</span>
                          {tt.team?.tag && <span className="text-[10px] font-mono text-muted-foreground">[{tt.team.tag}]</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {tt.members?.length || 0} confirmed players
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bracket Matches */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5 text-amber-400" /> Matches &amp; Brackets ({detailData.matches?.length || 0})
                </h4>
                {!detailData.matches || detailData.matches.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px] p-2 bg-card/20 rounded-xl">
                    Matches will be generated when registration closes and brackets are seeded.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {detailData.matches.map((m: any) => (
                      <div key={m.id} className="p-2 rounded-xl bg-card/30 border border-border/40 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground">Round {m.round}</span>
                          <span className="text-muted-foreground ml-2">Match #{m.matchNumber || m.id.slice(0, 6)}</span>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {m.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectTournamentId(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={!!statusTournament} onOpenChange={(open) => !open && setStatusTournament(null)}>
        <DialogContent className="max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Transition Tournament Lifecycle
            </DialogTitle>
            <DialogDescription className="text-xs">
              Change status for {statusTournament?.title}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">New Lifecycle Status</label>
              <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="REGISTRATION_OPEN">Registration Open</SelectItem>
                  <SelectItem value="REGISTRATION_CLOSED">Registration Closed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Transition Note / Reason</label>
              <Input
                placeholder="e.g. Brackets confirmed, starting tournament..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusTournament(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={() =>
                updateStatusMutation.mutate({
                  id: statusTournament.id,
                  status: selectedStatus,
                  reason: statusReason,
                })
              }
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Tournament Modal */}
      <Dialog open={!!suspendTournament} onOpenChange={(open) => !open && setSuspendTournament(null)}>
        <DialogContent className="max-w-md glass-card border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-400 flex items-center gap-2">
              <Ban className="h-4 w-4" /> Suspend Tournament
            </DialogTitle>
            <DialogDescription className="text-xs">
              Immediately halt {suspendTournament?.title} due to rule violations or organizer misconduct.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <label className="text-xs font-semibold text-foreground">Suspension Reason (Required)</label>
            <Input
              placeholder="e.g. Organizer failed compliance check, disputed bracket..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSuspendTournament(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={() =>
                suspendMutation.mutate({
                  id: suspendTournament.id,
                  reason: suspendReason,
                })
              }
              disabled={suspendMutation.isPending || !suspendReason.trim()}
            >
              {suspendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Suspension'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
