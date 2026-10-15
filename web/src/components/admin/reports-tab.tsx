'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  AlertTriangle, CheckCircle, Clock, ShieldAlert,
  Loader2, CheckCircle2, User, Trophy, Shield
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { TournamentModerationDashboard } from './tournament-moderation';

export function AdminReportsTab() {
  const queryClient = useQueryClient();

  const [subTab, setSubTab] = useState<'user-reports' | 'tournament-reports'>('user-reports');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Resolve modal state
  const [resolvingReport, setResolvingReport] = useState<any | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await api.get(`/admin/reports?${params.toString()}`);
      return res.data;
    },
  });

  const reports = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      api.post(`/admin/reports/${id}/resolve`, { resolution }),
    onSuccess: () => {
      toast.success('Report resolved');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setResolvingReport(null);
      setResolutionText('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to resolve report');
    },
  });

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionText.trim() || resolutionText.trim().length < 3) {
      toast.error('Please provide a resolution note of at least 3 characters.');
      return;
    }
    resolveMutation.mutate({ id: resolvingReport.id, resolution: resolutionText.trim() });
  };

  return (
    <div className="space-y-5">
      {/* Subtab Toggle */}
      <div className="flex items-center justify-between gap-3 bg-card/30 p-3 rounded-2xl border border-border/50">
        <div className="flex bg-muted/60 p-0.5 rounded-xl border border-border/40 text-xs">
          <button
            onClick={() => setSubTab('user-reports')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              subTab === 'user-reports'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            User &amp; Community Reports
          </button>
          <button
            onClick={() => setSubTab('tournament-reports')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              subTab === 'tournament-reports'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Tournament Tickets &amp; Disputes
          </button>
        </div>

        {subTab === 'user-reports' && (
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="h-8 w-32 text-xs bg-muted/40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Reports</SelectItem>
              <SelectItem value="PENDING">Pending Only</SelectItem>
              <SelectItem value="RESOLVED">Resolved Only</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {subTab === 'tournament-reports' ? (
        <TournamentModerationDashboard />
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Loading reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400/40" />
                <h3 className="font-semibold text-foreground text-sm">No moderation reports</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  The community moderation queue is clear. Reports filed by users will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Reported User</th>
                      <th className="p-3.5">Reporter</th>
                      <th className="p-3.5">Description</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {reports.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3.5 font-bold text-foreground">
                          {r.reason}
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-foreground">
                            {r.reported?.profile?.username || r.reported?.email || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {r.reporter?.profile?.username || r.reporter?.email || 'Anonymous'}
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-muted-foreground">
                          {r.description || 'No description provided'}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <Badge
                            variant={r.status === 'PENDING' ? 'destructive' : 'outline'}
                            className={`text-[10px] ${
                              r.status === 'RESOLVED'
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                : ''
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {r.status === 'PENDING' ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                setResolvingReport(r);
                                setResolutionText('');
                              }}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Resolve
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border/50 text-xs">
                <span className="text-muted-foreground">
                  Showing page {page} of {meta.totalPages} ({meta.total} reports)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
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
          </CardContent>
        </Card>
      )}

      {/* Resolve Report Dialog */}
      <Dialog open={!!resolvingReport} onOpenChange={() => setResolvingReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" /> Resolve Moderation Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record the investigation findings and corrective actions taken.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResolveSubmit} className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-card border border-border/50 text-xs space-y-1">
              <p className="font-semibold text-foreground">
                Reported user: {resolvingReport?.reported?.profile?.username || resolvingReport?.reported?.email}
              </p>
              <p className="text-muted-foreground">Reason: {resolvingReport?.reason}</p>
              {resolvingReport?.description && (
                <p className="text-[11px] text-muted-foreground/80 italic">"{resolvingReport?.description}"</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Resolution Findings &amp; Action *</label>
              <Textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="e.g. Verified misconduct and warned user / No violation found after chat inspection"
                required
                rows={3}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setResolvingReport(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={resolveMutation.isPending}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {resolveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Confirm Resolution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
