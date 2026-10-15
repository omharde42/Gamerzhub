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
  Users, Search, Ban, CheckCircle2, Shield, AlertTriangle, Eye,
  Loader2, Sparkles, UserCheck, Lock, AlertCircle, Gamepad2, Trophy
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

export function AdminUsersTab() {
  const queryClient = useQueryClient();
  const currentAdmin = useAuthStore((state) => state.user);
  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<any | null>(null);
  const [banReason, setBanReason] = useState('');
  const [roleChangeUser, setRoleChangeUser] = useState<any | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('USER');

  // Query users
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, roleFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await api.get(`/admin/users?${params.toString()}`);
      return res.data;
    },
  });

  // Query single user detail
  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-user-detail', inspectUserId],
    queryFn: async () => {
      if (!inspectUserId) return null;
      const res = await api.get(`/admin/users/${inspectUserId}`);
      return res.data.data;
    },
    enabled: !!inspectUserId,
  });

  const users = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Ban mutation
  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/users/${id}/ban`, { reason }),
    onSuccess: () => {
      toast.success('User has been suspended/banned');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setBanningUser(null);
      setBanReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to ban user');
    },
  });

  // Unban mutation
  const unbanMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/unban`),
    onSuccess: () => {
      toast.success('User reactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to unban user');
    },
  });

  // Role mutation (Super Admin only)
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setRoleChangeUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update role');
    },
  });

  // Profile verification mutation
  const verifyMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      api.patch(`/admin/users/${id}/verify-profile`, { verified }),
    onSuccess: () => {
      toast.success('Gamer verification badge updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update verification');
    },
  });

  const handleBanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!banReason.trim() || banReason.trim().length < 3) {
      toast.error('Please specify a ban reason of at least 3 characters.');
      return;
    }
    banMutation.mutate({ id: banningUser.id, reason: banReason.trim() });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] font-bold">SUPER ADMIN</Badge>;
      case 'ADMIN':
        return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">ADMIN</Badge>;
      case 'MODERATOR':
        return <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px] font-bold">MODERATOR</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">USER</Badge>;
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
              placeholder="Search by GamerZ ID, username, email..."
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
              value={roleFilter}
              onValueChange={(val) => {
                setRoleFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-36 border-border/60">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-xs w-32 border-border/60">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-foreground text-sm">No registered gamers found</p>
              <p className="text-xs">Adjust filters or search query to find accounts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-card/40 text-muted-foreground text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Gamer Profile</th>
                    <th className="py-3 px-4">GamerZ ID</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((u: any) => {
                    const isBanned = u.banned;
                    const isVerified = u.profile?.verified;
                    const username = u.profile?.username || 'Anonymous';
                    const displayName = u.profile?.displayName || username;
                    const avatar = u.profile?.avatar;

                    return (
                      <tr key={u.id} className="hover:bg-card/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 rounded-xl border border-primary/20 shrink-0">
                              <AvatarImage src={avatar} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                {username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-foreground">
                                <span className="truncate">{displayName}</span>
                                {isVerified && (
                                  <span title="Verified Gamer badge" className="text-primary shrink-0">
                                    <Sparkles className="h-3 w-3 inline text-primary fill-primary/30" />
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {u.gamerzId ? (
                            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                              {u.gamerzId}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">{getRoleBadge(u.role)}</td>

                        <td className="py-3 px-4">
                          {isVerified ? (
                            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">
                              Standard
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isBanned ? (
                            <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
                              <Ban className="h-3 w-3" /> Suspended
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                          {formatDate(u.createdAt)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => setInspectUserId(u.id)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </Button>

                            {isSuperAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs border-border/60"
                                onClick={() => {
                                  setRoleChangeUser(u);
                                  setSelectedNewRole(u.role);
                                }}
                              >
                                Role
                              </Button>
                            )}

                            {isBanned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => unbanMutation.mutate(u.id)}
                                disabled={unbanMutation.isPending}
                              >
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => setBanningUser(u)}
                                disabled={u.role === 'SUPER_ADMIN'}
                              >
                                Suspend
                              </Button>
                            )}
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
              Showing {users.length} of {meta.total} registered users
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

      {/* Inspect User Modal */}
      <Dialog open={!!inspectUserId} onOpenChange={(open) => !open && setInspectUserId(null)}>
        <DialogContent className="max-w-2xl glass-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Gamer Account Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete database record for registered account.
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !userDetail ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Header profile info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 rounded-2xl border border-primary/30">
                    <AvatarImage src={userDetail.profile?.avatar} />
                    <AvatarFallback className="font-bold text-sm bg-primary/10 text-primary">
                      {(userDetail.profile?.username || 'U').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-2">
                      {userDetail.profile?.displayName || userDetail.profile?.username || 'Unnamed'}
                      {userDetail.profile?.verified && (
                        <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30">
                          VERIFIED GAMER
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground">{userDetail.email}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      GamerZ ID: {userDetail.gamerzId || 'Not set'} • ID: {userDetail.id}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1 border-primary/30"
                  onClick={() =>
                    verifyMutation.mutate({
                      id: userDetail.id,
                      verified: !userDetail.profile?.verified,
                    })
                  }
                  disabled={verifyMutation.isPending}
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  {userDetail.profile?.verified ? 'Revoke Verified' : 'Grant Verified'}
                </Button>
              </div>

              {/* Linked Gaming Identities */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Gamepad2 className="h-3.5 w-3.5 text-primary" /> Linked Game Profiles ({userDetail.gameProfiles?.length || 0})
                </h4>
                {!userDetail.gameProfiles || userDetail.gameProfiles.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px] p-2 bg-card/20 rounded-xl">
                    No linked game accounts reported.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userDetail.gameProfiles.map((gp: any) => (
                      <div key={gp.id} className="p-2.5 rounded-xl bg-card/30 border border-border/40 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground uppercase">{gp.game}</span>
                          <Badge variant="outline" className="text-[9px]">
                            {gp.verified ? 'Verified UID' : 'Unverified'}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">IGN: <span className="text-foreground">{gp.inGameName || 'N/A'}</span></div>
                        <div className="text-muted-foreground font-mono text-[10px]">UID: {gp.gameUid || 'N/A'}</div>
                        {gp.rank && <div className="text-[10px] text-muted-foreground">Rank: {gp.rank}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Squad Memberships */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" /> Squads ({userDetail.teamMembers?.length || 0})
                </h4>
                {!userDetail.teamMembers || userDetail.teamMembers.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px] p-2 bg-card/20 rounded-xl">
                    User is not a member of any squad.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {userDetail.teamMembers.map((tm: any) => (
                      <div key={tm.id} className="p-2 rounded-xl bg-card/30 border border-border/40 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground">{tm.team?.name}</span>
                          {tm.team?.tag && <span className="text-muted-foreground font-mono ml-1">[{tm.team.tag}]</span>}
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {tm.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tournament History */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-violet-400" /> Tournaments Participated ({userDetail.tournamentParticipants?.length || 0})
                </h4>
                {!userDetail.tournamentParticipants || userDetail.tournamentParticipants.length === 0 ? (
                  <p className="text-muted-foreground italic text-[11px] p-2 bg-card/20 rounded-xl">
                    No tournament participations recorded.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {userDetail.tournamentParticipants.map((tp: any) => (
                      <div key={tp.id} className="p-2 rounded-xl bg-card/30 border border-border/40 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-foreground">{tp.tournament?.title}</span>
                          <span className="text-muted-foreground text-[10px] ml-2">({tp.tournament?.game})</span>
                        </div>
                        <Badge variant="outline" className="text-[9px]">
                          {tp.tournament?.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectUserId(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Modal */}
      <Dialog open={!!banningUser} onOpenChange={(open) => !open && setBanningUser(null)}>
        <DialogContent className="max-w-md glass-card border-red-500/30">
          <form onSubmit={handleBanSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-400 flex items-center gap-2">
                <Ban className="h-4 w-4" /> Suspend Gamer Account
              </DialogTitle>
              <DialogDescription className="text-xs">
                Restricts {banningUser?.email} from accessing matchmaking, squad sessions, and tournament participation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Suspension Reason (Required)</label>
              <Input
                placeholder="e.g. Terms violation, abusive behavior in squad match..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="text-xs h-9 border-border/60"
              />
              <p className="text-[10px] text-muted-foreground">
                Recorded in immutable administrator audit logs.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setBanningUser(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="text-xs"
                disabled={banMutation.isPending}
              >
                {banMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Suspension'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={!!roleChangeUser} onOpenChange={(open) => !open && setRoleChangeUser(null)}>
        <DialogContent className="max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Modify Administrative Role
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update authorization tier for {roleChangeUser?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Select value={selectedNewRole} onValueChange={(val) => setSelectedNewRole(val)}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER - Standard Community Member</SelectItem>
                <SelectItem value="MODERATOR">MODERATOR - Content &amp; Dispute Handler</SelectItem>
                <SelectItem value="ADMIN">ADMIN - Platform Operations</SelectItem>
                <SelectItem value="SUPER_ADMIN">SUPER_ADMIN - Full System Privileges</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRoleChangeUser(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={() => roleMutation.mutate({ id: roleChangeUser.id, role: selectedNewRole })}
              disabled={roleMutation.isPending}
            >
              {roleMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Role Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
