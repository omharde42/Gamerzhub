'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
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
  Flame,
  Users,
  ShieldAlert,
  Mic,
  MicOff,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
  Send,
  UserCheck,
  Zap,
  Gamepad2,
  ThumbsUp,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

const RANKS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'HEROIC', 'GRANDMASTER'];
const PLAYSTYLES = ['AGGRESSIVE', 'BALANCED', 'DEFENSIVE', 'SUPPORT', 'STRATEGIC'];
const MODES = ['BR_SQUAD', 'CS_SQUAD', 'LONE_WOLF', 'DUO'];
const LANGUAGES = ['ENGLISH', 'HINDI', 'SPANISH', 'PORTUGUESE', 'INDONESIAN', 'OTHER'];
const AVAILABILITIES = ['NOW', 'TODAY', 'EVENING', 'WEEKENDS'];

export default function FreeFireTeammatesPage() {
  const queryClient = useQueryClient();

  // Filters state
  const [rankFilter, setRankFilter] = useState<string>('ALL');
  const [playstyleFilter, setPlaystyleFilter] = useState<string>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('ALL');

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [ratingTarget, setRatingTarget] = useState<any>(null);
  const [starRating, setStarRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // Fetch current user's Free Fire Profile
  const { data: myProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['freefire-profile'],
    queryFn: () => api.get('/freefire/profile').then((r) => r.data.data),
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    freeFireUid: myProfile?.freeFireUid || '',
    freeFireUsername: myProfile?.freeFireUsername || '',
    preferredMode: myProfile?.preferredMode || 'BR_SQUAD',
    rank: myProfile?.rank || 'HEROIC',
    playstyle: myProfile?.playstyle || 'BALANCED',
    language: myProfile?.language || 'ENGLISH',
    micPreference: myProfile?.micPreference ?? true,
    availability: myProfile?.availability || 'EVENING',
    teammatePreference: myProfile?.teammatePreference || '',
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof profileForm) => api.post('/freefire/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freefire-profile'] });
      queryClient.invalidateQueries({ queryKey: ['freefire-teammates'] });
      setIsProfileModalOpen(false);
      toast.success('Free Fire profile updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  // Fetch teammates candidates
  const { data: teammates = [], isLoading: isTeammatesLoading } = useQuery({
    queryKey: ['freefire-teammates', rankFilter, playstyleFilter, availabilityFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (rankFilter !== 'ALL') params.append('rank', rankFilter);
      if (playstyleFilter !== 'ALL') params.append('playstyle', playstyleFilter);
      if (availabilityFilter !== 'ALL') params.append('availability', availabilityFilter);
      return api.get(`/freefire/teammates?${params.toString()}`).then((r) => r.data.data);
    },
  });

  // Send request mutation
  const sendRequestMutation = useMutation({
    mutationFn: ({ receiverId, message }: { receiverId: string; message: string }) =>
      api.post('/freefire/request', { receiverId, message }),
    onSuccess: () => {
      setSelectedCandidate(null);
      setInviteMessage('');
      toast.success('Teammate invite sent successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    },
  });

  // Rate teammate mutation
  const rateTeammateMutation = useMutation({
    mutationFn: ({ ratedUserId, rating, feedback }: { ratedUserId: string; rating: number; feedback: string }) =>
      api.post('/freefire/rate', { ratedUserId, rating, feedback }),
    onSuccess: () => {
      setRatingTarget(null);
      setStarRating(5);
      setRatingFeedback('');
      queryClient.invalidateQueries({ queryKey: ['freefire-teammates'] });
      toast.success('Rating submitted successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-3xl bg-gradient-to-r from-[#FF6B00]/20 via-[#7C3AED]/20 to-[#0B1220] border border-[#FF6B00]/30 shadow-2xl backdrop-blur-md gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#FF6B00]/30 shrink-0">
            <Flame className="h-8 w-8 text-white animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white uppercase tracking-wider font-mono">
                FREE FIRE TEAMMATE FINDER
              </h1>
              <Badge className="bg-[#FF6B00] text-white font-extrabold text-[10px]">MVP</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Find compatible & trustworthy squad partners based on preferences, mic use, availability, and trust ratings.
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            if (myProfile) {
              setProfileForm({
                freeFireUid: myProfile.freeFireUid || '',
                freeFireUsername: myProfile.freeFireUsername || '',
                preferredMode: myProfile.preferredMode || 'BR_SQUAD',
                rank: myProfile.rank || 'HEROIC',
                playstyle: myProfile.playstyle || 'BALANCED',
                language: myProfile.language || 'ENGLISH',
                micPreference: myProfile.micPreference ?? true,
                availability: myProfile.availability || 'EVENING',
                teammatePreference: myProfile.teammatePreference || '',
              });
            }
            setIsProfileModalOpen(true);
          }}
          className="bg-gradient-to-r from-[#FF6B00] to-[#7C3AED] text-white font-bold h-11 px-6 shadow-xl hover:opacity-90 transition-all shrink-0"
        >
          <Gamepad2 className="mr-2 h-4 w-4" /> My Free Fire Profile
        </Button>
      </div>

      {/* Trust & Transparency Policy Callout */}
      <div className="p-4 rounded-2xl bg-[#0B1220]/80 border border-white/10 flex items-start gap-3 text-xs text-muted-foreground">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-gray-200">Anti-Fabrication & Privacy Guarantee:</span> GamerZ Hub does not invent fake statistics or claim unverified Free Fire server data. All UIDs, ranks, and handles are <Badge variant="outline" className="text-[10px] mx-1 py-0 border-amber-500/40 text-amber-400">Self-Reported</Badge> and validated through community reputation ratings.
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-[#0B1220] border-white/10 p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider shrink-0">
            <Filter className="h-4 w-4 text-[#FF6B00]" /> Filters
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            <div>
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs">
                  <SelectValue placeholder="Rank: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Rank: All Ranks</SelectItem>
                  {RANKS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={playstyleFilter} onValueChange={setPlaystyleFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs">
                  <SelectValue placeholder="Playstyle: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Playstyle: All</SelectItem>
                  {PLAYSTYLES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs">
                  <SelectValue placeholder="Availability: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Availability: All</SelectItem>
                  {AVAILABILITIES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Candidate Teammate Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#FF6B00]" /> Compatible Squad Candidates
          </h2>
          <span className="text-xs text-muted-foreground">{teammates.length} Teammates Found</span>
        </div>

        {isTeammatesLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Calculating compatibility matrix...</p>
          </div>
        ) : teammates.length === 0 ? (
          <Card className="bg-[#0B1220] border-white/10 text-center py-16 p-6">
            <Flame className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Compatible Teammates Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
              Try broadening your rank or playstyle filters, or update your own Free Fire profile to get better matches!
            </p>
            <Button onClick={() => setIsProfileModalOpen(true)} variant="outline" size="sm" className="border-white/20">
              Update My Profile
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teammates.map((item: any) => {
              const profile = item.profile;
              const user = profile.user;
              const displayName = user.profile?.displayName || user.profile?.username || 'Free Fire Gamer';

              return (
                <Card key={profile.id} className="bg-[#0B1220] border-white/10 hover:border-[#FF6B00]/60 transition-all group relative overflow-hidden flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4">
                    {/* Header: User Info & Compatibility Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-[#FF6B00]/80">
                          <AvatarImage src={user.profile?.avatar || ''} />
                          <AvatarFallback className="bg-[#FF6B00]/20 text-[#FF6B00] font-bold">
                            {getInitials(displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-base text-white group-hover:text-[#FF6B00] transition-colors">
                            {displayName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>IGN: {profile.freeFireUsername || 'Not Set'}</span>
                            <Badge variant="outline" className="text-[9px] py-0 border-amber-500/30 text-amber-400">
                              Self-Reported
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Badge
                        className={`text-xs font-black px-2.5 py-1 ${
                          item.compatibility >= 80
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {item.compatibility}% Match
                      </Badge>
                    </div>

                    {/* Stats & Attributes */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rank</p>
                        <p className="font-extrabold text-amber-400">{profile.rank}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Playstyle</p>
                        <p className="font-bold text-gray-200">{profile.playstyle}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Language</p>
                        <p className="font-medium text-gray-300">{profile.language}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Mic</p>
                        <p className="font-medium text-gray-300 flex items-center gap-1">
                          {profile.micPreference ? (
                            <><Mic className="h-3 w-3 text-emerald-400" /> Yes</>
                          ) : (
                            <><MicOff className="h-3 w-3 text-red-400" /> No</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Trust Rating & Availability */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1 text-amber-400 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        <span>{profile.reputationScore.toFixed(1)}</span>
                        <span className="text-[10px] text-muted-foreground">({profile.completedSessions} games)</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                        <Clock className="h-3 w-3 text-blue-400" /> Available {profile.availability}
                      </div>
                    </div>

                    {/* Explainable Reasons */}
                    <div className="flex flex-wrap gap-1">
                      {item.reasons.map((reason: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-white/5 text-gray-300 border border-white/10">
                          ✓ {reason}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>

                  {/* Actions */}
                  <div className="p-4 pt-0 flex items-center gap-2">
                    <Button
                      onClick={() => setSelectedCandidate(item)}
                      className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold h-9 text-xs"
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Invite Squad
                    </Button>
                    <Button
                      onClick={() => setRatingTarget(item)}
                      variant="outline"
                      className="h-9 px-3 border-white/10 hover:bg-white/5 text-amber-400"
                      title="Rate Reliability"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Free Fire Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="bg-[#0B1220] border-white/15 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold font-mono text-[#FF6B00]">
              <Flame className="h-5 w-5" /> Free Fire Gamer Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure your self-reported Free Fire identity to help the algorithm pair you with ideal teammates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Free Fire UID (Optional)</Label>
                <Input
                  value={profileForm.freeFireUid}
                  onChange={(e) => setProfileForm({ ...profileForm, freeFireUid: e.target.value })}
                  placeholder="e.g. 567890123"
                  className="bg-white/5 border-white/10 text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">In-Game Name (IGN)</Label>
                <Input
                  value={profileForm.freeFireUsername}
                  onChange={(e) => setProfileForm({ ...profileForm, freeFireUsername: e.target.value })}
                  placeholder="e.g. Viper#123"
                  className="bg-white/5 border-white/10 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rank Tier</Label>
                <Select value={profileForm.rank} onValueChange={(val) => setProfileForm({ ...profileForm, rank: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Playstyle</Label>
                <Select value={profileForm.playstyle} onValueChange={(val) => setProfileForm({ ...profileForm, playstyle: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYSTYLES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Preferred Mode</Label>
                <Select value={profileForm.preferredMode} onValueChange={(val) => setProfileForm({ ...profileForm, preferredMode: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Primary Language</Label>
                <Select value={profileForm.language} onValueChange={(val) => setProfileForm({ ...profileForm, language: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">General Availability</Label>
                <Select value={profileForm.availability} onValueChange={(val) => setProfileForm({ ...profileForm, availability: val })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABILITIES.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Microphone Use</Label>
                <Select
                  value={profileForm.micPreference ? 'YES' : 'NO'}
                  onValueChange={(val) => setProfileForm({ ...profileForm, micPreference: val === 'YES' })}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YES">Yes (Has Mic)</SelectItem>
                    <SelectItem value="NO">No Mic / Quiet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Teammate Preference Note</Label>
              <Textarea
                value={profileForm.teammatePreference}
                onChange={(e) => setProfileForm({ ...profileForm, teammatePreference: e.target.value })}
                placeholder="Describe what kind of squad partners you are looking for..."
                className="bg-white/5 border-white/10 text-xs min-h-[60px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)} className="border-white/10 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => updateProfileMutation.mutate(profileForm)}
              disabled={updateProfileMutation.isPending}
              className="bg-gradient-to-r from-[#FF6B00] to-[#7C3AED] text-white font-bold text-xs"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      {selectedCandidate && (
        <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
          <DialogContent className="bg-[#0B1220] border-white/15 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-[#FF6B00]" /> Invite Teammate
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Send a squad request to {selectedCandidate.profile.user.profile?.displayName || 'this player'}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a message (e.g. 'Looking for 1 for CS Squad Ranked!')..."
                className="bg-white/5 border-white/10 text-xs min-h-[70px]"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelectedCandidate(null)} className="border-white/10 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  sendRequestMutation.mutate({
                    receiverId: selectedCandidate.profile.userId,
                    message: inviteMessage,
                  })
                }
                disabled={sendRequestMutation.isPending}
                className="bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs"
              >
                {sendRequestMutation.isPending ? 'Sending...' : 'Send Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Rate Teammate Modal */}
      {ratingTarget && (
        <Dialog open={!!ratingTarget} onOpenChange={() => setRatingTarget(null)}>
          <DialogContent className="bg-[#0B1220] border-white/15 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Rate Squad Reliability
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Rate {ratingTarget.profile.user.profile?.displayName || 'this player'} after playing a session together.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStarRating(s)}
                    className="p-1 text-amber-400 hover:scale-125 transition-all"
                  >
                    <Star className={`h-6 w-6 ${s <= starRating ? 'fill-amber-400' : 'text-gray-600'}`} />
                  </button>
                ))}
              </div>

              <Textarea
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Optional feedback (e.g. Great comms, punctual, good cover fire)..."
                className="bg-white/5 border-white/10 text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setRatingTarget(null)} className="border-white/10 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  rateTeammateMutation.mutate({
                    ratedUserId: ratingTarget.profile.userId,
                    rating: starRating,
                    feedback: ratingFeedback,
                  })
                }
                disabled={rateTeammateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
              >
                {rateTeammateMutation.isPending ? 'Submitting...' : 'Submit Rating'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
