'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Trophy,
  Gamepad2,
  Users,
  DollarSign,
  Calendar,
  Swords,
  Shield,
  Star,
  Clock,
  CheckCircle2,
  Share2,
  Flag,
  GitBranch,
  MessageSquare,
  Grid,
  Radio,
  Lock,
  Bell,
  UserCheck,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { formatDate, formatNumber, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { BackHeader } from '@/components/common/back-header';
import toast from 'react-hot-toast';
import { fireCelebration } from '@/components/hud/celebration';
import { PlayerActionCenter } from '@/components/tournament/player-action-center';
import { OrganizerDashboard } from '@/components/tournament/organizer-dashboard';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartRegistrationDialog } from '@/components/tournament/registration-dialog';
import { DisputeCenter } from '@/components/tournament/dispute-center';
import { TournamentWorkspaceChat } from '@/components/tournament/tournament-workspace-chat';
import { OrganizerResultEntryDialog } from '@/components/tournament/organizer-result-entry-dialog';
import { TournamentLeaderboard } from '@/components/tournament/tournament-leaderboard';

const ROUND_LABELS = ['Quarterfinals', 'Semifinals', 'Grand Finals 🏆'];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [showRegModal, setShowRegModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview');
  const [resultMatch, setResultMatch] = useState<any>(null);
  const [disputeMatch, setDisputeMatch] = useState<any>(null);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [showStandings, setShowStandings] = useState(false);

  // New Announcement form state (organizer)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState('');

  // Main tournament details query
  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => api.get(`/tournaments/${id}`).then((r) => r.data.data),
    refetchInterval: 15000,
    retry: false,
  });

  // Dedicated Workspace query (with RBAC enforcement)
  const { data: workspaceData } = useQuery({
    queryKey: ['tournament-workspace', id],
    queryFn: () => api.get(`/tournaments/${id}/workspace`).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: 10000,
  });

  const bracketsMut = useMutation({
    mutationFn: () => api.post(`/tournaments/${id}/brackets`),
    onSuccess: () => {
      toast.success('Bracket generated!');
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to generate brackets'),
  });

  const resultMut = useMutation({
    mutationFn: (vars: { matchId: string; scoreTeam1: number; scoreTeam2: number }) =>
      api.post(`/tournaments/${id}/matches/${vars.matchId}/result`, { scoreTeam1: vars.scoreTeam1, scoreTeam2: vars.scoreTeam2 }),
    onSuccess: () => {
      setResultMatch(null);
      setScore1('');
      setScore2('');
      toast.success('Match result recorded — winner advanced');
      fireCelebration('Victory recorded!', 'The winner advances to the next round.');
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to record result'),
  });

  const disputeMut = useMutation({
    mutationFn: () => api.post(`/tournaments/${id}/matches/${disputeMatch?.id}/disputes`, { reason: disputeReason, description: disputeDesc }),
    onSuccess: () => {
      setDisputeMatch(null);
      setDisputeReason('');
      setDisputeDesc('');
      toast.success('Dispute filed — an organizer will review it');
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to file dispute'),
  });

  const checkInMut = useMutation({
    mutationFn: () => api.post(`/tournaments/${id}/check-in`),
    onSuccess: () => {
      toast.success('Check-in confirmed!');
      fireCelebration('Checked In!', 'Your team is ready for match assignment.');
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      queryClient.invalidateQueries({ queryKey: ['tournament-workspace', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Check-in failed'),
  });

  const announcementMut = useMutation({
    mutationFn: () =>
      api.post(`/tournaments/${id}/announcements`, {
        title: announcementTitle,
        message: announcementMsg,
      }),
    onSuccess: () => {
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementMsg('');
      toast.success('Announcement published to tournament workspace!');
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      queryClient.invalidateQueries({ queryKey: ['tournament-workspace', id] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to publish announcement'),
  });

  const { data: standings } = useQuery({
    queryKey: ['tournament-standings', id],
    queryFn: () => api.get(`/tournaments/${id}/standings`).then((r) => r.data.data),
    enabled: Boolean(showStandings || activeWorkspaceTab === 'leaderboard'),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (isError || !tournament) {
    return (
      <div className="max-w-5xl mx-auto">
        <BackHeader title="Tournament Arena" />
        <Card variant="glass" className="rounded-[32px] border-white/10 p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Trophy className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-foreground">Tournament not found</h2>
            <p className="text-xs text-muted-foreground mt-1">This tournament doesn&apos;t exist or is no longer available.</p>
          </div>
          <Link href="/tournaments">
            <Button variant="gradient" className="rounded-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              Back to Tournaments
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const tourney = tournament;
  const isOrganizer = Boolean(tourney.isOrganizer);
  const matchesList = tourney.matches || [];
  const teamCount = tourney.teams?.length || 0;
  const participantCount = tourney.participants?.length || 0;
  const filledSpots = teamCount + participantCount;
  const isFull = filledSpots >= (tourney.maxTeams || 16);

  // Participant registration & workspace authorization status
  const userTeam = (tourney.teams || []).find((t: any) =>
    (t.members || []).some((m: any) => m.userId === user?.id || m.user?.id === user?.id)
  );
  const userParticipant = (tourney.participants || []).find((p: any) => p.userId === user?.id || p.user?.id === user?.id);

  const userStatus = userTeam?.status || userParticipant?.status || (userTeam ? 'PENDING' : null);
  const isApprovedParticipant = isOrganizer || userStatus === 'ACCEPTED' || userStatus === 'APPROVED' || userStatus === 'ACTIVE';

  const registrationOpen = tourney.status === 'REGISTRATION_OPEN' || tourney.status === 'DRAFT' || !tourney.status;
  const hasBracket = matchesList.length > 0;
  const maxRound = matchesList.reduce((m: number, x: any) => Math.max(m, x.round || 1), 1);
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  const teamName = (tt: any) => tt?.team?.name || tt?.name || 'TBD';

  const announcements = workspaceData?.announcements || tourney.announcements || [];
  const roomCredentials = workspaceData?.roomCredentials;

  return (
    <div className="max-w-5xl mx-auto space-y-6 overflow-x-hidden">
      <BackHeader title="Tournament Arena" />

      {/* Player Action Center Tray */}
      <PlayerActionCenter />

      {/* Organizer Control Dashboard if user is organizer */}
      {isOrganizer && (
        <OrganizerDashboard
          tournament={tourney}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['tournament', id] })}
        />
      )}

      {/* Hero Banner */}
      <Card variant="glass" className="overflow-hidden rounded-[32px] border border-emerald-500/40 shadow-2xl relative">
        <div className="h-44 bg-gradient-to-r from-[#030509] via-[#0A0E1D] to-[#0F172A] relative overflow-hidden">
          <div className="scanlines absolute inset-0 pointer-events-none z-[1]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.25),transparent_70%)]" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Badge className="bg-emerald-500 text-black font-extrabold text-xs px-3 py-1 rounded-full shadow-[0_0_18px_rgba(16,185,129,0.7)] border border-emerald-300/50 animate-pulse">
              💰 ${formatNumber(tourney.prizePool || 0)} PRIZE POOL
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Tournament link copied!');
              }}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="hud-corners absolute inset-0 pointer-events-none z-[2]" />

        <CardContent className="relative px-6 sm:px-8 pb-6 -mt-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
            <div className="flex items-end gap-4 min-w-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-xl shrink-0">
                <div className="w-full h-full rounded-[14px] bg-[#0A0E17] flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-emerald-400" />
                </div>
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border-emerald-500/40 px-2.5 py-0.5 font-bold">
                    ⚔️ {tourney.status?.replace('_', ' ') || 'REGISTRATION OPEN'}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono bg-card text-slate-300 border border-white/10 px-2.5 py-0.5">
                    {tourney.type?.replace('_', ' ') || 'SINGLE ELIMINATION'}
                  </Badge>
                  {isApprovedParticipant && (
                    <Badge className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border-emerald-500/40 px-2.5 py-0.5">
                      ✓ APPROVED PARTICIPANT
                    </Badge>
                  )}
                  {userStatus === 'PENDING' && (
                    <Badge className="text-[10px] font-mono bg-amber-500/20 text-amber-400 border-amber-500/40 px-2.5 py-0.5">
                      ⏳ REGISTRATION PENDING
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground truncate">{tourney.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isOrganizer && tourney.status !== 'COMPLETED' && (
                <Button
                  size="lg"
                  onClick={() => setShowResultModal(true)}
                  className="font-extrabold rounded-2xl gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                >
                  <Trophy className="h-5 w-5" />
                  Enter Results
                </Button>
              )}

              {isOrganizer && !hasBracket && tourney.teams?.length >= 2 && (
                <Button
                  variant="gradient"
                  size="lg"
                  className="font-extrabold rounded-2xl gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shrink-0 shadow-lg shadow-amber-500/30"
                  onClick={() => bracketsMut.mutate()}
                  disabled={bracketsMut.isPending}
                >
                  <GitBranch className="h-5 w-5" />
                  {bracketsMut.isPending ? 'Generating...' : 'Generate Brackets'}
                </Button>
              )}

              {isApprovedParticipant && (
                <Button
                  size="lg"
                  disabled={checkInMut.isPending}
                  onClick={() => checkInMut.mutate()}
                  className="font-extrabold rounded-2xl gap-2 bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {checkInMut.isPending ? 'Checking in...' : 'Check In Now'}
                </Button>
              )}

              {!isApprovedParticipant && userStatus !== 'PENDING' && (
                <Button
                  variant="gradient"
                  size="lg"
                  className="font-extrabold rounded-2xl gap-2 shadow-lg shadow-emerald-500/30 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shrink-0"
                  onClick={() => setShowRegModal(true)}
                  disabled={isFull || !registrationOpen}
                >
                  <Swords className="h-5 w-5" />
                  {isFull ? 'Tournament Full' : !registrationOpen ? 'Registration Closed' : 'Register Now'}
                </Button>
              )}
            </div>
          </div>

          <div className="clip-hud grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-card/60 border border-white/10 text-xs relative">
            <span className="hud-corners absolute inset-0 pointer-events-none" style={{ ['--hud-c' as any]: 'rgba(16,185,129,0.6)' }} />
            <div className="flex items-center gap-2.5">
              <Gamepad2 className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">GAME</p>
                <p className="font-bold text-foreground">{tourney.game}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">CAPACITY</p>
                <p className="font-bold text-foreground">{filledSpots}/{tourney.maxTeams || 16} Teams</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">ENTRY FEE</p>
                <p className="font-bold text-emerald-400">FREE ENTRY</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-muted-foreground font-mono">START DATE</p>
                <p className="font-bold text-foreground">{formatDate(tourney.startDate)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* REGISTRATION PENDING NOTICE */}
      {userStatus === 'PENDING' && (
        <Card variant="glass" className="rounded-2xl p-4 border-amber-500/40 bg-amber-500/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-300">Registration Pending Approval</p>
              <p className="text-[11px] text-muted-foreground">
                Your team registration is under review by the tournament organizer. Workspace chat and room credentials will unlock upon approval.
              </p>
            </div>
          </div>
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 shrink-0">PENDING</Badge>
        </Card>
      )}

      {/* TOURNAMENT WORKSPACE NAVIGATION TABS */}
      <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="space-y-4">
        <TabsList className="bg-card/70 p-1.5 border border-white/10 rounded-2xl flex-wrap">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-bold gap-1.5">
            <Grid className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="participants" className="rounded-xl text-xs font-bold gap-1.5">
            <Users className="h-3.5 w-3.5" /> Participants ({filledSpots})
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-xl text-xs font-bold gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Rules
          </TabsTrigger>
          <TabsTrigger value="announcements" className="rounded-xl text-xs font-bold gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Announcements ({announcements.length})
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-xl text-xs font-bold gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> Workspace Chat
          </TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-xl text-xs font-bold gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Schedule & Check-In
          </TabsTrigger>
          <TabsTrigger value="credentials" className="rounded-xl text-xs font-bold gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-400" /> Room Credentials
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-xl text-xs font-bold gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" /> Leaderboard
          </TabsTrigger>
        </TabsList>

        {/* WORKSPACE TAB 1: OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Tournament Quick Workspace Access</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('announcements')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Bell className="h-4 w-4 text-emerald-400" /> Announcements
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('chat')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <MessageSquare className="h-4 w-4 text-emerald-400" /> Tournament Chat
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('schedule')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Calendar className="h-4 w-4 text-cyan-400" /> Schedule & Check-in
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('credentials')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Lock className="h-4 w-4 text-amber-400" /> Room Credentials
              </Button>
            </div>
          </div>

          {/* Recent Announcements Snippet */}
          <Card variant="glass" className="p-6 rounded-[28px] border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-400" /> Latest Announcements
              </h3>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-400" onClick={() => setActiveWorkspaceTab('announcements')}>
                View All ({announcements.length})
              </Button>
            </div>
            {announcements.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No organizer announcements published yet.</p>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 2).map((a: any) => (
                  <div key={a.id} className="p-3.5 rounded-2xl bg-card/60 border border-white/10 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{a.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 2: PARTICIPANTS & TEAMS */}
        <TabsContent value="participants">
          <Card variant="glass" className="rounded-[28px]">
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" /> Approved Tournament Participants & Rosters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {tourney.teams?.length === 0 && tourney.participants?.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">No approved participants yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(tourney.teams || []).map((tItem: any, i: number) => (
                    <Card key={tItem.id || i} variant="glass" className="p-4 rounded-2xl border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-emerald-500/30">
                            <AvatarImage src={tItem.team?.avatar || ''} />
                            <AvatarFallback>{getInitials(tItem.team?.name || 'T')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-xs text-foreground">{tItem.team?.name || 'Team'}</p>
                            <p className="text-[10px] text-emerald-400 font-mono">Status: {tItem.status || 'ACCEPTED'}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          {tItem.isCheckedIn ? '✓ CHECKED IN' : '⏳ NOT CHECKED IN'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-extrabold text-muted-foreground uppercase">Team Roster Members</p>
                        {(tItem.members || []).map((mem: any, idx: number) => (
                          <div key={mem.id || idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-card/60">
                            <span className="font-bold text-slate-200">
                              {mem.isCaptain || idx === 0 ? '👑 Captain: ' : '🎮 Player: '}
                              {mem.user?.username || mem.gameAccount?.ign || 'GamerZ ID'}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-400">
                              {mem.gameAccount?.ign || mem.user?.gamerTag || 'Verified Profile'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 3: RULES */}
        <TabsContent value="rules">
          <Card variant="glass" className="p-6 rounded-[28px] border-white/10 space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" /> Tournament Rules & Regulations
            </h3>
            <div className="p-4 rounded-2xl bg-card/60 border border-white/10 text-xs leading-relaxed text-slate-300 whitespace-pre-line">
              {tourney.rules ||
                '1. Respect all opponents and tournament organizers.\n2. All team captains must confirm check-in within the specified check-in window.\n3. Match credentials (Room ID & Password) will be released in the credentials workspace tab prior to match start.\n4. Cheating, hacks, or unsportsmanlike conduct will result in instant disqualification.'}
            </div>
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 4: ANNOUNCEMENTS */}
        <TabsContent value="announcements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-400" /> Official Announcements
            </h3>
            {isOrganizer && (
              <Button
                size="sm"
                onClick={() => setShowAnnouncementModal(true)}
                className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-black"
              >
                <Plus className="h-3.5 w-3.5" /> Post Announcement
              </Button>
            )}
          </div>

          {announcements.length === 0 ? (
            <Card variant="glass" className="p-8 rounded-[28px] text-center text-xs text-muted-foreground">
              No announcements published yet.
            </Card>
          ) : (
            announcements.map((ann: any) => (
              <Card key={ann.id} variant="glass" className="p-5 rounded-[24px] border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-emerald-400">{ann.title}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {ann.createdAt ? new Date(ann.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{ann.message}</p>
                <div className="pt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Posted by: {ann.organizer?.username || 'Tournament Organizer'}</span>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* WORKSPACE TAB 5: WORKSPACE CHAT */}
        <TabsContent value="chat">
          <TournamentWorkspaceChat
            tournamentId={id as string}
            isApprovedParticipant={isApprovedParticipant}
            isOrganizer={isOrganizer}
            userStatus={userStatus}
          />
        </TabsContent>

        {/* WORKSPACE TAB 6: SCHEDULE & CHECK-IN */}
        <TabsContent value="schedule" className="space-y-4">
          <Card variant="glass" className="p-6 rounded-[28px] border-white/10 space-y-4">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-400" /> Tournament Schedule & Check-In Window
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-card/60 border border-white/10 space-y-1">
                <p className="text-[10px] text-muted-foreground font-mono uppercase">Registration Deadline</p>
                <p className="font-bold text-foreground">{tourney.registrationEnd ? formatDate(tourney.registrationEnd) : 'Standard'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-card/60 border border-white/10 space-y-1">
                <p className="text-[10px] text-muted-foreground font-mono uppercase">Check-In Window</p>
                <p className="font-bold text-emerald-400">Opens 30 mins prior to match</p>
              </div>
              <div className="p-4 rounded-2xl bg-card/60 border border-white/10 space-y-1">
                <p className="text-[10px] text-muted-foreground font-mono uppercase">Tournament Start Time</p>
                <p className="font-bold text-foreground">{formatDate(tourney.startDate)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Team Readiness Check-In</p>
                <p className="text-[11px] text-muted-foreground">Team Captains must confirm team check-in prior to match setup.</p>
              </div>

              {isApprovedParticipant ? (
                <Button
                  size="lg"
                  disabled={checkInMut.isPending}
                  onClick={() => checkInMut.mutate()}
                  className="font-extrabold rounded-2xl gap-2 bg-emerald-500 hover:bg-emerald-600 text-black"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {checkInMut.isPending ? 'Processing...' : 'Confirm Team Check-In'}
                </Button>
              ) : (
                <Badge variant="outline" className="text-xs p-2 bg-amber-500/10 text-amber-400 border-amber-500/30">
                  Approved Participants Only
                </Badge>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 7: ROOM CREDENTIALS */}
        <TabsContent value="credentials">
          {!isApprovedParticipant ? (
            <Card variant="glass" className="rounded-[28px] p-8 text-center space-y-4 border-amber-500/30">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Lock className="h-7 w-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-extrabold text-foreground">Match Room Credentials Locked</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Room IDs and passwords are accessible strictly to approved participants and organizers.
                </p>
              </div>
            </Card>
          ) : !roomCredentials?.roomId ? (
            <Card variant="glass" className="rounded-[28px] p-8 text-center space-y-3 border-white/10">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto" />
              <h3 className="text-sm font-extrabold text-foreground">Room Credentials Not Released Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                The organizer will release the custom match Room ID and Password prior to match start. Check back shortly.
              </p>
            </Card>
          ) : (
            <Card variant="glass" className="rounded-[28px] p-6 border-emerald-500/40 space-y-4 bg-emerald-500/5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-emerald-400" />
                  <div>
                    <h3 className="text-base font-extrabold text-foreground">Official Match Room Credentials</h3>
                    <p className="text-xs text-muted-foreground">Keep room credentials confidential within your team.</p>
                  </div>
                </div>
                <Badge className="bg-emerald-500 text-black font-extrabold text-xs">RELEASED</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-card/80 border border-emerald-500/30 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase">Room ID</p>
                  <p className="text-lg font-mono font-extrabold text-emerald-400 select-all">{roomCredentials.roomId}</p>
                </div>
                <div className="p-4 rounded-2xl bg-card/80 border border-emerald-500/30 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-mono uppercase">Room Password</p>
                  <p className="text-lg font-mono font-extrabold text-slate-200 select-all">{roomCredentials.roomPassword || 'None'}</p>
                </div>
              </div>

              {roomCredentials.instructions && (
                <div className="p-4 rounded-2xl bg-card/60 border border-white/10 text-xs space-y-1">
                  <p className="font-bold text-foreground">Organizer Instructions:</p>
                  <p className="text-muted-foreground leading-relaxed">{roomCredentials.instructions}</p>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* WORKSPACE TAB 8: LEADERBOARD */}
        <TabsContent value="leaderboard">
          <TournamentLeaderboard tournamentId={id as string} isCompleted={tourney.status === 'COMPLETED'} />
        </TabsContent>
      </Tabs>

      {/* SMART REGISTRATION MODAL */}
      <SmartRegistrationDialog tournament={tourney} isOpen={showRegModal} onOpenChange={setShowRegModal} />

      {/* ORGANIZER RESULT ENTRY MODAL */}
      <OrganizerResultEntryDialog tournament={tourney} isOpen={showResultModal} onOpenChange={setShowResultModal} />

      {/* POST ANNOUNCEMENT MODAL (ORGANIZER) */}
      <Dialog open={showAnnouncementModal} onOpenChange={setShowAnnouncementModal}>
        <DialogContent className="glass-popup border-emerald-500/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" /> Post Tournament Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs">Announcement Title</Label>
              <Input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="e.g. Custom Room Details Released"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Message</Label>
              <Textarea
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                placeholder="Enter details for tournament participants..."
                rows={4}
                className="rounded-xl"
              />
            </div>
            <Button
              disabled={announcementMut.isPending || !announcementTitle.trim() || !announcementMsg.trim()}
              onClick={() => announcementMut.mutate()}
              className="w-full rounded-2xl font-extrabold bg-emerald-500 hover:bg-emerald-600 text-black h-11"
            >
              {announcementMut.isPending ? 'Publishing...' : 'Publish Announcement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
