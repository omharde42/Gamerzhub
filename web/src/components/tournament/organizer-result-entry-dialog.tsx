'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Save, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import { fireCelebration } from '@/components/hud/celebration';

interface TeamResultInput {
  teamId: string;
  teamName: string;
  avatar?: string;
  placement: number;
  kills: number;
  points: number;
  score: number;
  notes?: string;
}

interface OrganizerResultEntryDialogProps {
  tournament: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizerResultEntryDialog({
  tournament,
  isOpen,
  onOpenChange,
}: OrganizerResultEntryDialogProps) {
  const queryClient = useQueryClient();
  const [resultInputs, setResultInputs] = useState<TeamResultInput[]>([]);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const acceptedTeams = (tournament?.teams || []).filter((t: any) => t.status === 'ACCEPTED');

  useEffect(() => {
    if (acceptedTeams.length > 0) {
      setResultInputs(
        acceptedTeams.map((tItem: any, idx: number) => ({
          teamId: tItem.id,
          teamName: tItem.team?.name || 'Team',
          avatar: tItem.team?.avatar || undefined,
          placement: tItem.placement || idx + 1,
          kills: 0,
          points: 0,
          score: 0,
          notes: '',
        }))
      );
    }
  }, [tournament?.id]);

  const saveResultsMut = useMutation({
    mutationFn: (results: any[]) => api.post(`/tournaments/${tournament.id}/results`, { results }),
    onSuccess: () => {
      toast.success('Draft results saved successfully');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournament-leaderboard', tournament.id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save results'),
  });

  const finalizeResultsMut = useMutation({
    mutationFn: () => api.post(`/tournaments/${tournament.id}/results/finalize`, {}),
    onSuccess: () => {
      setShowFinalizeConfirm(false);
      onOpenChange(false);
      toast.success('Tournament results finalized!');
      fireCelebration('Results Official!', 'Tournament completed and leaderboard locked.');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournament-workspace', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournament-leaderboard', tournament.id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to finalize results'),
  });

  const handleInputChange = (teamId: string, field: keyof TeamResultInput, val: any) => {
    setResultInputs((prev) =>
      prev.map((item) => {
        if (item.teamId !== teamId) return item;
        const updated = { ...item, [field]: val };
        if (field === 'kills' || field === 'points') {
          updated.score = (Number(updated.points) || 0) + (Number(updated.kills) || 0);
        }
        return updated;
      })
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="glass-popup border-emerald-500/40 max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <Trophy className="h-6 w-6 text-emerald-400" /> Enter & Validate Tournament Results
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter placements, kills, and points for all approved teams. Save drafts anytime or finalize to make official.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {acceptedTeams.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No approved teams available for result entry.</p>
            ) : (
              <div className="space-y-3">
                {resultInputs.map((res, i) => (
                  <div key={res.teamId} className="p-4 rounded-2xl bg-card/60 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-emerald-500/30">
                          <AvatarImage src={res.avatar} />
                          <AvatarFallback>{getInitials(res.teamName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-xs text-foreground">{res.teamName}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono">
                        RANK #{res.placement}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Placement</Label>
                        <Input
                          type="number"
                          min={1}
                          value={res.placement}
                          onChange={(e) => handleInputChange(res.teamId, 'placement', parseInt(e.target.value) || 1)}
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Kills</Label>
                        <Input
                          type="number"
                          min={0}
                          value={res.kills}
                          onChange={(e) => handleInputChange(res.teamId, 'kills', parseInt(e.target.value) || 0)}
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Placement Points</Label>
                        <Input
                          type="number"
                          min={0}
                          value={res.points}
                          onChange={(e) => handleInputChange(res.teamId, 'points', parseInt(e.target.value) || 0)}
                          className="h-9 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Total Score</Label>
                        <Input
                          type="number"
                          min={0}
                          value={res.score}
                          onChange={(e) => handleInputChange(res.teamId, 'score', parseInt(e.target.value) || 0)}
                          className="h-9 rounded-xl text-xs font-mono font-bold text-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={saveResultsMut.isPending || acceptedTeams.length === 0}
                onClick={() => saveResultsMut.mutate(resultInputs)}
                className="rounded-2xl text-xs font-bold gap-1.5 border-white/10"
              >
                <Save className="h-4 w-4 text-emerald-400" />
                {saveResultsMut.isPending ? 'Saving Draft...' : 'Save Draft Results'}
              </Button>

              <Button
                disabled={finalizeResultsMut.isPending || acceptedTeams.length === 0}
                onClick={() => setShowFinalizeConfirm(true)}
                className="rounded-2xl text-xs font-extrabold gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              >
                <CheckCircle className="h-4 w-4" />
                Finalize Results & End Tournament
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Finalize Confirmation Modal */}
      <Dialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <DialogContent className="glass-popup border-amber-500/40 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" /> Confirm Result Finalization
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-muted-foreground leading-relaxed">
              <p className="font-bold text-amber-300 mb-1">Finalizing results will make them official.</p>
              Leaderboard will lock, tournament will transition to COMPLETED, and winner achievements will be granted to top participants.
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFinalizeConfirm(false)}
                className="w-1/2 rounded-2xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                disabled={finalizeResultsMut.isPending}
                onClick={() => finalizeResultsMut.mutate()}
                className="w-1/2 rounded-2xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-black"
              >
                {finalizeResultsMut.isPending ? 'Finalizing...' : 'Yes, Finalize Official Results'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
