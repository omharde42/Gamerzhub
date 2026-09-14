'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Flag, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetTeamId?: string;
  targetTeamName?: string;
  targetResultId?: string;
  targetMessageId?: string;
  defaultCategory?: string;
  title?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'MISLEADING_INFO', label: 'Misleading Tournament Info', group: 'Tournament' },
  { value: 'ORGANIZER_MISCONDUCT', label: 'Organizer Misconduct', group: 'Tournament' },
  { value: 'PRIZE_DISPUTE', label: 'Prize Dispute / Prize Non-Payment', group: 'Tournament' },
  { value: 'CANCELLATION_ISSUE', label: 'Unannounced Cancellation', group: 'Tournament' },
  { value: 'UNFAIR_ADMIN', label: 'Unfair Administration', group: 'Tournament' },
  { value: 'CHEATING', label: 'Cheating / Hacking / Suspicious Activity', group: 'Participant' },
  { value: 'HARASSMENT', label: 'Harassment / Threats', group: 'Participant' },
  { value: 'ABUSIVE_LANGUAGE', label: 'Abusive Language / Toxic Chat', group: 'Participant' },
  { value: 'IMPERSONATION', label: 'Impersonation / Fake GamerZ ID', group: 'Participant' },
  { value: 'SPAM', label: 'Spam / Scam / Advertising', group: 'Participant' },
  { value: 'INVALID_ROSTER', label: 'Invalid Roster / Unauthorized Player', group: 'Team' },
  { value: 'INCORRECT_RESULT', label: 'Incorrect Final Placement / Result', group: 'Results' },
  { value: 'SCORE_MANIPULATION', label: 'Score Manipulation / Fake Screenshot', group: 'Results' },
  { value: 'OTHER_RESULT_ISSUE', label: 'Other Result Issue', group: 'Results' },
];

export function ReportDialog({
  isOpen,
  onClose,
  tournamentId,
  targetUserId,
  targetUserName,
  targetTeamId,
  targetTeamName,
  targetResultId,
  targetMessageId,
  defaultCategory = 'GENERAL',
  title = 'Submit Safety Report',
}: ReportDialogProps) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(defaultCategory !== 'GENERAL' ? defaultCategory : 'SUSPICIOUS_ACTIVITY');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');

  const submitMut = useMutation({
    mutationFn: (payload: any) => api.post('/tournaments/reports', payload),
    onSuccess: () => {
      toast.success('Report submitted successfully. Administrators will review it.');
      queryClient.invalidateQueries({ queryKey: ['tournament-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-reports'] });
      onClose();
      setDescription('');
      setSubject('');
      setEvidenceUrl('');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.category?.[0] || 'Failed to submit report';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      toast.error('Please provide a detailed description (at least 5 characters).');
      return;
    }

    submitMut.mutate({
      category,
      subject: subject.trim() || undefined,
      description: description.trim(),
      tournamentId: tournamentId || undefined,
      targetUserId: targetUserId || undefined,
      targetTeamId: targetTeamId || undefined,
      targetResultId: targetResultId || undefined,
      targetMessageId: targetMessageId || undefined,
      evidenceUrl: evidenceUrl.trim() || undefined,
      severity,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Report inappropriate behavior, rule violations, cheating, or result disputes to platform moderation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {targetUserName && (
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              Reporting Player: <span className="font-semibold text-white">{targetUserName}</span>
            </div>
          )}
          {targetTeamName && (
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              Reporting Team: <span className="font-semibold text-white">{targetTeamName}</span>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-zinc-300">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-red-500"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  [{opt.group}] {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-zinc-300">Subject (Optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of the issue"
              className="mt-1 bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-zinc-300">Detailed Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, relevant rules broken, or details of the dispute..."
              rows={4}
              className="mt-1 bg-zinc-900 border-zinc-800 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-zinc-300">Evidence Link (Optional)</Label>
              <Input
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="Cloudinary/Imgur/Drive URL"
                className="mt-1 bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-zinc-300">Severity</Label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-red-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <p className="font-semibold text-zinc-300">Platform Terms Disclaimer:</p>
            <p>
              GamerZ Hub provides tournament management & hosting infrastructure. Tournaments are operated by their listed organizers. GamerZ Hub does not automatically guarantee third-party organizer prizes or external claims.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitMut.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={submitMut.isPending}
            >
              {submitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Flag className="h-4 w-4 mr-1" />}
              Submit Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
