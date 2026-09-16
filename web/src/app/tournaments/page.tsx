'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Search, Users, Calendar, Clock, ExternalLink, AlertCircle, Shield, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Upcoming / Open', value: 'REGISTRATION_OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
];

export default function TournamentsPage() {
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: tournamentsData, isLoading, isError } = useQuery({
    queryKey: ['tournaments', search, gameFilter, statusFilter],
    queryFn: async () => {
      const res = await api.get('/tournaments', {
        params: {
          search: search || undefined,
          game: gameFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
    refetchInterval: 30000,
  });

  const displayList = tournamentsData?.data ?? [];

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-400 shrink-0" />
              Tournament Discovery & Arena Leagues
            </h1>
            <Link href="/tournaments/create" className="sm:hidden shrink-0">
              <Button size="sm" variant="gradient" className="gap-1.5 text-xs font-bold rounded-xl px-3 py-1.5 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md">
                <Plus className="h-3.5 w-3.5" /> Create
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Explore live and upcoming competitive esports tournaments powered by GamerZ Hub & Challonge.
          </p>
        </div>

        <Link href="/tournaments/create" className="hidden sm:block shrink-0">
          <Button variant="gradient" className="gap-2 h-10 px-5 text-xs font-extrabold rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-emerald-500/20">
            <Plus className="h-4 w-4" />
            Host / Create Tournament
          </Button>
        </Link>
      </div>

      {/* Host Your Tournament Banner Card */}
      <Card variant="glass" className="p-4 sm:p-5 rounded-[26px] bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900/60 border-emerald-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px] font-mono font-bold px-2.5 py-0.5">
              ⚡ ORGANIZER HUB
            </Badge>
            <h2 className="text-sm sm:text-base font-extrabold text-foreground">Want to Host Your Own Tournament?</h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Create custom brackets, set up check-ins, manage team approvals, release private match room credentials, and award leaderboard points.
            </p>
          </div>
          <Link href="/tournaments/create" className="w-full sm:w-auto shrink-0">
            <Button variant="gradient" className="w-full sm:w-auto gap-2 h-9 px-5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md">
              <Plus className="h-4 w-4" />
              Create Tournament
            </Button>
          </Link>
        </div>
      </Card>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`shrink-0 px-4 h-9 rounded-2xl text-xs font-bold transition-all border ${
              statusFilter === tab.value
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-card/60 text-muted-foreground border-white/10 hover:border-white/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Game Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments by name or game..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-2xl bg-card/60 border-white/10"
          />
        </div>
        <Select value={gameFilter} onValueChange={setGameFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-2xl bg-card/60 border-white/10">
            <SelectValue placeholder="All Games" />
          </SelectTrigger>
          <SelectContent className="glass-popup border-emerald-500/30">
            <SelectItem value="">All Games</SelectItem>
            <SelectItem value="Free Fire">Free Fire</SelectItem>
            <SelectItem value="PUBG">PUBG</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-60 rounded-[28px] bg-card/40" />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <Card variant="glass" className="p-8 text-center rounded-[28px] border-red-500/30 bg-red-950/20">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <h3 className="font-extrabold text-base text-foreground">Unable to load tournaments right now.</h3>
          <p className="text-xs text-muted-foreground mt-1">Please try again later or refresh the page.</p>
        </Card>
      )}

      {/* Tournaments Grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayList.map((t: any, i: number) => {
            const isExternal = t.url && (t.url.startsWith('http://') || t.url.startsWith('https://'));
            const isChallonge = t.source === 'challonge';

            return (
              <motion.div
                key={t.id || i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card variant="glass" className="hover:border-emerald-500/50 transition-all rounded-[28px] overflow-hidden group h-full flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2 min-w-0">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono px-2.5 py-0.5 font-bold border ${
                            isChallonge
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                          }`}
                        >
                          {isChallonge ? '⚡ Challonge' : '🏆 GamerZ Hub'}
                        </Badge>

                        {t.status && (
                          <Badge variant="outline" className="text-[10px] font-mono bg-white/5 text-gray-300 border-white/10 px-2 py-0.5 uppercase">
                            {t.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>

                      {/* Tournament Name & Game */}
                      <div>
                        <h3 className="font-extrabold text-base text-foreground group-hover:text-emerald-400 transition-colors line-clamp-2">
                          {t.name || t.title}
                        </h3>
                        <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">
                          {t.game || 'Esports Tournament'}
                        </p>
                      </div>

                      {/* Description if available */}
                      {t.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 font-sans pt-1">
                          {t.description.replace(/<[^>]*>?/gm, '')}
                        </p>
                      )}
                    </div>

                    {/* Metadata & Footer */}
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium truncate">
                          <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          {t.participants !== null ? `${t.participants}` : '0'}/{t.maxParticipants ? t.maxParticipants : '∞'}
                        </span>
                        <span className="flex items-center gap-1 font-medium truncate">
                          <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                          {t.startDate ? formatDate(t.startDate) : 'TBD'}
                        </span>
                      </div>

                      {t.organizer && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Shield className="h-3 w-3 text-purple-400 shrink-0" />
                          <span className="truncate">Organizer: {t.organizer}</span>
                        </div>
                      )}

                      {/* View Tournament Action */}
                      <div className="pt-1">
                        {isExternal ? (
                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 text-xs font-extrabold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md hover:opacity-95 transition-opacity"
                          >
                            View Tournament <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href={t.url || `/tournaments/${t.id}`}>
                            <Button variant="gradient" size="sm" className="w-full h-9 px-4 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md">
                              View Tournament
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && displayList.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-bold text-foreground text-base">No tournaments found</p>
          <p className="text-xs mt-1">Try adjusting your search query or selecting a different game filter.</p>
        </div>
      )}
    </div>
  );
}
