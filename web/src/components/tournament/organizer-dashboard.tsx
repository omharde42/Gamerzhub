'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Shield,
  ShieldAlert,
  Activity,
  DollarSign,
  Users,
  Award,
  Check,
  X,
  Radio,
  Lock,
  UserCheck,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CommandCenter } from './command-center';
import { ActivityFeed } from './activity-feed';

interface OrganizerDashboardProps {
  tournament: any;
  apiBaseUrl?: string;
  onRefresh?: () => void;
}

export function OrganizerDashboard({ tournament, apiBaseUrl = '/api', onRefresh }: OrganizerDashboardProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'REQUESTS' | 'SCREENING' | 'MATCH_ROOMS' | 'ANNOUNCEMENTS' | 'FEED' | 'PAYOUTS'>('COMMAND');

  // Rejection Dialog state
  const [rejectingTeam, setRejectingTeam] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Room credentials state
  const [credMatch, setCredMatch] = useState<any>(null);
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [instructions, setInstructions] = useState('');

  // Announcement state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  // Payout state
  const [payoutStage, setPayoutStage] = useState(tournament.payoutStage || 'PENDING');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [updatingPayout, setUpdatingPayout] = useState(false);

  const teamsList = tournament.teams || [];
  const pendingRequests = teamsList.filter((t: any) => t.status === 'PENDING' || t.registrationStatus === 'PENDING_REVIEW');
  const acceptedTeams = teamsList.filter((t: any) => t.status === 'ACCEPTED' || t.registrationStatus === 'ACCEPTED');

  const { data: analytics } = useQuery({
    queryKey: ['tournament-analytics', tournament.id],
    queryFn: () => api.get(`/tournaments/${tournament.id}/analytics`).then((r) => r.data.data).catch(() => null),
  });

  const acceptMutation = useMutation({
    mutationFn: (teamId: string) => api.post(`/tournaments/${tournament.id}/registrations/${teamId}/accept`),
    onSuccess: () => {
      toast.success('Team accepted into tournament!');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      if (onRefresh) onRefresh();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to accept team'),
  });

  const rejectMutation = useMutation({
    mutationFn: (teamId: string) =>
      api.post(`/tournaments/${tournament.id}/registrations/${teamId}/reject`, { rejectionReason }),
    onSuccess: () => {
      toast.success('Team request rejected');
      setRejectingTeam(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      if (onRefresh) onRefresh();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to reject team'),
  });

  const credentialsMutation = useMutation({
    mutationFn: () =>
      api.post(`/tournaments/${tournament.id}/matches/${credMatch.id}/credentials`, {
        roomId,
        roomPassword,
        instructions,
      }),
    onSuccess: () => {
      toast.success('Match room credentials saved!');
      setCredMatch(null);
      setRoomId('');
      setRoomPassword('');
      setInstructions('');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      if (onRefresh) onRefresh();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update credentials'),
  });

  const announcementMutation = useMutation({
    mutationFn: () =>
      api.post(`/tournaments/${tournament.id}/announcements`, { title: annTitle, content: annContent, isPinned: true }),
    onSuccess: () => {
      toast.success('Announcement broadcasted!');
      setAnnTitle('');
      setAnnContent('');
      queryClient.invalidateQueries({ queryKey: ['tournament', tournament.id] });
      queryClient.invalidateQueries({ queryKey: ['tournament-announcements', tournament.id] });
      if (onRefresh) onRefresh();
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to publish announcement'),
  });

  const handleUpdatePayout = async (stage: string) => {
    setUpdatingPayout(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/tournaments/${tournament.id}/payouts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payoutStage: stage,
          payoutDetails: { notes: payoutNotes, updatedAt: new Date() },
        }),
      });
      if (res.ok) {
        setPayoutStage(stage);
        toast.success(`Payout stage updated to ${stage}`);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to update payout stage', err);
    } finally {
      setUpdatingPayout(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Organizer Control Hub</h2>
          </div>
          <p className="text-xs text-gray-400">Manage screening, requests, live matches, room IDs, and payouts</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveTab('COMMAND')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'COMMAND'
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Command Center
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'REQUESTS'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('SCREENING')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'SCREENING'
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" /> Rosters ({acceptedTeams.length})
          </button>
          <button
            onClick={() => setActiveTab('MATCH_ROOMS')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'MATCH_ROOMS'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Room IDs
          </button>
          <button
            onClick={() => setActiveTab('ANNOUNCEMENTS')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'ANNOUNCEMENTS'
                ? 'bg-pink-500/20 text-pink-400 border-pink-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Radio className="h-3.5 w-3.5" /> Broadcasts
          </button>
          <button
            onClick={() => setActiveTab('FEED')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'FEED'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Activity
          </button>
          <button
            onClick={() => setActiveTab('PAYOUTS')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'PAYOUTS'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" /> Payouts
          </button>
        </div>
      </div>

      {/* Analytics Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 rounded-xl border-white/10 bg-white/5">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">Pending Reviews</span>
          <span className="text-xl font-black text-amber-400">{pendingRequests.length}</span>
        </Card>
        <Card className="p-3.5 rounded-xl border-white/10 bg-white/5">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">Accepted Teams</span>
          <span className="text-xl font-black text-emerald-400">{acceptedTeams.length}</span>
        </Card>
        <Card className="p-3.5 rounded-xl border-white/10 bg-white/5">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">Check-in Rate</span>
          <span className="text-xl font-black text-cyan-400">{analytics?.checkInRate || 0}%</span>
        </Card>
        <Card className="p-3.5 rounded-xl border-white/10 bg-white/5">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">Completion Rate</span>
          <span className="text-xl font-black text-purple-400">{analytics?.completionRate || 0}%</span>
        </Card>
      </div>

      {/* TAB CONTENT: COMMAND CENTER */}
      {activeTab === 'COMMAND' && (
        <CommandCenter tournamentId={tournament.id} apiBaseUrl={apiBaseUrl} onRefresh={onRefresh} />
      )}

      {/* TAB CONTENT: REQUESTS */}
      {activeTab === 'REQUESTS' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pending Team Registration Requests</h3>
          {pendingRequests.length === 0 ? (
            <Card className="p-8 text-center rounded-2xl border-white/10 bg-white/5">
              <UserCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="text-sm font-bold text-white">No pending requests</p>
              <p className="text-xs text-gray-400">All registration applications have been processed.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((t: any) => {
                const teamObj = t.team || t;
                return (
                  <Card key={t.id} className="p-4 rounded-2xl border-amber-500/30 bg-black/40 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-emerald-500/40">
                          <AvatarImage src={teamObj.avatar} />
                          <AvatarFallback>{(teamObj.name || 'TM').slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-sm font-extrabold text-white">{teamObj.name || 'Team'}</h4>
                          <span className="text-[11px] text-gray-400 block">
                            Readiness Score: ⚡ {t.readinessScore || 0}%
                          </span>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                        PENDING
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={acceptMutation.isPending}
                        onClick={() => acceptMutation.mutate(t.teamId || t.id)}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl text-xs gap-1"
                      >
                        <Check className="h-4 w-4" /> Accept Roster
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRejectingTeam(t)}
                        className="flex-1 rounded-xl text-xs gap-1"
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SCREENING */}
      {activeTab === 'SCREENING' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Accepted Teams & Roster Readiness</h3>
          {teamsList.length === 0 ? (
            <p className="text-xs text-gray-500 py-6">No teams registered yet.</p>
          ) : (
            <div className="space-y-2">
              {teamsList.map((t: any) => {
                const teamObj = t.team || t;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-4 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center font-bold text-purple-300">
                        {(teamObj.name || 'T')[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-white">{teamObj.name}</h4>
                        <span className="text-[10px] text-gray-400">Readiness Score: ⚡ {t.readinessScore || 0}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded bg-white/10 px-2.5 py-1 text-[10px] font-bold text-gray-300 uppercase">
                        {t.status || t.registrationStatus || 'ACCEPTED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: MATCH ROOM CREDS */}
      {activeTab === 'MATCH_ROOMS' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Match Lobby Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(tournament.matches || []).map((m: any) => (
              <Card key={m.id} className="p-4 rounded-2xl border-white/10 bg-black/40 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-400">Round {m.round} - Match #{m.matchIndex + 1}</span>
                  <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                </div>
                <p className="text-xs font-semibold text-white">
                  {m.team1?.team?.name || 'TBD'} vs {m.team2?.team?.name || 'TBD'}
                </p>

                {m.roomId ? (
                  <div className="bg-white/5 p-2.5 rounded-xl border border-emerald-500/30 text-xs font-mono space-y-0.5">
                    <p className="text-emerald-400">Room ID: {m.roomId}</p>
                    {m.roomPassword && <p className="text-gray-300">Password: {m.roomPassword}</p>}
                  </div>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCredMatch(m);
                    setRoomId(m.roomId || '');
                    setRoomPassword(m.roomPassword || '');
                    setInstructions(m.instructions || '');
                  }}
                  className="w-full text-xs rounded-xl border-white/10 gap-1"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" /> Set Room Credentials
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ANNOUNCEMENTS */}
      {activeTab === 'ANNOUNCEMENTS' && (
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl border-white/10 bg-black/40 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Publish Broadcast Announcement</h4>
            <Input
              placeholder="Announcement Title (e.g. Schedule update / Check-in alert)"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-xs text-white"
            />
            <Textarea
              placeholder="Write announcement details for participants..."
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              className="bg-white/5 border-white/10 text-xs text-white min-h-[80px]"
            />
            <Button
              disabled={!annTitle.trim() || !annContent.trim() || announcementMutation.isPending}
              onClick={() => announcementMutation.mutate()}
              className="bg-emerald-500 text-black font-bold rounded-xl text-xs"
            >
              Broadcast Announcement
            </Button>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: ACTIVITY FEED */}
      {activeTab === 'FEED' && <ActivityFeed tournamentId={tournament.id} apiBaseUrl={apiBaseUrl} />}

      {/* TAB CONTENT: PAYOUTS */}
      {activeTab === 'PAYOUTS' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-400" /> Prize Distribution Stage
              </h3>
              <p className="text-xs text-gray-400">Current Payout Stage: <span className="font-bold text-emerald-400 uppercase">{payoutStage}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => handleUpdatePayout('PENDING')}
              disabled={updatingPayout}
              className={`rounded-lg border p-3 text-xs font-bold uppercase transition-colors ${
                payoutStage === 'PENDING' ? 'bg-amber-500/30 border-amber-500 text-amber-300' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              1. Pending Completion
            </button>

            <button
              onClick={() => handleUpdatePayout('DISTRIBUTING')}
              disabled={updatingPayout}
              className={`rounded-lg border p-3 text-xs font-bold uppercase transition-colors ${
                payoutStage === 'DISTRIBUTING' ? 'bg-cyan-500/30 border-cyan-500 text-cyan-300' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              2. Distributing Prizes
            </button>

            <button
              onClick={() => handleUpdatePayout('COMPLETED')}
              disabled={updatingPayout}
              className={`rounded-lg border p-3 text-xs font-bold uppercase transition-colors ${
                payoutStage === 'COMPLETED' ? 'bg-emerald-500/30 border-emerald-500 text-emerald-300' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              3. Payout Complete
            </button>
          </div>
        </div>
      )}

      {/* REJECTION DIALOG */}
      <Dialog open={Boolean(rejectingTeam)} onOpenChange={(open) => !open && setRejectingTeam(null)}>
        <DialogContent className="bg-[#0A0E1A] border-white/10 text-white rounded-2xl p-6 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-400">Reject Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Provide an optional reason for rejecting {rejectingTeam?.team?.name || 'team'}:</p>
            <Textarea
              placeholder="e.g. Roster incomplete / Ineligible region"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-white/5 border-white/10 text-xs text-white"
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setRejectingTeam(null)} className="flex-1 text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate(rejectingTeam?.teamId || rejectingTeam?.id)}
                className="flex-1 text-xs rounded-xl font-bold"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ROOM CREDENTIALS DIALOG */}
      <Dialog open={Boolean(credMatch)} onOpenChange={(open) => !open && setCredMatch(null)}>
        <DialogContent className="bg-[#0A0E1A] border-white/10 text-white rounded-2xl p-6 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-400">Set Match Room Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-400">Room ID *</span>
              <Input
                placeholder="e.g. 5928103"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="bg-white/5 border-white/10 text-xs text-white mt-1"
              />
            </div>
            <div>
              <span className="text-xs text-gray-400">Room Password</span>
              <Input
                placeholder="e.g. gh123"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-xs text-white mt-1"
              />
            </div>
            <div>
              <span className="text-xs text-gray-400">Instructions / Notes</span>
              <Textarea
                placeholder="e.g. Map: Erangel. Join lobby by 8:45 PM."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="bg-white/5 border-white/10 text-xs text-white mt-1"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setCredMatch(null)} className="flex-1 text-xs rounded-xl">
                Cancel
              </Button>
              <Button
                disabled={!roomId.trim() || credentialsMutation.isPending}
                onClick={() => credentialsMutation.mutate()}
                className="flex-1 bg-emerald-500 text-black font-bold text-xs rounded-xl"
              >
                Save Credentials
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
