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

const ROUND_LABELS = ['Quarterfinals', 'Semifinals', 'Grand Finals 🏆'];

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showRegModal, setShowRegModal] = useState(false);
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

  const { data: standings } = useQuery({
    queryKey: ['tournament-standings', id],
    queryFn: () => api.get(`/tournaments/${id}/standings`).then((r) => r.data.data),
    enabled: Boolean(showStandings),
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
                  className="font-extrabold rounded-2xl gap-2 shrink-0"
                  onClick={() => setShowStandings((v) => !v)}
                >
                  <Star className="h-5 w-5" /> Standings
                </Button>
              </div>
            ) : (
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

      {/* Standings */}
      {showStandings && (
        <Card variant="glass" className="rounded-[32px]">
          <CardHeader className="pb-3 border-b border-white/10">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" /> Tournament Standings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!standings || standings.length === 0 ? (
              <p className="text-xs text-muted-foreground">Standings appear once matches are played.</p>
            ) : (
              <div className="space-y-2">
                {(standings as any[]).map((s, i) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-card/60 border border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${i === 0 ? 'bg-amber-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-orange-700 text-white' : 'bg-card border border-white/10 text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <span className="font-bold text-sm text-foreground truncate">{s.team?.name || 'Team'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                      <span className="text-emerald-400 font-bold">{s.wins || 0}W</span>
                      <span className="text-red-400 font-bold">{s.losses || 0}L</span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{s.placement ? `#${s.placement}` : '—'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bracket */}
      <Card variant="glass" className="rounded-[32px]">
        <CardHeader className="pb-3 border-b border-white/10 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <Swords className="h-5 w-5 text-emerald-400" /> Tournament Brackets
          </CardTitle>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-mono">
            {maxRound}-ROUND BRACKET
          </Badge>
        </CardHeader>

        <CardContent className="p-6">
          {!hasBracket ? (
            <p className="text-xs text-muted-foreground">
              {isOrganizer
                ? 'Brackets have not been generated yet. Click "Generate Brackets" once at least 2 teams are registered.'
                : 'Brackets will appear once the organizer generates them.'}
            </p>
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
                      {roundMatches.map((match: any) => {
                        const completed = match.status === 'COMPLETED';
                        const winnerId = match.winnerId;
                        return (
                          <div key={match.id} className="p-3.5 rounded-2xl bg-card/70 border border-white/10 hover:border-emerald-500/40 transition-all space-y-2">
                            <div className={`flex items-center justify-between text-xs font-bold p-1.5 rounded-xl bg-card/60 ${completed && winnerId === match.team1Id ? 'border border-emerald-500/50' : ''}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full ${completed && winnerId === match.team1Id ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                                <span className="truncate text-foreground">{teamName(match.team1)}</span>
                                {completed && winnerId === match.team1Id && <Trophy className="h-3 w-3 text-amber-400 shrink-0" />}
                              </div>
                              <span className="font-mono text-emerald-400 font-extrabold text-sm ml-2">{match.scoreTeam1 ?? 0}</span>
                            </div>
                            <div className={`flex items-center justify-between text-xs font-bold p-1.5 rounded-xl bg-card/60 ${completed && winnerId === match.team2Id ? 'border border-emerald-500/50' : ''}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full ${completed && winnerId === match.team2Id ? 'bg-amber-400' : 'bg-teal-500'}`} />
                                <span className="truncate text-foreground">{teamName(match.team2)}</span>
                                {completed && winnerId === match.team2Id && <Trophy className="h-3 w-3 text-amber-400 shrink-0" />}
                              </div>
                              <span className="font-mono text-emerald-400 font-extrabold text-sm ml-2">{match.scoreTeam2 ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                              <span className="font-mono text-emerald-400/90 font-semibold">
                                {completed ? `Winner: ${teamName(winnerId === match.team1Id ? match.team1 : match.team2)}` : 'Scheduled'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {completed && (
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => setDisputeMatch(match)}>
                                    <Flag className="h-3 w-3" /> Dispute
                                  </Button>
                                )}
                                {isOrganizer && !completed && match.team1Id && match.team2Id && (
                                  <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1 border-emerald-500/40 text-emerald-400" onClick={() => { setResultMatch(match); setScore1(''); setScore2(''); }}>
                                    Record Result
                                  </Button>
                                )}
                                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{match.status}</Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disputes list (organizer) */}
      {isOrganizer && tourney.disputes?.length > 0 && (
        <Card variant="glass" className="rounded-[32px] border-amber-500/30">
          <CardHeader className="pb-3 border-b border-white/10">
            <CardTitle className="text-base font-extrabold flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-400" /> Open Disputes ({tourney.disputes.filter((d: any) => d.status === 'OPEN').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {tourney.disputes.filter((d: any) => d.status === 'OPEN').map((d: any) => (
              <div key={d.id} className="p-3.5 rounded-2xl bg-card/60 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">{d.reason}</p>
                  <Badge className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/40">OPEN</Badge>
                </div>
                {d.description && <p className="text-[11px] text-muted-foreground">{d.description}</p>}
                <p className="text-[10px] font-mono text-muted-foreground">by @{d.reporter?.profile?.username || 'unknown'}</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] border-red-500/40 text-red-400"
                    onClick={async () => {
                      try {
                        await api.patch(`/tournaments/${id}/disputes/${d.id}`, { status: 'DISMISSED', resolution: 'Dispute dismissed by organizer' });
                        toast.success('Dispute dismissed');
                        queryClient.invalidateQueries({ queryKey: ['tournament', id] });
                      } catch (e: any) {
                        toast.error(e.response?.data?.message || 'Failed');
                      }
                    }}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-[10px] border-emerald-500/40 text-emerald-400"
                    onClick={async () => {
                      try {
                        await api.patch(`/tournaments/${id}/disputes/${d.id}`, { status: 'RESOLVED', resolution: 'Result verified by organizer' });
                        toast.success('Dispute resolved — result stands');
                        queryClient.invalidateQueries({ queryKey: ['tournament', id] });
                      } catch (e: any) {
                        toast.error(e.response?.data?.message || 'Failed');
                      }
                    }}
                  >
                    Resolve (keep result)
                  </Button>
                </div>
              </div>
            ))}
            {tourney.disputes.filter((d: any) => d.status === 'OPEN').length === 0 && (
              <p className="text-xs text-muted-foreground">No open disputes.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registered Teams Grid */}
      <Card variant="glass" className="rounded-[32px]">
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="text-base font-extrabold flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" /> Registered Teams Roster ({filledSpots}/{tourney.maxTeams || 16})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
            {(tourney.teams || []).map((tItem: any, i: number) => (
              <div key={tItem.id || i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 border border-white/10 hover:border-emerald-500/40 transition-all">
                <Avatar className="h-12 w-12 border border-emerald-500/30 shadow-md">
                  <AvatarImage src={tItem.team?.avatar || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold">
                    {getInitials(tItem.team?.name || 'T')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">{tItem.team?.name || 'Pro Team'}</p>
                  <p className="text-xs text-emerald-400 font-mono font-semibold">{tItem.members?.length || 0} Roster Players</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  SEED #{tItem.seed || i + 1}
                </Badge>
              </div>
            ))}
            {(tourney.participants || []).map((pItem: any) => (
              <div key={pItem.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 border border-white/10 transition-all">
                <Avatar className="h-12 w-12 border border-emerald-500/30 shadow-md">
                  <AvatarImage src={pItem.user?.profile?.avatar || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-700 text-white font-bold">
                    {getInitials(pItem.user?.profile?.username || pItem.user?.id || 'P')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-foreground truncate">{pItem.user?.profile?.username || 'Player'}</p>
                  <p className="text-xs text-emerald-400 font-mono font-semibold">Individual Player</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              </div>
            ))}
            {filledSpots === 0 && (
              <p className="text-xs text-muted-foreground col-span-full">No teams registered yet. Be the first!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registration Dialog Modal */}
      <Dialog open={showRegModal} onOpenChange={setShowRegModal}>
        <DialogContent className="glass-popup border-emerald-500/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <Trophy className="h-6 w-6 text-emerald-400" /> Confirm Tournament Registration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              You are registering for <strong className="text-emerald-400">{tourney.title}</strong>. Registration is free and your spot is confirmed immediately.
            </p>
            <div className="p-3.5 rounded-2xl bg-card/60 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tournament</span>
                <span className="font-bold text-foreground">{tourney.title}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Game</span>
                <span className="font-bold text-emerald-400">{tourney.game}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Spots Left</span>
                <span className="font-bold text-emerald-400">{Math.max((tourney.maxTeams || 16) - filledSpots, 0)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Entry Fee</span>
                <span className="font-bold text-emerald-400">FREE ENTRY</span>
              </div>
            </div>
            <Button
              variant="gradient"
              className="w-full rounded-2xl font-extrabold h-11 shadow-lg shadow-emerald-500/30 bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
              disabled={registerMut.isPending}
              onClick={() => registerMut.mutate()}
            >
              {registerMut.isPending ? 'Registering...' : 'Confirm Registration'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
