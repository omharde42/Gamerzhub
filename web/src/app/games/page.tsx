'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { CANONICAL_GAMES_REGISTRY, GameCapabilityConfig } from '@/config/gamesRegistry';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Gamepad2, Users, Search, ShieldCheck, ShieldAlert, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function GamesDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const games = Object.values(CANONICAL_GAMES_REGISTRY);

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.gameId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#7C3AED]/20 via-[#0B1220] to-[#3B82F6]/20 border border-[#7C3AED]/30 shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#7C3AED] text-white font-extrabold uppercase text-[10px] tracking-wider">
              OFFICIAL 15-GAME REGISTRY
            </Badge>
            <Badge variant="outline" className="text-emerald-400 border-emerald-500/40 text-[10px]">
              CANONICAL CAPABILITIES
            </Badge>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wider font-mono">
            GAMERZ HUB GAME ARENA
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            Discover compatible teammates, create custom scrim sessions, trigger native game invites, or conduct honest room handoffs across all 15 supported titles.
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center shadow-xl shadow-[#7C3AED]/30 shrink-0">
          <Gamepad2 className="h-8 w-8 text-white animate-pulse" />
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="bg-[#0B1220] border-white/10 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 15 games..."
              className="bg-white/5 border-white/10 pl-9 text-xs h-9 text-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['ALL', 'MOBILE', 'CASUAL_BOARD', 'SANDBOX'].map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="text-xs h-8 px-3 whitespace-nowrap border-white/10"
              >
                {cat.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* 15 Games Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => (
          <Link key={game.gameId} href={`/games/${game.gameId}`}>
            <Card className="bg-[#0B1220] border-white/10 hover:border-[#7C3AED] transition-all group overflow-hidden relative flex flex-col justify-between h-full">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider mb-1.5 border-white/15 text-gray-300">
                      P{['bgmi','clashofclans','pubgmobile','freefiremax','smashkarts'].includes(game.gameId) ? '0' : '1'} • {game.category}
                    </Badge>
                    <h3 className="font-bold text-base text-white group-hover:text-[#7C3AED] transition-colors leading-snug">
                      {game.displayName}
                    </h3>
                  </div>
                  <Badge
                    className={`text-[10px] font-bold shrink-0 ${
                      game.identityType === 'OFFICIAL_API'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {game.identityType === 'OFFICIAL_API' ? (
                      <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Official API</span>
                    ) : (
                      <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Self-Reported</span>
                    )}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Join Mode:</span>
                    <span className="font-mono text-gray-200">{game.joinCapability.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Team Model:</span>
                    <span className="font-semibold text-gray-200">{game.teamModel}</span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground italic line-clamp-2">
                  &ldquo;{game.joinInstructions}&rdquo;
                </div>
              </CardContent>

              <div className="p-4 pt-0 border-t border-white/5 mt-2 flex items-center justify-between text-xs text-[#7C3AED] font-bold">
                <span>Enter Teammate Arena</span>
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
