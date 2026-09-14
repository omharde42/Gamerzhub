'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import {
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Trophy,
  Users,
  Eye,
  FileText,
  Loader2,
  Filter,
  Ban,
  Shield,
} from 'lucide-react';

export function TournamentModerationDashboard() {
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Resolution modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'REJECTED' | 'DUPLICATE'>('RESOLVED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionTaken, setActionTaken] = useState('NO_VIOLATION');

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-tournament-reports', statusFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      const res = await api.get(`/admin/tournament-reports?${params.toString()}`);
      return res.data;
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-tournament-report-detail', selectedReportId],
    queryFn: async () => {
      if (!selectedReportId) return null;
      const res = await api.get(`/admin/tournament-reports/${selectedReportId}`);
      return res.data.data;
    },
    enabled: !!selectedReportId,
  });

  const statusMut = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: string }) =>
      api.patch(`/admin/tournament-reports/${reportId}/status`, { status }),
    onSuccess: () => {
      toast.success('Report status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-report-detail'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });

  const resolveMut = useMutation({
    mutationFn: (payload: any) =>
      api.post(`/admin/tournament-reports/${selectedReportId}/resolve`, payload),
    onSuccess: () => {
      toast.success('Report resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-report-detail'] });
      setShowResolveModal(false);
      setResolutionNote('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to resolve report'),
  });

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNote || resolutionNote.trim().length < 3) {
      toast.error('Please provide a resolution note.');
      return;
    }
    resolveMut.mutate({
      status: resolutionStatus,
      resolutionNote: resolutionNote.trim(),
      actionTaken,
    });
  };

  const reportsList = reportsData?.data || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">OPEN</Badge>;
      case 'UNDER_REVIEW':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">UNDER REVIEW</Badge>;
      case 'ACTION_REQUIRED':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">ACTION REQUIRED</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">RESOLVED</Badge>;
      case 'REJECTED':
        return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">REJECTED</Badge>;
      case 'DUPLICATE':
        return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">DUPLICATE</Badge>;
      case 'ESCALATED':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">ESCALATED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Tournament Moderation & Safety Center
          </h2>
          <p className="text-xs text-zinc-400">
            Review user reports, disputes, suspicious behavior allegations, and issue resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="ACTION_REQUIRED">Action Required</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <Card className="glass-card lg:col-span-1 border-zinc-800">
          <CardHeader className="p-4 border-b border-zinc-800/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Reports List ({reportsList.length})</span>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto">
            {reportsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">No moderation reports found.</div>
            ) : (
              reportsList.map((rep: any) => (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReportId(rep.id)}
                  className={`p-3 cursor-pointer hover:bg-zinc-900/60 transition ${
                    selectedReportId === rep.id ? 'bg-zinc-900 border-l-2 border-red-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-zinc-400">{rep.ticketNumber}</span>
                    {getStatusBadge(rep.status)}
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 truncate">{rep.subject}</div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">{rep.category.replace(/_/g, ' ')}</div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2">
                    <span>By: {rep.reporter?.profile?.username || 'User'}</span>
                    <span>{formatDate(rep.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Selected Report Detail View */}
        <Card className="glass-card lg:col-span-2 border-zinc-800">
          {!selectedReportId ? (
            <CardContent className="p-12 text-center text-zinc-500 text-sm">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Select a report from the list to inspect context and perform moderation actions.
            </CardContent>
          ) : detailLoading ? (
            <CardContent className="p-12 text-center text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading report detail...
            </CardContent>
          ) : detailData?.report ? (
            <div className="p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{detailData.report.subject}</h3>
                    <Badge variant="outline" className="text-[10px] border-zinc-700">
                      {detailData.report.ticketNumber}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Category: <span className="text-zinc-200">{detailData.report.category.replace(/_/g, ' ')}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusBadge(detailData.report.status)}
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white text-xs h-7"
                    onClick={() => setShowResolveModal(true)}
                  >
                    Resolve / Action
                  </Button>
                </div>
              </div>

              {/* Context Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-zinc-900/60 p-3 rounded border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Tournament</span>
                  <span className="text-zinc-200 font-medium truncate block">
                    {detailData.report.tournament?.title || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Reporter</span>
                  <span className="text-zinc-200 font-medium block">
                    {detailData.report.reporter?.profile?.username || 'User'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Target</span>
                  <span className="text-zinc-200 font-medium block">
                    {detailData.report.targetUser?.profile?.username ||
                      detailData.report.targetTeam?.team?.name ||
                      'Tournament/Platform'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Severity</span>
                  <span className="text-zinc-200 font-medium block">{detailData.report.severity}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-300">Report Description</span>
                <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-xs text-zinc-300 whitespace-pre-wrap">
                  {detailData.report.description}
                </div>
              </div>

              {/* Evidence */}
              {detailData.report.evidenceUrl && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-300">Submitted Evidence</span>
                  <div className="p-2 bg-zinc-950 rounded border border-zinc-800 text-xs">
                    <a
                      href={detailData.report.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline break-all"
                    >
                      {detailData.report.evidenceUrl}
                    </a>
                  </div>
                </div>
              )}

              {/* Quick Status Change */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-zinc-400">Change Status:</span>
                {['OPEN', 'UNDER_REVIEW', 'ACTION_REQUIRED', 'ESCALATED'].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2"
                    disabled={statusMut.isPending || detailData.report.status === st}
                    onClick={() => statusMut.mutate({ reportId: detailData.report.id, status: st })}
                  >
                    {st.replace('_', ' ')}
                  </Button>
                ))}
              </div>

              {/* Audit Log Trail for Report */}
              {detailData.auditLogs?.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-300">Audit History Trail</span>
                  <div className="space-y-1">
                    {detailData.auditLogs.map((log: any) => (
                      <div key={log.id} className="text-[11px] text-zinc-400 flex items-center justify-between bg-zinc-950 px-2.5 py-1.5 rounded">
                        <span>{log.action}</span>
                        <span className="text-[10px] text-zinc-500">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      {/* Resolution Dialog */}
      <Dialog open={showResolveModal} onOpenChange={setShowResolveModal}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-base text-zinc-100">Resolve Moderation Report</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Resolution Outcome</label>
              <select
                value={resolutionStatus}
                onChange={(e: any) => setResolutionStatus(e.target.value)}
                className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200"
              >
                <option value="RESOLVED">RESOLVED</option>
                <option value="REJECTED">REJECTED / NO VIOLATION</option>
                <option value="DUPLICATE">DUPLICATE REPORT</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Action Taken</label>
              <select
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded p-2 text-zinc-200"
              >
                <option value="NO_VIOLATION">No Violation / Dismissed</option>
                <option value="WARNING">Issue Formal Warning</option>
                <option value="CONTENT_REMOVAL">Content Removal</option>
                <option value="PARTICIPANT_RESTRICTION">Restrict Participant</option>
                <option value="ORGANIZER_RESTRICTION">Restrict Organizer</option>
                <option value="RESULT_CORRECTED">Result Corrected</option>
                <option value="TOURNAMENT_CANCELLATION">Cancel Tournament</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">Resolution Note *</label>
              <Textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Explain the findings and moderation decision..."
                rows={3}
                className="text-xs bg-zinc-900 border-zinc-800"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowResolveModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={resolveMut.isPending}>
                {resolveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
                Confirm Resolution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
