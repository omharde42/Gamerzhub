'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, FileText, CheckCircle2, XCircle, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface DisputeCenterProps {
  tournament: any;
  isOrganizer: boolean;
}

export function DisputeCenter({ tournament, isOrganizer }: DisputeCenterProps) {
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const disputes = tournament.disputes || [];

  const resolveMutation = useMutation({
    mutationFn: (vars: { disputeId: string; status: 'RESOLVED' | 'DISMISSED' }) =>
      api.patch(`/tournaments/${tournament.id}/disputes/${vars.disputeId}`, {
        status: vars.status,
        resolution: resolutionNote,
      }),
    onSuccess: () => {
      toast.success('Dispute resolution saved!');
      setSelectedDispute(null);
      setResolutionNote('');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to resolve dispute'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Tournament Dispute Center
          </h3>
          <p className="text-xs text-muted-foreground">Raise and manage match result disputes with evidence verification</p>
        </div>
        <Badge variant="outline" className="text-amber-400 border-amber-500/30 text-xs">
          {disputes.filter((d: any) => d.status === 'OPEN').length} Open Disputes
        </Badge>
      </div>

      {disputes.length === 0 ? (
        <Card variant="glass" className="p-8 text-center rounded-2xl border-white/10 space-y-2">
          <ShieldAlert className="h-8 w-8 text-emerald-400 mx-auto opacity-60" />
          <p className="text-sm font-bold text-foreground">No Disputes Logged</p>
          <p className="text-xs text-muted-foreground">All match results have been verified cleanly.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disputes.map((d: any, i: number) => (
            <Card key={d.id} variant="glass" className="p-4 rounded-2xl border-amber-500/30 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-400 block">Dispute #GH-10{24 + i}</span>
                  <span className="text-xs font-extrabold text-foreground">
                    Match: {d.match?.team1?.team?.name || 'Team A'} vs {d.match?.team2?.team?.name || 'Team B'}
                  </span>
                </div>
                <Badge
                  className={
                    d.status === 'OPEN'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px]'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]'
                  }
                >
                  {d.status}
                </Badge>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-muted-foreground text-[10px] block">Reason:</span>
                <p className="font-semibold text-foreground">{d.reason}</p>
                {d.description && <p className="text-muted-foreground text-[11px] bg-card/60 p-2 rounded-xl">{d.description}</p>}
              </div>

              {/* Evidence Screenshots Section */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <ImageIcon className="h-3 w-3 text-emerald-400" /> Evidence
                </span>
                <div className="flex gap-2">
                  <div className="w-16 h-12 rounded-lg bg-card border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground hover:border-emerald-500/50 cursor-pointer">
                    Screenshot 1
                  </div>
                  <div className="w-16 h-12 rounded-lg bg-card border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground hover:border-emerald-500/50 cursor-pointer">
                    Screenshot 2
                  </div>
                </div>
              </div>

              {isOrganizer && d.status === 'OPEN' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => setSelectedDispute(d)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs rounded-xl"
                  >
                    Resolve Dispute
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* RESOLUTION MODAL */}
      <Dialog open={Boolean(selectedDispute)} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="bg-[#0A0E1A] border-white/10 text-foreground rounded-2xl p-6 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-400">Resolve Dispute #{selectedDispute?.id?.slice(0, 6)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Reason: {selectedDispute?.reason}</p>
            <Textarea
              placeholder="Resolution details or explanation for teams..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              className="bg-card border-white/10 text-xs min-h-[80px]"
            />
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => resolveMutation.mutate({ disputeId: selectedDispute.id, status: 'DISMISSED' })}
                className="flex-1 text-xs rounded-xl text-slate-300"
              >
                Dismiss Claim
              </Button>
              <Button
                onClick={() => resolveMutation.mutate({ disputeId: selectedDispute.id, status: 'RESOLVED' })}
                className="flex-1 bg-emerald-500 text-black font-bold text-xs rounded-xl"
              >
                Accept & Resolve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
