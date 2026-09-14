'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { CANONICAL_GAMES_REGISTRY, GameCapabilityConfig } from '@/config/gamesRegistry';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Gamepad2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Send,
  Plus,
  Play,
  Star,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  Flame,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SingleGameArenaPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const rawGameId = (params.gameId as string) || '';
  const gameConfig: GameCapabilityConfig | undefined = CANONICAL_GAMES_REGISTRY[rawGameId.toLowerCase()];

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [activeSessionHandoff, setActiveSessionHandoff] = useState<any>(null);

  // Form states
  const [identityData, setIdentityData] = useState<Record<string, string>>({});
  const [rank, setRank] = useState('UNRANKED');
  const [playstyle, setPlaystyle] = useState('BALANCED');
  const [availability, setAvailability] = useState('EVENING');

  const [sessionForm, setSessionForm] = useState({
    mode: gameConfig?.modes[0] || 'Default',
    title: '',
    roomCode: '',
    roomPassword: '',
    joinUrl: '',
  });

  // Fetch my profile
  const { data: myProfile } = useQuery({
    queryKey: ['game-profile', gameConfig?.gameId],
    queryFn: () => api.get(`/game-adapter/${gameConfig?.gameId}/profile`).then((r) => r.data.data),
    enabled: !!gameConfig,
  });

  // Fetch teammates
  const { data: teammates = [], isLoading: isTeammatesLoading } = useQuery({
    queryKey: ['game-teammates', gameConfig?.gameId],
    queryFn: () => api.get(`/game-adapter/${gameConfig?.gameId}/teammates`).then((r) => r.data.data),
    enabled: !!gameConfig,
  });

  // Upsert profile mutation
  const upsertProfileMutation = useMutation({
    mutationFn: (data: any) => api.post(`/game-adapter/${gameConfig?.gameId}/profile`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-profile', gameConfig?.gameId] });
      queryClient.invalidateQueries({ queryKey: ['game-teammates', gameConfig?.gameId] });
      setIsProfileModalOpen(false);
      toast.success(`${gameConfig?.displayName} profile saved!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (data: any) => api.post('/game-adapter/sessions', data),
    onSuccess: (res: any) => {
      setIsCreateSessionOpen(false);
      setActiveSessionHandoff(res.data.data);
      toast.success('Session created successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create session');
    },
  });

  if (!gameConfig) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white font-mono">GAME NOT FOUND</h2>
        <p className="text-xs text-muted-foreground">The game ID '{rawGameId}' is not registered in GamerZ Hub.</p>
        <Button onClick={() => router.push('/games')} variant="outline" size="sm">
          Return to Games Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Back Button */}
      <Button
        onClick={() => router.push('/games')}
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-white"
      >
        <ChevronLeft className="mr-1 h-4 w-4" /> Back to All Games
      </Button>

      {/* Game Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0B1220] via-[#111827] to-[#0B1220] border border-[#7C3AED]/40 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#7C3AED] text-white font-bold text-[10px]">{gameConfig.category}</Badge>
            <Badge
              variant="outline"
              className={gameConfig.identityType === 'OFFICIAL_API' ? 'text-emerald-400 border-emerald-500/40' : 'text-amber-400 border-amber-500/40'}
            >
              {gameConfig.identityType === 'OFFICIAL_API' ? 'Official API Supported' : 'Self-Reported Identity'}
            </Badge>
          </div>

          <h1 className="text-3xl font-black text-white uppercase font-mono tracking-wide">
            {gameConfig.displayName}
          </h1>

          <p className="text-xs text-muted-foreground max-w-xl italic">
            &ldquo;{gameConfig.joinInstructions}&rdquo;
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0 relative z-10 w-full md:w-auto">
          <Button
            onClick={() => setIsProfileModalOpen(true)}
            variant="outline"
            className="border-white/20 text-white font-bold h-11 text-xs"
          >
            <Gamepad2 className="mr-2 h-4 w-4" /> Game Profile
          </Button>

          <Button
            onClick={() => setIsCreateSessionOpen(true)}
            className="bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-white font-bold h-11 text-xs shadow-xl"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Squad Session
          </Button>
        </div>
      </div>

      {/* Teammates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#7C3AED]" /> Compatible Teammates for {gameConfig.displayName}
          </h2>
          <span className="text-xs text-muted-foreground">{teammates.length} Available</span>
        </div>

        {isTeammatesLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading compatible profiles...</p>
          </div>
        ) : teammates.length === 0 ? (
          <Card className="bg-[#0B1220] border-white/10 text-center py-12 p-6">
            <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Active Teammates Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
              Set up your {gameConfig.displayName} profile to discover players matching your skill and playstyle!
            </p>
            <Button onClick={() => setIsProfileModalOpen(true)} className="bg-[#7C3AED] text-white text-xs h-9">
              Set Up Game Profile
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teammates.map((item: any) => {
              const prof = item.profile;
              const user = prof.user;
              const name = user.profile?.displayName || user.profile?.username || 'Gamer';

              return (
                <Card key={prof.id} className="bg-[#0B1220] border-white/10 hover:border-[#7C3AED] transition-all flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border-2 border-[#7C3AED]">
                          <AvatarImage src={user.profile?.avatar || ''} />
                          <AvatarFallback className="bg-[#7C3AED]/20 text-[#7C3AED] font-bold">
                            {getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-white text-sm">{name}</h4>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            Rank: {prof.rank || 'Unranked'}
                          </span>
                        </div>
                      </div>

                      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold">
                        {item.compatibility}% Match
                      </Badge>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 text-xs space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Playstyle:</span> <span className="text-gray-200 font-medium">{prof.playstyle}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Language:</span> <span className="text-gray-200 font-medium">{prof.language}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.reasons.map((r: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-white/5 text-gray-300">
                          ✓ {r}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>

                  <div className="p-4 pt-0">
                    <Button
                      onClick={() => setSelectedCandidate(item)}
                      className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold h-9"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Invite Teammate
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Game Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="bg-[#0B1220] border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-mono text-[#7C3AED]">
              {gameConfig.displayName} Game Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide identity details required for compatibility matching.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {gameConfig.fields.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label className="text-xs">{field.label}</Label>
                {field.type === 'select' ? (
                  <Select
                    value={identityData[field.name] || ''}
                    onValueChange={(val) => setIdentityData({ ...identityData, [field.name]: val })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={identityData[field.name] || ''}
                    onChange={(e) => setIdentityData({ ...identityData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    className="bg-white/5 border-white/10 text-xs h-9 text-white"
                  />
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rank / Tier</Label>
                <Input
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="e.g. Heroic / Gold"
                  className="bg-white/5 border-white/10 text-xs h-9 text-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Playstyle</Label>
                <Select value={playstyle} onValueChange={setPlaystyle}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGGRESSIVE">AGGRESSIVE</SelectItem>
                    <SelectItem value="BALANCED">BALANCED</SelectItem>
                    <SelectItem value="DEFENSIVE">DEFENSIVE</SelectItem>
                    <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                    <SelectItem value="STRATEGIC">STRATEGIC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)} className="border-white/10 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                upsertProfileMutation.mutate({
                  identityData,
                  rank,
                  playstyle,
                  availability,
                })
              }
              disabled={upsertProfileMutation.isPending}
              className="bg-[#7C3AED] text-white font-bold text-xs"
            >
              Save Game Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Session Modal */}
      <Dialog open={isCreateSessionOpen} onOpenChange={setIsCreateSessionOpen}>
        <DialogContent className="bg-[#0B1220] border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-mono text-[#3B82F6]">
              Create {gameConfig.displayName} Session
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Provide lobby details for session participants.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Game Mode</Label>
              <Select value={sessionForm.mode} onValueChange={(val) => setSessionForm({ ...sessionForm, mode: val })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gameConfig.modes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {gameConfig.sessionModel === 'ROOM_CODE' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Room Code / ID</Label>
                  <Input
                    value={sessionForm.roomCode}
                    onChange={(e) => setSessionForm({ ...sessionForm, roomCode: e.target.value })}
                    placeholder="e.g. 881029"
                    className="bg-white/5 border-white/10 text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Password / Key</Label>
                  <Input
                    value={sessionForm.roomPassword}
                    onChange={(e) => setSessionForm({ ...sessionForm, roomPassword: e.target.value })}
                    placeholder="e.g. 1234"
                    className="bg-white/5 border-white/10 text-xs h-9"
                  />
                </div>
              </div>
            )}

            {gameConfig.sessionModel === 'FRIEND_LINK' && (
              <div className="space-y-1">
                <Label className="text-xs">Friend Link / Direct Room URL</Label>
                <Input
                  value={sessionForm.joinUrl}
                  onChange={(e) => setSessionForm({ ...sessionForm, joinUrl: e.target.value })}
                  placeholder="e.g. https://link.clashofclans.com/..."
                  className="bg-white/5 border-white/10 text-xs h-9"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateSessionOpen(false)} className="border-white/10 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() =>
                createSessionMutation.mutate({
                  gameId: gameConfig.gameId,
                  mode: sessionForm.mode,
                  title: sessionForm.title || `${gameConfig.displayName} Session`,
                  roomCode: sessionForm.roomCode,
                  roomPassword: sessionForm.roomPassword,
                  joinUrl: sessionForm.joinUrl,
                })
              }
              disabled={createSessionMutation.isPending}
              className="bg-[#3B82F6] text-white font-bold text-xs"
            >
              Create Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Handoff Modal */}
      {activeSessionHandoff && (
        <Dialog open={!!activeSessionHandoff} onOpenChange={() => setActiveSessionHandoff(null)}>
          <DialogContent className="bg-[#0B1220] border-white/15 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-400">
                <Sparkles className="h-5 w-5" /> Session Created & Ready
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Honest Join Instructions for {gameConfig.displayName}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <p className="font-semibold text-gray-200">{activeSessionHandoff.joinInstructions.instructions}</p>

              {activeSessionHandoff.joinInstructions.roomCode && (
                <div className="p-2 rounded bg-black/40 font-mono text-amber-400 font-bold">
                  Room ID: {activeSessionHandoff.joinInstructions.roomCode}
                  {activeSessionHandoff.joinInstructions.roomPassword && ` | Key: ${activeSessionHandoff.joinInstructions.roomPassword}`}
                </div>
              )}

              {activeSessionHandoff.joinInstructions.joinUrl && (
                <a
                  href={activeSessionHandoff.joinInstructions.joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 underline font-bold"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Launch In-Game Link
                </a>
              )}
            </div>

            <DialogFooter>
              <Button size="sm" onClick={() => setActiveSessionHandoff(null)} className="bg-emerald-500 text-white font-bold text-xs">
                Got It
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
