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
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Clock, Search, Filter, Eye, FileText,
  User, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AdminAuditLogsTab() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [inspectLog, setInspectLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page, actionFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      return res.data;
    },
  });

  const logs = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const getActionBadge = (action: string) => {
    if (action.includes('BAN') || action.includes('DELETE') || action.includes('SUSPEND')) {
      return (
        <Badge variant="destructive" className="text-[10px] font-semibold">
          {action.replace(/_/g, ' ')}
        </Badge>
      );
    }
    if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('UNBAN')) {
      return (
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold">
          {action.replace(/_/g, ' ')}
        </Badge>
      );
    }
    if (action.includes('UPDATE') || action.includes('RESOLVE')) {
      return (
        <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-[10px] font-semibold">
          {action.replace(/_/g, ' ')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px]">
        {action.replace(/_/g, ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/30 p-4 rounded-2xl border border-border/50">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by actor email, entity, or ID..."
              className="pl-9 h-9 text-xs bg-muted/40"
            />
          </div>

          <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(1); }}>
            <SelectTrigger className="h-9 w-48 text-xs bg-muted/40">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              <SelectItem value="USER_BANNED">User Banned</SelectItem>
              <SelectItem value="USER_UNBANNED">User Unbanned</SelectItem>
              <SelectItem value="USER_ROLE_UPDATED">Role Updated</SelectItem>
              <SelectItem value="PRODUCT_CREATED">Product Created</SelectItem>
              <SelectItem value="PRODUCT_UPDATED">Product Updated</SelectItem>
              <SelectItem value="PRODUCT_DELETED">Product Deleted</SelectItem>
              <SelectItem value="PRODUCT_ARCHIVED">Product Archived</SelectItem>
              <SelectItem value="ORDER_STATUS_UPDATED">Order Status Updated</SelectItem>
              <SelectItem value="GAME_REQUEST_APPROVED">Game Approved</SelectItem>
              <SelectItem value="GAME_REQUEST_REJECTED">Game Rejected</SelectItem>
              <SelectItem value="PARTNERSHIP_REVIEWED">Partnership Reviewed</SelectItem>
              <SelectItem value="REPORT_RESOLVED">Report Resolved</SelectItem>
              <SelectItem value="TOURNAMENT_SUSPENDED">Tournament Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <h3 className="font-semibold text-foreground text-sm">No audit logs found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Administrative security events and mutations are automatically tracked here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Administrator</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Target Entity</th>
                    <th className="p-3.5">Target ID</th>
                    <th className="p-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors font-mono">
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground font-sans">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-sans font-medium text-foreground">
                        {log.user?.profile?.username || log.user?.email || 'System'}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-sans">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground font-sans">
                        {log.entity || '—'}
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-primary max-w-[140px] truncate">
                        {log.entityId || '—'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap font-sans">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInspectLog(log)}
                          className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" /> Inspect
                        </Button>
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
                Showing page {page} of {meta.totalPages} ({meta.total} audit logs)
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

      {/* Inspect Log Metadata Dialog */}
      <Dialog open={!!inspectLog} onOpenChange={() => setInspectLog(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 font-mono">
              <FileText className="h-4 w-4 text-primary" />
              Audit Event: {inspectLog?.action}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recorded at {inspectLog ? formatDate(inspectLog.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>

          {inspectLog && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-card border border-border/50">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Actor</span>
                  <p className="font-bold text-foreground mt-0.5">{inspectLog.user?.email || 'System'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Entity</span>
                  <p className="font-bold text-foreground mt-0.5">{inspectLog.entity || 'General'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">Target Record ID</span>
                  <p className="font-mono text-primary mt-0.5 break-all">{inspectLog.entityId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-semibold">IP Address</span>
                  <p className="font-mono text-muted-foreground mt-0.5">{inspectLog.ip || 'Local / Proxied'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-semibold">Payload Metadata</span>
                <pre className="p-3 rounded-xl bg-black/60 border border-border/60 text-emerald-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {inspectLog.metadata ? JSON.stringify(inspectLog.metadata, null, 2) : 'No additional metadata'}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setInspectLog(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
