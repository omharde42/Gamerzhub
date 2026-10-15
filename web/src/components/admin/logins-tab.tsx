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
  LogIn, Users, Activity, ShieldAlert, Monitor, Phone,
  Globe, Search, Loader2, RefreshCw, AlertCircle,
  Calendar, Clock, CheckCircle2, XCircle, Shield
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

function parseUserAgent(ua?: string) {
  if (!ua || ua === 'Unknown') return { device: 'Unknown', browser: 'Browser' };
  let device = 'Desktop';
  if (/mobile|android|iphone|ipad/i.test(ua)) {
    device = /ipad|tablet/i.test(ua) ? 'Tablet' : 'Mobile';
  }

  let os = 'OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ios/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return { device: `${os} (${device})`, browser };
}

export function AdminLoginsTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [historyType, setHistoryType] = useState<'sessions' | 'events'>('sessions');
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  // Fetch Login & Session Statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-login-stats'],
    queryFn: () => api.get('/admin/logins/stats').then((r) => r.data.data),
    refetchInterval: 15000, // auto refresh every 15s
  });

  // Fetch Logins / Sessions History
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-login-history', page, search, historyType],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      params.append('type', historyType);
      if (search) params.append('search', search);

      const res = await api.get(`/admin/logins/history?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Revoke Session Mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/logins/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-login-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin-login-stats'] });
      setRevokeConfirmId(null);
      toast.success('Session revoked! User has been logged out.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to revoke session'),
  });

  const items = historyData?.data?.items || [];
  const pagination = historyData?.data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 p-4 rounded-2xl border border-border/50">
        <div>
          <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" /> User Logins &amp; Active Sessions
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor real-time user authentication, active sessions, and force logout suspicious logins.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchStats();
            queryClient.invalidateQueries({ queryKey: ['admin-login-history'] });
          }}
          className="text-xs font-semibold gap-1.5 h-9 rounded-xl border-border/60"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Realtime Data
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="glass-card">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Logins</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats?.totalLogins || 0}
            </div>
            <p className="text-[10px] text-muted-foreground">All-time authenticated logins</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-emerald-500/30">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-emerald-400 font-bold">Active Right Now</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats?.activeSessions || 0}
            </div>
            <p className="text-[10px] text-muted-foreground">Live active user sessions</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Logins Today (24h)</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats?.todayLogins || 0}
            </div>
            <p className="text-[10px] text-muted-foreground">Users logged in within 24 hours</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Registered Accounts</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stats?.totalRegisteredUsers || 0}
            </div>
            <p className="text-[10px] text-muted-foreground">Total platform members</p>
          </CardContent>
        </Card>
      </div>

      {/* Sub-navigation & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/50 max-w-fit">
          <button
            onClick={() => {
              setHistoryType('sessions');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              historyType === 'sessions'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active &amp; Recent Sessions
          </button>
          <button
            onClick={() => {
              setHistoryType('events');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              historyType === 'events'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Historical Login Stream
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by user, email, or IP..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 text-xs h-9 rounded-xl bg-card/50"
          />
        </div>
      </div>

      {/* Logins / Sessions Table */}
      <Card className="glass-card">
        <CardContent className="p-0 overflow-x-auto">
          {historyLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-2">
              <LogIn className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <p className="font-bold text-foreground text-sm">No login sessions found</p>
              <p className="text-xs">No user logins match the current search filter.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-3">Auth Method</th>
                  <th className="py-3 px-3">IP Address</th>
                  <th className="py-3 px-3">Device / Browser</th>
                  <th className="py-3 px-3">Login Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {items.map((item: any) => {
                  const uaInfo = parseUserAgent(item.userAgent || item.device);
                  const isSession = historyType === 'sessions';
                  const user = item.user || {};

                  return (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      {/* User Cell */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5 min-w-[180px]">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={user.profile?.avatar} />
                            <AvatarFallback className="text-[10px]">
                              {user.profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground truncate">
                                @{user.profile?.username || item.username || 'User'}
                              </span>
                              {user.role && user.role !== 'USER' && (
                                <Badge className="text-[8px] px-1 py-0 uppercase bg-primary/20 text-primary">
                                  {user.role}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{user.email || item.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Auth Method */}
                      <td className="py-3.5 px-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-mono font-bold bg-card"
                        >
                          {item.provider || 'CREDENTIALS'}
                        </Badge>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <span>{item.ip || item.ipAddress || '127.0.0.1'}</span>
                        </div>
                      </td>

                      {/* Device & Browser */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                            {uaInfo.device.includes('Mobile') ? (
                              <Phone className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Monitor className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span>{uaInfo.device}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{uaInfo.browser}</p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        {isSession ? (
                          item.isActive ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] gap-1 px-1.5 py-0 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Now
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[9px] px-1.5 py-0">
                              Expired
                            </Badge>
                          )
                        ) : (
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[9px] px-1.5 py-0">
                            Recorded: {formatDate(item.createdAt)}
                          </Badge>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        {isSession ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRevokeConfirmId(item.id)}
                            className="h-7 text-[11px] font-semibold text-red-400 border-red-500/30 hover:bg-red-500/10"
                          >
                            Terminate
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Logged</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-3 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} records)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="h-7 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Session Confirmation Modal */}
      <Dialog open={!!revokeConfirmId} onOpenChange={() => setRevokeConfirmId(null)}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base font-bold">
              <AlertCircle className="h-5 w-5" /> Terminate User Session?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will immediately invalidate the user's refresh token and force them to log in again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevokeConfirmId(null)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => revokeConfirmId && revokeSessionMutation.mutate(revokeConfirmId)}
              disabled={revokeSessionMutation.isPending}
              className="text-xs font-bold gap-1.5"
            >
              {revokeSessionMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Revoke Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
