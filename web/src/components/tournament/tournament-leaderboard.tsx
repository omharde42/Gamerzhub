'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Shield, Crosshair, Award } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface TournamentLeaderboardProps {
  tournamentId: string;
  isCompleted?: boolean;
}

export function TournamentLeaderboard({ tournamentId, isCompleted }: TournamentLeaderboardProps) {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['tournament-leaderboard', tournamentId],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${tournamentId}/leaderboard`);
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <div className="py-12 text-center text-xs text-muted-foreground">Loading tournament leaderboard...</div>;
  }

  const items = leaderboard || [];

  return (
    <Card variant="glass" className="rounded-[28px] overflow-hidden border-white/10 space-y-4">
      <CardHeader className="pb-3 border-b border-white/10 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-extrabold flex items-center gap-2 text-foreground">
          <Trophy className="h-5 w-5 text-amber-400" />
          Official Tournament Leaderboard
        </CardTitle>
        <Badge
          className={
            isCompleted
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs'
          }
        >
          {isCompleted ? '🏆 FINAL RESULTS' : 'LIVE STANDINGS'}
        </Badge>
      </CardHeader>

      <CardContent className="p-6">
        {items.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">No leaderboard entries calculated yet.</div>
        ) : (
          <div className="space-y-2.5">
            {items.map((row: any, idx: number) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <div
                  key={row.teamId || idx}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-xs ${
                    isFirst
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                      : isSecond
                      ? 'bg-slate-400/10 border-slate-400/40'
                      : isThird
                      ? 'bg-orange-700/10 border-orange-700/40'
                      : 'bg-card/60 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0">
                      {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${row.rank}`}
                    </div>

                    <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                      <AvatarImage src={row.teamAvatar} />
                      <AvatarFallback>{getInitials(row.teamName)}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-foreground truncate">{row.teamName}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Placement: #{row.placement}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-muted-foreground uppercase">Kills</p>
                      <p className="font-bold text-foreground">{row.kills || 0}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[9px] text-muted-foreground uppercase">Points</p>
                      <p className="font-bold text-foreground">{row.points || 0}</p>
                    </div>
                    <div className="text-right bg-card/80 px-3 py-1.5 rounded-xl border border-white/10">
                      <p className="text-[9px] text-emerald-400 font-extrabold uppercase">Final Score</p>
                      <p className="font-mono font-extrabold text-emerald-300 text-sm">{row.score || 0}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
