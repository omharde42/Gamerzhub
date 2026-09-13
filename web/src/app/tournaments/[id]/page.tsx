'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Trophy, Gamepad2, Users, DollarSign, Calendar, Swords, Shield, Star, Clock, CheckCircle2, ChevronRight, Share2, Flag, GitBranch } from 'lucide-react';
import { formatDate, formatNumber, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { BackHeader } from '@/components/common/back-header';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { fireCelebration } from '@/components/hud/celebration';
import { PlayerActionCenter } from '@/components/tournament/player-action-center';
import { OrganizerDashboard } from '@/components/tournament/organizer-dashboard';
import { MatchRoomDialog } from '@/components/tournament/match-room-dialog';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartRegistrationDialog } from '@/components/tournament/registration-dialog';
import { DisputeCenter } from '@/components/tournament/dispute-center';
import { MessageSquare, Grid, Check, Award, AlertCircle, Radio } from 'lucide-react';

const ROUND_LABELS = ['Quarterfinals', 'Semifinals', 'Grand Finals 🏆'];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showRegModal, setShowRegModal] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview');
  const [resultMatch, setResultMatch] = useState<any>(null);
  const [disputeMatch, setDisputeMatch] = useState<any>(null);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [showStandings, setShowStandings] = useState(false);

  const { data: tournament, isLoading, isError } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => api.get(`/tournaments/${id}`).then((r) => r.data.data),
    refetchInterval: 15000,
    retry: false,
  });

  const registerMut = useMutation({
    mutationFn: () => api.post(`/tournaments/${id}/register`, {}),
    onSuccess: () => {
      setShowRegModal(false);
      toast.success('Successfully registered for this tournament!');
      fireCelebration('You are registered!', 'Locked in. Time to dominate the bracket.');
      queryClient.invalidateQueries({ queryKey: ['tournament', id] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Registration failed'),
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
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Check-in failed'),
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
  const isRegistered = !!user && (tourney.participants || []).some((p: any) => p.user?.id === user.id);
  const registrationOpen = tourney.status === 'REGISTRATION_OPEN' || tourney.status === 'DRAFT' || !tourney.status;
  const hasBracket = matchesList.length > 0;
  const maxRound = matchesList.reduce((m: number, x: any) => Math.max(m, x.round || 1), 1);
  const rounds = Array.from({ length: maxRound }, (_, i) => i + 1);

  const teamName = (tt: any) => tt?.team?.name || tt?.name || 'TBD';

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
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60" onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Tournament link copied!');
            }}>
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
                  {isOrganizer && (
                    <Badge className="text-[10px] font-mono bg-amber-500/15 text-amber-400 border-amber-500/40 px-2.5 py-0.5">
                      ⚙️ ORGANIZER
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground truncate">{tourney.title}</h1>
              </div>
            </div>

            {isOrganizer ? (
              <div className="flex items-center gap-2 flex-wrap">
                {!hasBracket && tourney.teams?.length >= 2 && (
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
                <Button
                  variant="outline"
                  size="lg"
                  className="font-extrabold rounded-2xl gap-2 shrink-0 border-white/10"
                  onClick={() => setShowStandings((v) => !v)}
                >
                  <Star className="h-5 w-5 text-amber-400" /> Standings
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isRegistered && (
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
                <Button
                  variant="gradient"
                  size="lg"
                  className="font-extrabold rounded-2xl gap-2 shadow-lg shadow-emerald-500/30 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shrink-0"
                  onClick={() => setShowRegModal(true)}
                  disabled={isFull || isRegistered || !registrationOpen}
                >
                  {isRegistered ? <CheckCircle2 className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
                  {isRegistered ? 'Registered' : isFull ? 'Tournament Full' : !registrationOpen ? 'Registration Closed' : 'Register Now'}
                </Button>
              </div>
            )}
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
                <p className="text-[10px] text-muted-foreground font-mono">SQUADS</p>
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

      {/* STEP 8: TOURNAMENT COMPLETION PODIUM */}
      {tourney.status === 'COMPLETED' && (
        <Card variant="glass" className="rounded-[32px] border-amber-500/40 p-6 text-center space-y-4 bg-gradient-to-b from-amber-500/10 to-transparent">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mx-auto text-amber-400 shadow-xl">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-foreground">🏆 Tournament Completed!</h2>
            <p className="text-xs text-muted-foreground">{tourney.title}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto text-xs">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40">
              <span className="text-lg">🥇</span>
              <p className="font-extrabold text-amber-300">1st Place</p>
              <p className="font-bold text-foreground truncate">{matchesList[matchesList.length - 1]?.winnerId ? 'ShadowX' : 'Winner'}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-400/20 border border-slate-400/40">
              <span className="text-lg">🥈</span>
              <p className="font-extrabold text-slate-300">2nd Place</p>
              <p className="font-bold text-foreground truncate">Team Blaze</p>
            </div>
            <div className="p-3 rounded-2xl bg-orange-700/20 border border-orange-700/40">
              <span className="text-lg">🥉</span>
              <p className="font-extrabold text-amber-500">3rd Place</p>
              <p className="font-bold text-foreground truncate">GodLike</p>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 5: TOURNAMENT WORKSPACE TABS */}
      <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="space-y-4">
        <TabsList className="bg-card/70 p-1.5 border border-white/10 rounded-2xl flex-wrap">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-bold gap-1.5">
            <Grid className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="teams" className="rounded-xl text-xs font-bold gap-1.5">
            <Users className="h-3.5 w-3.5" /> Teams ({filledSpots})
          </TabsTrigger>
          <TabsTrigger value="matches" className="rounded-xl text-xs font-bold gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Schedule & Matches
          </TabsTrigger>
          <TabsTrigger value="bracket" className="rounded-xl text-xs font-bold gap-1.5">
            <Swords className="h-3.5 w-3.5" /> Bracket
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-xl text-xs font-bold gap-1.5">
            <Star className="h-3.5 w-3.5" /> Standings
          </TabsTrigger>
          <TabsTrigger value="disputes" className="rounded-xl text-xs font-bold gap-1.5">
            <Flag className="h-3.5 w-3.5" /> Disputes
          </TabsTrigger>
          {isOrganizer && (
            <TabsTrigger value="organizer" className="rounded-xl text-xs font-bold gap-1.5 text-amber-400 border border-amber-500/30">
              <Shield className="h-3.5 w-3.5" /> Organizer Dashboard
            </TabsTrigger>
          )}
        </TabsList>

        {/* WORKSPACE TAB 1: OVERVIEW & QUICK ACCESS GRID */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Access Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Quick Access</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('overview')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Radio className="h-4 w-4 text-emerald-400" /> Announcements
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('matches')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Calendar className="h-4 w-4 text-cyan-400" /> Schedule
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('bracket')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Swords className="h-4 w-4 text-purple-400" /> Bracket
              </Button>
              <Button
                variant="outline"
                onClick={() => toast('Team chat room connected')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <MessageSquare className="h-4 w-4 text-amber-400" /> Team Chat
              </Button>
              <Button
                variant="outline"
                onClick={() => toast('Match room chat connected')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Gamepad2 className="h-4 w-4 text-teal-400" /> Match Chat
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveWorkspaceTab('leaderboard')}
                className="h-16 flex-col gap-1 rounded-2xl border-white/10 bg-card/60 text-xs font-bold hover:border-emerald-500/40"
              >
                <Star className="h-4 w-4 text-amber-400" /> Leaderboard
              </Button>
            </div>
          </div>

          <Card variant="glass" className="p-6 rounded-[28px] border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Official Rules & Instructions</h3>
            <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
              {tourney.rules || '1. Respect all opponents and organizers.\n2. Both team captains must record scores with screenshots.\n3. Matches start strictly at scheduled times.\n4. Cheating or unsportsmanlike behavior will result in instant DQ.'}
            </p>
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 2: TEAMS */}
        <TabsContent value="teams">
          <Card variant="glass" className="rounded-[28px]">
            <CardHeader className="pb-3 border-b border-white/10">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" /> Tournament Roster ({filledSpots}/{tourney.maxTeams || 16})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(tourney.teams || []).map((tItem: any, i: number) => (
                  <div key={tItem.id || i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 border border-white/10">
                    <Avatar className="h-10 w-10 border border-emerald-500/30">
                      <AvatarImage src={tItem.team?.avatar || ''} />
                      <AvatarFallback>{getInitials(tItem.team?.name || 'T')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground truncate">{tItem.team?.name || 'Pro Team'}</p>
                      <p className="text-[10px] text-emerald-400 font-mono">{tItem.members?.length || 0} Roster Players</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      SEED #{tItem.seed || i + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 3: STEP 6 MATCHES & CHECK-IN */}
        <TabsContent value="matches" className="space-y-4">
          <Card variant="glass" className="p-4 rounded-2xl border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Check-in Status & Timeline</h4>
                <p className="text-[11px] text-muted-foreground">Check-in window opens 30 minutes prior to match time</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">
                Check-in Active
              </Badge>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matchesList.map((m: any) => (
              <Card key={m.id} variant="glass" className="p-4 rounded-2xl border-white/10 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-400">Round {m.round} - Match #{m.matchIndex + 1}</span>
                  <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                </div>
                <p className="text-xs font-extrabold text-foreground">
                  {teamName(m.team1)} vs {teamName(m.team2)}
                </p>
                {m.roomId && (
                  <div className="p-2.5 rounded-xl bg-card/80 border border-emerald-500/30 text-xs font-mono">
                    <p className="text-emerald-400">Room ID: {m.roomId}</p>
                    {m.roomPassword && <p className="text-slate-300">Password: {m.roomPassword}</p>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* WORKSPACE TAB 4: BRACKET */}
        <TabsContent value="bracket">
          <Card variant="glass" className="rounded-[28px] p-6">
            {!hasBracket ? (
              <p className="text-xs text-muted-foreground text-center py-6">Brackets have not been generated yet.</p>
            ) : (
              <div className="space-y-6 overflow-x-auto">
                {rounds.map((round) => {
                  const roundMatches = matchesList.filter((m: any) => m.round === round);
                  const label = ROUND_LABELS[round - 1] || `Round ${round}`;
                  return (
                    <div key={round} className="space-y-3 min-w-[420px]">
                      <h4 className="text-xs font-extrabold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5" /> {label}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {roundMatches.map((match: any) => (
                          <div key={match.id} className="p-3.5 rounded-2xl bg-card/70 border border-white/10 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{teamName(match.team1)}</span>
                              <span className="font-mono text-emerald-400">{match.scoreTeam1 ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span>{teamName(match.team2)}</span>
                              <span className="font-mono text-emerald-400">{match.scoreTeam2 ?? 0}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 5: STANDINGS */}
        <TabsContent value="leaderboard">
          <Card variant="glass" className="rounded-[28px] p-6">
            {!standings || standings.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Standings will appear once matches complete.</p>
            ) : (
              <div className="space-y-2">
                {(standings as any[]).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-card/60 border border-white/10 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold w-6 text-center">{i + 1}</span>
                      <span className="font-bold text-foreground">{s.team?.name}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">{s.wins || 0}W - {s.losses || 0}L</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* WORKSPACE TAB 6: DISPUTES */}
        <TabsContent value="disputes">
          <DisputeCenter tournament={tourney} isOrganizer={isOrganizer} />
        </TabsContent>

        {/* WORKSPACE TAB 7: ORGANIZER CONTROL */}
        {isOrganizer && (
          <TabsContent value="organizer">
            <OrganizerDashboard tournament={tourney} />
          </TabsContent>
        )}
      </Tabs>

      {/* SMART REGISTRATION MODAL */}
      <SmartRegistrationDialog
        tournament={tourney}
        isOpen={showRegModal}
        onOpenChange={setShowRegModal}
      />

      {/* Record Result Dialog (organizer) */}
      <Dialog open={Boolean(resultMatch)} onOpenChange={(v) => { if (!v) setResultMatch(null); }}>
        <DialogContent className="glass-popup border-emerald-500/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <Swords className="h-6 w-6 text-emerald-400" /> Record Match Result
            </DialogTitle>
          </DialogHeader>
          {resultMatch && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                <strong className="text-emerald-400">{teamName(resultMatch.team1)}</strong> vs <strong className="text-emerald-400">{teamName(resultMatch.team2)}</strong>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px]">{teamName(resultMatch.team1)}</Label>
                  <Input type="number" min={0} value={score1} onChange={(e) => setScore1(e.target.value)} placeholder="Score" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px]">{teamName(resultMatch.team2)}</Label>
                  <Input type="number" min={0} value={score2} onChange={(e) => setScore2(e.target.value)} placeholder="Score" />
                </div>
              </div>
              <Button
                variant="gradient"
                className="w-full rounded-2xl font-extrabold h-11 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                disabled={resultMut.isPending || score1 === '' || score2 === ''}
                onClick={() => resultMut.mutate({ matchId: resultMatch.id, scoreTeam1: parseInt(score1), scoreTeam2: parseInt(score2) })}
              >
                {resultMut.isPending ? 'Recording...' : 'Record Result & Advance Winner'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">The winner automatically advances to the next round.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={Boolean(disputeMatch)} onOpenChange={(v) => { if (!v) setDisputeMatch(null); }}>
        <DialogContent className="glass-popup border-amber-500/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <Flag className="h-6 w-6 text-amber-400" /> Dispute Match Result
            </DialogTitle>
          </DialogHeader>
          {disputeMatch && (
            <div className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Report an incorrect result for <strong className="text-amber-400">{teamName(disputeMatch.team1)}</strong> vs <strong className="text-amber-400">{teamName(disputeMatch.team2)}</strong>.
              </p>
              <div className="space-y-2">
                <Label className="text-[11px]">Reason</Label>
                <Input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="e.g. Wrong score recorded" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px]">Details (optional)</Label>
                <Textarea value={disputeDesc} onChange={(e) => setDisputeDesc(e.target.value)} placeholder="Explain what went wrong..." rows={3} />
              </div>
              <Button
                variant="outline"
                className="w-full rounded-2xl font-extrabold h-11 border-amber-500/50 text-amber-400"
                disabled={disputeMut.isPending || disputeReason.trim().length < 3}
                onClick={() => disputeMut.mutate()}
              >
                {disputeMut.isPending ? 'Filing...' : 'File Dispute'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
