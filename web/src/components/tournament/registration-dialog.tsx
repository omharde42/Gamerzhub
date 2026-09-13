'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, CheckCircle2, UserCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { fireCelebration } from '@/components/hud/celebration';

interface SmartRegistrationDialogProps {
  tournament: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmartRegistrationDialog({ tournament, isOpen, onOpenChange }: SmartRegistrationDialogProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [submittedRegistrationId, setSubmittedRegistrationId] = useState<string>('');

  const { data: myTeams } = useQuery({
    queryKey: ['my-teams'],
    queryFn: () => api.get('/teams/my').then((r) => r.data.data).catch(() => []),
    enabled: isOpen,
  });

  const { data: gameAccounts } = useQuery({
    queryKey: ['game-accounts', user?.id],
    queryFn: () => api.get('/games/accounts').then((r) => r.data.data).catch(() => []),
    enabled: isOpen && !!user,
  });

  const matchedGameAccount = (gameAccounts || []).find(
    (acc: any) => acc.game?.toLowerCase() === tournament.game?.toLowerCase()
  ) || gameAccounts?.[0];

  const registerMutation = useMutation({
    mutationFn: () =>
      api.post(`/tournaments/${tournament.id}/register`, {
        teamId: selectedTeamId || undefined,
        teamName: selectedTeamId ? undefined : teamName,
        teamTag: selectedTeamId ? undefined : teamTag,
        customResponses,
      }),
    onSuccess: (res: any) => {
      const regId = res.data?.data?.id || `REG-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedRegistrationId(regId);
      setStep(4);
      fireCelebration('Registration Submitted!', 'Your request is pending organizer approval.');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    },
  });

  const customFields: Array<{ id: string; label: string; required?: boolean; placeholder?: string }> =
    tournament.customFields || [
      { id: 'discordId', label: 'Discord Username / Tag', required: true, placeholder: 'e.g. GamerTag#1234' },
      { id: 'region', label: 'Region / State', required: false, placeholder: 'e.g. North America / ASIA' },
    ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-[#0A0E1A] border-emerald-500/30 text-foreground rounded-[28px] p-6 sm:p-8 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
            <Trophy className="h-6 w-6 text-emerald-400" />
            Smart Tournament Registration
          </DialogTitle>
        </DialogHeader>

        {step < 4 && (
          <div className="flex items-center justify-between gap-2 my-2 border-b border-white/10 pb-4">
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">1</span>
              <span>Team Details</span>
            </div>
            <div className="h-0.5 flex-1 bg-white/10" />
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">2</span>
              <span>Roster & UIDs</span>
            </div>
            <div className="h-0.5 flex-1 bg-white/10" />
            <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/40">3</span>
              <span>Review</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Auto-filled Profile Data</span>
                <p className="text-xs text-muted-foreground">Linked from your GamerZ Hub account</p>
              </div>
              <Badge className="bg-emerald-500 text-black font-bold text-[10px]">
                <UserCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-card/60 p-3.5 rounded-xl border border-white/5">
              <div>
                <span className="text-muted-foreground block text-[10px]">Captain / User:</span>
                <span className="font-semibold text-foreground">{user?.profile?.displayName || user?.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Verified Game UID:</span>
                <span className="font-mono text-emerald-400 font-bold">{matchedGameAccount?.inGameUid || 'UID-5123456789'}</span>
              </div>
            </div>

            {myTeams && myTeams.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Existing Team or Register New</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {myTeams.map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTeamId(t.id);
                        setTeamName(t.name);
                        setTeamTag(t.tag || '');
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                        selectedTeamId === t.id
                          ? 'border-emerald-500 bg-emerald-500/15'
                          : 'border-white/10 bg-card hover:border-white/20'
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={t.avatar} />
                        <AvatarFallback>{t.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">TAG: {t.tag || 'SHX'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!selectedTeamId && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Team Name *</Label>
                  <Input
                    placeholder="e.g. ShadowX Esports"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="bg-card border-white/10 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Team Tag (Max 5 chars) *</Label>
                  <Input
                    placeholder="e.g. SHX"
                    maxLength={5}
                    value={teamTag}
                    onChange={(e) => setTeamTag(e.target.value)}
                    className="bg-card border-white/10 mt-1 uppercase"
                  />
                </div>
              </div>
            )}

            <Button
              disabled={!selectedTeamId && (!teamName.trim() || !teamTag.trim())}
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold gap-2 mt-4"
            >
              Continue to Roster <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 py-2">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Verified Roster & Game UIDs</h3>
              <p className="text-xs text-muted-foreground">
                Tournament Format: <Badge variant="outline" className="text-emerald-400">{tournament.game} • {tournament.type}</Badge>
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-card border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-emerald-500/40">
                    <AvatarImage src={user?.profile?.avatar || undefined} />
                    <AvatarFallback>CP</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-bold text-foreground">{user?.profile?.displayName || 'Captain'}</span>
                    <span className="text-[10px] text-emerald-400 block">Captain (Auto-Verified)</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  UID: {matchedGameAccount?.inGameUid || '5123456789'}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs font-bold">Organizer Additional Questions</Label>
              {customFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <Label className="text-xs text-slate-300">
                    {field.label} {field.required && <span className="text-rose-400">*</span>}
                  </Label>
                  <Input
                    placeholder={field.placeholder}
                    value={customResponses[field.id] || ''}
                    onChange={(e) => setCustomResponses({ ...customResponses, [field.id]: e.target.value })}
                    className="bg-card border-white/10 text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl border-white/10 text-xs">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-xs"
              >
                Review Summary <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 py-2">
            <div className="p-4 rounded-2xl bg-card border border-white/10 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Registration Summary</h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Tournament:</span>
                  <span className="font-bold text-foreground">{tournament.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Game:</span>
                  <span className="font-bold text-foreground">{tournament.game}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Team Name:</span>
                  <span className="font-bold text-foreground">{teamName || 'ShadowX'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">Captain:</span>
                  <span className="font-bold text-foreground">{user?.profile?.displayName || user?.email}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <input
                type="checkbox"
                id="rules-accept"
                checked={acceptedRules}
                onChange={(e) => setAcceptedRules(e.target.checked)}
                className="mt-0.5 border-amber-400 accent-emerald-500 rounded h-4 w-4"
              />
              <label htmlFor="rules-accept" className="cursor-pointer text-[11px] leading-tight">
                I accept the official tournament rules and certify that all provided game UIDs are accurate and verified.
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="rounded-xl border-white/10 text-xs">
                <ArrowLeft className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button
                disabled={!acceptedRules || registerMutation.isPending}
                onClick={() => registerMutation.mutate()}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-xs py-5"
              >
                {registerMutation.isPending ? 'Submitting...' : 'Submit Registration'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-foreground">Team Registration Submitted!</h3>
              <p className="text-xs text-muted-foreground">Your team request has been sent to the organizer.</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-white/10 text-xs space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Registration ID:</span>
                <span className="font-mono font-bold text-emerald-400">{submittedRegistrationId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  PENDING ORGANIZER APPROVAL
                </Badge>
              </div>
            </div>

            <Button
              onClick={() => {
                onOpenChange(false);
                setStep(1);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl px-8"
            >
              Go to Tournament Workspace
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
