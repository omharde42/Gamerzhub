'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Gamepad2, Plus, Clock, CheckCircle2, XCircle, Loader2,
  Search, Image as ImageIcon, Hash, Sparkles, Trophy, Swords
} from 'lucide-react';
import { GAMES } from '@/lib/constants';

const GENRES = [
  'FPS', 'Battle Royale', 'MOBA', 'RPG', 'MMORPG', 'Strategy',
  'Sports', 'Racing', 'Fighting', 'Survival', 'Sandbox', 'Horror',
  'Simulation', 'Puzzle', 'Platformer', 'Card Game', 'Rhythm', 'Other'
];

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  PENDING: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock, label: 'Pending' },
  APPROVED: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2, label: 'Approved' },
  REJECTED: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle, label: 'Rejected' },
};

export default function GamesPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showRequest, setShowRequest] = useState(false);
  const [gameName, setGameName] = useState('');
  const [genre, setGenre] = useState('');
  const [logo, setLogo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch approved community games
  const { data: approvedGames, isLoading: approvedLoading } = useQuery({
    queryKey: ['approved-games'],
    queryFn: () => api.get('/game-requests/approved').then(r => r.data.data),
  });

  // Fetch user's own requests (only if authenticated)
  const { data: myRequests, isLoading: myLoading } = useQuery({
    queryKey: ['my-game-requests'],
    queryFn: () => api.get('/game-requests/my').then(r => r.data.data),
    enabled: isAuthenticated,
  });

  // Submit a game request
  const submitRequest = useMutation({
    mutationFn: () => api.post('/game-requests', { gameName, genre, logo: logo || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-game-requests'] });
      queryClient.invalidateQueries({ queryKey: ['approved-games'] });
      setShowRequest(false);
      setGameName('');
      setGenre('');
      setLogo('');
      toast.success('Game request submitted! An admin will review it shortly.');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to submit request'),
  });

  // Dynamic games list managed from Admin Panel (falls back to GAMES if loading)
  const allGames = (approvedGames && approvedGames.length > 0)
    ? approvedGames.map((g: any) => ({
        ...g,
        isDefault: !g.isPlatformGame && !g.id,
      }))
    : GAMES.map((g: string) => ({ gameName: g, genre: 'Popular', logo: null, isDefault: true }));

  const filteredGames = allGames.filter((g: any) =>
    g.gameName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 md:p-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-gaming-purple/20 via-background to-gaming-pink/10 p-6 md:p-8 shadow-xl shadow-primary/5">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:30px_30px]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-gaming-purple to-gaming-pink bg-clip-text text-transparent flex items-center gap-3">
              <Gamepad2 className="h-8 w-8 text-primary" />
              Game Library
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-lg">
              Browse available games on GamerHub. Don't see yours? Request it and our admins will add it to the platform.
            </p>
          </div>
          {isAuthenticated && (
            <Dialog open={showRequest} onOpenChange={setShowRequest}>
              <DialogTrigger asChild>
                <Button className="h-11 px-6 bg-gradient-to-r from-primary to-gaming-purple hover:opacity-95 text-white gap-2 font-semibold shadow-md shadow-primary/20 shrink-0">
                  <Plus className="h-4 w-4" /> Request New Game
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Request a New Game
                  </DialogTitle>
                  <DialogDescription>
                    Submit a game you'd like added to GamerHub. An admin will review and approve it.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5" /> Game Name *
                    </label>
                    <Input
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      placeholder="e.g. Marvel Rivals"
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" /> Genre *
                    </label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="border-primary/20">
                        <SelectValue placeholder="Select a genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRES.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5" /> Logo URL (optional)
                    </label>
                    <Input
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      placeholder="https://example.com/game-logo.png"
                      className="border-primary/20 focus-visible:ring-primary"
                    />
                    {logo && (
                      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 border border-border mt-2">
                        <img src={logo} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-primary/10" loading="lazy" decoding="async" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <span className="text-xs text-muted-foreground">Logo preview</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => submitRequest.mutate()}
                    disabled={!gameName.trim() || !genre || submitRequest.isPending}
                    className="w-full h-11 bg-primary hover:bg-primary/95 text-white mt-2"
                  >
                    {submitRequest.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Request'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="bg-muted/40 border border-primary/10 p-1">
          <TabsTrigger value="library" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Swords className="h-4 w-4" /> Game Library
          </TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger value="my-requests" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Clock className="h-4 w-4" /> My Requests
              {myRequests?.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary text-[9px] px-1.5 py-0">{myRequests.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Game Library Tab */}
        <TabsContent value="library" className="space-y-5">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="pl-10 border-primary/15 focus-visible:ring-primary bg-muted/30"
            />
          </div>

          {approvedLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-28 bg-muted/20 animate-pulse rounded-2xl border border-border/50" />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Gamepad2 className="h-12 w-12 text-primary/30 mx-auto" />
              <p className="font-semibold text-foreground">No games found</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Try a different search or request a new game to be added.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredGames.map((game: any, idx: number) => (
                <div
                  key={`${game.gameName}-${idx}`}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-2xl border border-primary/10 bg-muted/10 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-default h-28"
                >
                  {game.logo ? (
                    <img
                      src={game.logo}
                      alt={game.gameName}
                      className="h-10 w-10 rounded-xl object-cover border border-primary/10 mb-2 group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-gaming-purple/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border border-primary/10">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <span className="text-xs font-semibold text-foreground text-center truncate w-full group-hover:text-primary transition-colors duration-200">
                    {game.gameName}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                    {game.genre}
                  </span>
                  {!game.isDefault && (
                    <Badge variant="secondary" className="absolute top-2 right-2 bg-green-500/10 text-green-500 text-[8px] px-1.5 py-0 border border-green-500/20">
                      Community
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Requests Tab */}
        {isAuthenticated && (
          <TabsContent value="my-requests" className="space-y-4">
            {myLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-2xl border border-border/50" />
                ))}
              </div>
            ) : !myRequests || myRequests.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="font-semibold text-foreground">No game requests yet</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  You haven't submitted any game requests. Click "Request New Game" to add one.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req: any) => {
                  const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <Card key={req.id} className="border-primary/10 hover:border-primary/20 transition-all duration-200 bg-muted/5">
                      <CardContent className="p-4 flex items-center gap-4">
                        {req.logo ? (
                          <img src={req.logo} alt={req.gameName} className="h-12 w-12 rounded-xl object-cover border border-primary/10 shrink-0" loading="lazy" decoding="async" />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
                            <Gamepad2 className="h-6 w-6 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-bold text-foreground text-sm">{req.gameName}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span>{req.genre}</span>
                            <span className="text-border">•</span>
                            <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                          </div>
                          {req.adminNote && (
                            <p className="text-xs text-muted-foreground italic mt-1">Admin: {req.adminNote}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`${statusCfg.color} text-xs font-semibold flex items-center gap-1 shrink-0`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusCfg.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
