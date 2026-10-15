'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Swords, Users, Star, Clock, Calendar, Loader2, Sparkles, User, AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AdminSessionsTab() {
  const [sessionType, setSessionType] = useState<'SCRIM' | 'CHALLENGE' | 'TEAMMATE_REQUEST'>('SCRIM');
  const [page, setPage] = useState(1);

  // Ratings sub-view
  const [activeView, setActiveView] = useState<'sessions' | 'ratings'>('sessions');

  // Query Sessions
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['admin-gaming-sessions', sessionType, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', sessionType);
      params.append('page', page.toString());
      params.append('limit', '15');
      const res = await api.get(`/admin/gaming-sessions?${params.toString()}`);
      return res.data;
    },
    enabled: activeView === 'sessions',
  });

  // Query Peer Ratings
  const { data: ratingData, isLoading: ratingLoading } = useQuery({
    queryKey: ['admin-session-ratings', page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      const res = await api.get(`/admin/session-ratings?${params.toString()}`);
      return res.data;
    },
    enabled: activeView === 'ratings',
  });

  const sessions = sessionData?.data || [];
  const sessionMeta = sessionData?.meta || { total: 0, totalPages: 1 };

  const ratings = ratingData?.data || [];
  const ratingMeta = ratingData?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-4">
      {/* Sub Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
        <button
          onClick={() => {
            setActiveView('sessions');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeView === 'sessions'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Gaming Sessions &amp; Matches
        </button>
        <button
          onClick={() => {
            setActiveView('ratings');
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeView === 'ratings'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Teammate Feedback &amp; Peer Ratings
        </button>
      </div>

      {activeView === 'sessions' ? (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={sessionType === 'SCRIM' ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => {
                    setSessionType('SCRIM');
                    setPage(1);
                  }}
                >
                  Squad Scrims
                </Button>
                <Button
                  size="sm"
                  variant={sessionType === 'CHALLENGE' ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => {
                    setSessionType('CHALLENGE');
                    setPage(1);
                  }}
                >
                  Challenges
                </Button>
                <Button
                  size="sm"
                  variant={sessionType === 'TEAMMATE_REQUEST' ? 'default' : 'outline'}
                  className="text-xs h-8"
                  onClick={() => {
                    setSessionType('TEAMMATE_REQUEST');
                    setPage(1);
                  }}
                >
                  Teammate Finder
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {sessions.length} of {sessionMeta.total} recorded events
              </div>
            </div>

            {sessionLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Swords className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs">No gaming sessions found for this category.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {sessions.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-foreground">
                        {item.title || item.game || 'Gaming Session'}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {sessionType === 'SCRIM' && (
                          <span>
                            Squad: <span className="text-foreground">{item.team?.name}</span> vs{' '}
                            <span className="text-foreground">{item.opponentTeam || 'Open Lobby'}</span>
                          </span>
                        )}
                        {sessionType === 'CHALLENGE' && (
                          <span>
                            From: <span className="text-foreground">{item.creator?.profile?.username || item.creator?.email}</span> • Target: <span className="text-foreground">{item.target?.profile?.username || item.target?.email}</span>
                          </span>
                        )}
                        {sessionType === 'TEAMMATE_REQUEST' && (
                          <span>
                            Sender: <span className="text-foreground">{item.sender?.profile?.username || item.sender?.email}</span> • Receiver: <span className="text-foreground">{item.receiver?.profile?.username || item.receiver?.email}</span>
                            {item.message && <span className="italic ml-2">"{item.message}"</span>}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px]">
                        {item.status}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                        {formatDate(item.scheduledAt || item.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Ratings Sub-View */
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" /> Community Teammate Experience &amp; Ratings
              </h3>
              <p className="text-xs text-muted-foreground">
                Post-match teammate peer ratings, communication scores, and reliability feedback.
              </p>
            </div>

            {ratingLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : ratings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Star className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs">No teammate ratings submitted yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {ratings.map((r: any) => (
                  <div key={r.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-foreground">
                        <span className="text-muted-foreground">Rater:</span>{' '}
                        {r.rater?.profile?.username || r.rater?.email}{' '}
                        <span className="text-muted-foreground font-normal">rated</span>{' '}
                        <span className="text-primary font-bold">{r.ratedUser?.profile?.username || r.ratedUser?.email}</span>
                      </div>

                      {r.feedback && (
                        <p className="text-muted-foreground italic bg-card/20 p-2 rounded-lg">
                          "{r.feedback}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Comm Score: {r.communicationRating ? `${r.communicationRating}/5` : 'N/A'}</span>
                        <span>•</span>
                        <span>Reliability: {r.reliabilityRating ? `${r.reliabilityRating}/5` : 'N/A'}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs gap-1 font-bold">
                        <Star className="h-3 w-3 fill-amber-400" /> {r.rating} / 5
                      </Badge>
                      <div className="font-mono text-[10px] text-muted-foreground mt-1">
                        {formatDate(r.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
