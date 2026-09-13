'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, ShieldAlert, CheckCircle, Clock, UserX, ArrowRight, RefreshCw } from 'lucide-react';

interface CommandCenterData {
  urgentCount: number;
  openDisputes: Array<{ id: string; reason: string; reporter?: { profile?: { username?: string } } }>;
  openTickets: Array<{ id: string; ticketNumber: string; category: string; priority: string; reporter?: { profile?: { username?: string } } }>;
  pendingReviews: number;
  matchesNeedingCheckIn: Array<{ id: string; matchIndex: number; team1?: { team?: { name?: string } }; team2?: { team?: { name?: string } } }>;
}

interface CommandCenterProps {
  tournamentId: string;
  apiBaseUrl?: string;
  onRefresh?: () => void;
}

export function CommandCenter({ tournamentId, apiBaseUrl = '/api', onRefresh }: CommandCenterProps) {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${apiBaseUrl}/tournaments/${tournamentId}/command-center`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load command center', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForfeit = async (matchId: string, forfeitTeamId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/tournaments/matches/${matchId}/forfeit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ forfeitTeamId }),
      });
      if (res.ok) {
        fetchData();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to forfeit team', err);
    }
  };

  if (loading) return <div className="py-8 text-center text-xs text-gray-500">Loading Command Center...</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-950/20 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Tournament Command Center</h3>
            <p className="text-xs text-gray-400">Real-time priority action queue requiring organizer intervention</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400 border border-red-500/30">
            🔥 {data.urgentCount} Priority Items
          </span>
          <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Open Disputes */}
        <div className="rounded-xl border border-white/10 bg-black/60 p-4">
          <h4 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Open Match Disputes ({data.openDisputes.length})
          </h4>
          {data.openDisputes.length === 0 ? (
            <p className="text-xs text-gray-500 py-4">No active disputes</p>
          ) : (
            <div className="space-y-2">
              {data.openDisputes.map((d) => (
                <div key={d.id} className="rounded-lg border border-red-500/20 bg-red-950/10 p-3 text-xs">
                  <span className="font-semibold text-gray-200">{d.reason}</span>
                  <span className="block text-gray-400 text-[10px]">Reported by {d.reporter?.profile?.username || 'Player'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Tickets */}
        <div className="rounded-xl border border-white/10 bg-black/60 p-4">
          <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" /> Priority Support Tickets ({data.openTickets.length})
          </h4>
          {data.openTickets.length === 0 ? (
            <p className="text-xs text-gray-500 py-4">No pending support tickets</p>
          ) : (
            <div className="space-y-2">
              {data.openTickets.map((t) => (
                <div key={t.id} className="rounded-lg border border-amber-500/20 bg-amber-950/10 p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-mono text-amber-400 font-bold">#{t.ticketNumber}</span> - <span className="text-gray-200">{t.category}</span>
                    <span className="block text-gray-400 text-[10px]">From {t.reporter?.profile?.username || 'Player'}</span>
                  </div>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">{t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* No-Show Check-in Overdue Matches */}
      {data.matchesNeedingCheckIn.length > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
          <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <UserX className="h-4 w-4 text-purple-400" /> Overdue Check-Ins / Potential No-Shows ({data.matchesNeedingCheckIn.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.matchesNeedingCheckIn.map((m) => (
              <div key={m.id} className="rounded-lg border border-purple-500/20 bg-black/40 p-3 text-xs flex justify-between items-center">
                <div>
                  <span className="font-bold text-white">Match #{m.matchIndex + 1}</span>
                  <p className="text-gray-400 text-[10px]">
                    {m.team1?.team?.name || 'TBD'} vs {m.team2?.team?.name || 'TBD'}
                  </p>
                </div>
                <div className="flex gap-1">
                  {m.team1?.team && (
                    <button
                      onClick={() => handleForfeit(m.id, m.team1!.team!.name!)}
                      className="rounded bg-red-500/30 hover:bg-red-500/50 px-2 py-1 text-[10px] font-bold text-red-300"
                    >
                      Forfeit T1
                    </button>
                  )}
                  {m.team2?.team && (
                    <button
                      onClick={() => handleForfeit(m.id, m.team2!.team!.name!)}
                      className="rounded bg-red-500/30 hover:bg-red-500/50 px-2 py-1 text-[10px] font-bold text-red-300"
                    >
                      Forfeit T2
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
