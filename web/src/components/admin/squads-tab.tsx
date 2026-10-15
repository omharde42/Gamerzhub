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
  Shield, Users, Search, Eye, Loader2, AlertCircle, Calendar,
  Clock, CheckCircle2, XCircle, AlertTriangle, Swords
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AdminSquadsTab() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'squads' | 'invitations'>('squads');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');

  // Inspect squad modal
  const [inspectSquadId, setInspectSquadId] = useState<string | null>(null);

  // Status moderation modal
  const [statusSquad, setStatusSquad] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<string>('ACTIVE');
  const [statusReason, setStatusReason] = useState<string>('');

  // Invitations sub-tab state
  const [inviteType, setInviteType] = useState<'INVITE' | 'APPLICATION'>('INVITE');
  const [inviteStatusFilter, setInviteStatusFilter] = useState('ALL');
  const [invitePage, setInvitePage] = useState(1);

  // Query squads
  const { data: squadData, isLoading } = useQuery({
    queryKey: ['admin-squads', page, search, statusFilter, regionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (regionFilter !== 'ALL') params.append('region', regionFilter);

      const res = await api.get(`/admin/squads?${params.toString()}`);
      return res.data;
    },
    enabled: subTab === 'squads',
  });

  // Query squad detail
  const { data: squadDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-squad-detail', inspectSquadId],
    queryFn: async () => {
      if (!inspectSquadId) return null;
      const res = await api.get(`/admin/squads/${inspectSquadId}`);
      return res.data.data;
    },
    enabled: !!inspectSquadId,
  });

  // Query invitations / applications
  const { data: inviteData, isLoading: inviteLoading } = useQuery({
    queryKey: ['admin-squad-invitations', invitePage, inviteType, inviteStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', invitePage.toString());
      params.append('limit', '15');
      params.append('type', inviteType);
      if (inviteStatusFilter !== 'ALL') params.append('status', inviteStatusFilter);

      const res = await api.get(`/admin/squad-invitations?${params.toString()}`);
      return res.data;
    },
    enabled: subTab === 'invitations',
  });

  // Moderate squad status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api.patch(`/admin/squads/${id}/status`, { status, reason }),
    onSuccess: () => {
      toast.success('Squad status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-squads'] });
      queryClient.invalidateQueries({ queryKey: ['admin-squad-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setStatusSquad(null);
      setStatusReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update squad status');
    },
  });

  const squads = squadData?.data || [];
  const meta = squadData?.meta || { total: 0, totalPages: 1 };

  const invites = inviteData?.data || [];
  const inviteMeta = inviteData?.meta || { total: 0, totalPages: 1 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">ACTIVE</Badge>;
      case 'RECRUITING':
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">RECRUITING</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary" className="text-[10px]">INACTIVE</Badge>;
      case 'DISBANDED':
        return <Badge variant="destructive" className="text-[10px]">DISBANDED</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          onClick={() => setSubTab('squads')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'squads'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Squad Rosters
        </button>
        <button
          onClick={() => setSubTab('invitations')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'invitations'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Squad Invitations &amp; Applications
        </button>
      </div>

      {subTab === 'squads' ? (
        <>
          {/* Search & Filter Toolbar */}
          <Card className="glass-card">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by squad name or tag..."
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
                  <SelectTrigger className="h-9 text-xs w-36 border-border/60">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="RECRUITING">Recruiting</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="DISBANDED">Disbanded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Squads Table */}
          <Card className="glass-card">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              ) : squads.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-2">
                  <Shield className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="font-semibold text-foreground text-sm">No squads registered</p>
                  <p className="text-xs">Adjust search or filters to locate squad records.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-card/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                        <th className="py-3 px-4">Squad Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Members</th>
                        <th className="py-3 px-4">Leader</th>
                        <th className="py-3 px-4">Record (W / L)</th>
                        <th className="py-3 px-4">Created</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {squads.map((s: any) => {
                        const leader = s.members?.[0]?.user?.profile?.username || s.members?.[0]?.user?.email || 'N/A';
                        return (
                          <tr key={s.id} className="hover:bg-card/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 rounded-xl border border-primary/20 shrink-0">
                                  <AvatarImage src={s.avatar} />
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                    {(s.tag || s.name).slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-bold text-foreground flex items-center gap-1.5">
                                    <span>{s.name}</span>
                                    {s.tag && (
                                      <Badge variant="outline" className="text-[9px] font-mono px-1 py-0">
                                        [{s.tag}]
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground">{s.region || 'Global'}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">{getStatusBadge(s.status)}</td>

                            <td className="py-3 px-4 font-mono">
                              <span className="font-bold text-foreground">{s._count?.members || 0}</span> members
                            </td>

                            <td className="py-3 px-4 text-muted-foreground">
                              <span className="font-semibold text-foreground">{leader}</span>
                            </td>

                            <td className="py-3 px-4 font-mono">
                              <span className="text-emerald-400 font-bold">{s.wins || 0}W</span> /{' '}
                              <span className="text-red-400 font-bold">{s.losses || 0}L</span>
                            </td>

                            <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                              {formatDate(s.createdAt)}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs gap-1"
                                  onClick={() => setInspectSquadId(s.id)}
                                >
                                  <Eye className="h-3.5 w-3.5" /> Roster
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs border-border/60"
                                  onClick={() => {
                                    setStatusSquad(s);
                                    setNewStatus(s.status);
                                  }}
                                >
                                  Moderate
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="p-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Showing {squads.length} of {meta.total} squads
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
        </>
      ) : (
        /* Invitations Sub-Tab */
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={inviteType === 'INVITE' ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => {
                    setInviteType('INVITE');
                    setInvitePage(1);
                  }}
                >
                  Squad Invites Sent
                </Button>
                <Button
                  size="sm"
                  variant={inviteType === 'APPLICATION' ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => {
                    setInviteType('APPLICATION');
                    setInvitePage(1);
                  }}
                >
                  Gamer Applications
                </Button>
              </div>

              <Select
                value={inviteStatusFilter}
                onValueChange={(val) => {
                  setInviteStatusFilter(val);
                  setInvitePage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-36 border-border/60">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs">No records found for this invitation queue.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {invites.map((inv: any) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-foreground">
                        {inv.team?.name}{' '}
                        {inv.team?.tag && <span className="font-mono text-muted-foreground">[{inv.team.tag}]</span>}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Gamer: <span className="text-foreground">{inv.user?.profile?.username || inv.user?.email}</span>
                        {inv.message && <span className="italic ml-2">"{inv.message}"</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          inv.status === 'ACCEPTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : inv.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {inv.status}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                        {formatDate(inv.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inspect Squad Roster Modal */}
      <Dialog open={!!inspectSquadId} onOpenChange={(open) => !open && setInspectSquadId(null)}>
        <DialogContent className="max-w-2xl glass-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Squad Details &amp; Active Roster
            </DialogTitle>
            <DialogDescription className="text-xs">
              Members, practice schedules, and match history for squad continuity.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !squadDetail ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              <div className="p-3 rounded-xl bg-card/40 border border-border/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-2">
                    {squadDetail.name}
                    {squadDetail.tag && <Badge variant="outline" className="font-mono">[{squadDetail.tag}]</Badge>}
                    {getStatusBadge(squadDetail.status)}
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-0.5">
                    {squadDetail.description || 'No squad description provided.'}
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <div>Region: <span className="text-foreground font-semibold">{squadDetail.region || 'Global'}</span></div>
                  <div>Score: <span className="text-primary font-bold">{squadDetail.rankScore || 0} pts</span></div>
                </div>
              </div>

              {/* Roster Members */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" /> Squad Members ({squadDetail.members?.length || 0})
                </h4>
                <div className="divide-y divide-border/40 rounded-xl border border-border/40 bg-card/20">
                  {squadDetail.members?.map((m: any) => (
                    <div key={m.id} className="p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7 rounded-lg">
                          <AvatarImage src={m.user?.profile?.avatar} />
                          <AvatarFallback className="text-[9px] font-bold">
                            {(m.user?.profile?.username || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-foreground">
                            {m.user?.profile?.displayName || m.user?.profile?.username || 'Gamer'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{m.user?.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">
                          {m.role}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Joined {formatDate(m.joinedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrims & Scheduled Practices */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5 text-amber-400" /> Recent Scrims &amp; Sessions ({squadDetail.scrims?.length || 0})
                </h4>
                {!squadDetail.scrims || squadDetail.scrims.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px] p-2 bg-card/20 rounded-xl">
                    No scrim sessions logged.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {squadDetail.scrims.map((sc: any) => (
                      <div key={sc.id} className="p-2 rounded-xl bg-card/30 border border-border/40 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-foreground">{sc.title}</div>
                          <div className="text-[10px] text-muted-foreground">vs {sc.opponentTeam || 'Open Lobby'}</div>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {sc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectSquadId(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Moderate Squad Status Modal */}
      <Dialog open={!!statusSquad} onOpenChange={(open) => !open && setStatusSquad(null)}>
        <DialogContent className="max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Moderate Squad Status
            </DialogTitle>
            <DialogDescription className="text-xs">
              Change status for {statusSquad?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Status</label>
              <Select value={newStatus} onValueChange={(val) => setNewStatus(val)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE - Standard operation</SelectItem>
                  <SelectItem value="RECRUITING">RECRUITING - Looking for players</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE - Suspended/dormant</SelectItem>
                  <SelectItem value="DISBANDED">DISBANDED - Disband squad (moderation)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Moderation Reason</label>
              <Input
                placeholder="Reason for administrative status update..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setStatusSquad(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={() =>
                statusMutation.mutate({
                  id: statusSquad.id,
                  status: newStatus,
                  reason: statusReason,
                })
              }
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Status Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
