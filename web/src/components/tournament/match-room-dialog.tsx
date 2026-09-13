'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Copy, Check, AlertCircle, MessageSquare, MapPin, Send, Image as ImageIcon } from 'lucide-react';

interface MatchRoomDialogProps {
  match: {
    id: string;
    round: number;
    matchIndex: number;
    team1?: { id: string; team: { name: string; avatar?: string } };
    team2?: { id: string; team: { name: string; avatar?: string } };
    scoreTeam1?: number;
    scoreTeam2?: number;
    team1CheckedIn?: boolean;
    team2CheckedIn?: boolean;
    mapVetoState?: any;
    status: string;
    tournamentId: string;
  };
  currentUserTeamId?: string;
  apiBaseUrl?: string;
  onClose: () => void;
  onRefresh?: () => void;
  onCallAdmin?: (matchId: string) => void;
}

export function MatchRoomDialog({
  match,
  currentUserTeamId,
  apiBaseUrl = '/api',
  onClose,
  onRefresh,
  onCallAdmin,
}: MatchRoomDialogProps) {
  const [activeTab, setActiveTab] = useState<'MATCH' | 'MAP_VETO' | 'CHAT'>('MATCH');
  const [copiedLobby, setCopiedLobby] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [scoreT1, setScoreT1] = useState(match.scoreTeam1 ?? 0);
  const [scoreT2, setScoreT2] = useState(match.scoreTeam2 ?? 0);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; senderRole: string; message: string; sender?: { profile?: { username?: string } } }>>([]);
  const [newMessage, setNewMessage] = useState('');

  const roomLobbyId = `GZH-ROOM-${match.id.slice(0, 6).toUpperCase()}`;
  const roomPassword = `PASS-${match.id.slice(-4).toUpperCase()}`;

  const isCheckedIn = (currentUserTeamId === match.team1?.id && match.team1CheckedIn) || (currentUserTeamId === match.team2?.id && match.team2CheckedIn);

  const handleCheckIn = async () => {
    if (!currentUserTeamId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/tournaments/matches/${match.id}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamId: currentUserTeamId }),
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Match check-in failed', err);
    }
  };

  const handleMapVeto = async (action: 'BAN' | 'PICK', mapName: string) => {
    if (!currentUserTeamId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/tournaments/matches/${match.id}/veto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamId: currentUserTeamId, action, mapName }),
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Map veto action failed', err);
    }
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const winnerId = scoreT1 > scoreT2 ? match.team1?.id : scoreT2 > scoreT1 ? match.team2?.id : undefined;
      const res = await fetch(`${apiBaseUrl}/tournaments/${match.tournamentId}/matches/${match.id}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scoreTeam1: Number(scoreT1),
          scoreTeam2: Number(scoreT2),
          winnerId,
          evidenceUrl: screenshotUrl,
        }),
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
        onClose();
      }
    } catch (err) {
      console.error('Failed to submit match score', err);
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'LOBBY' | 'PASS') => {
    navigator.clipboard.writeText(text);
    if (type === 'LOBBY') {
      setCopiedLobby(true);
      setTimeout(() => setCopiedLobby(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const mapPool = ['Dust II', 'Mirage', 'Inferno', 'Nuke', 'Ancient'];
  const vetoHistory = match.mapVetoState?.history || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-purple-950/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wider">
                MATCH ROOM #{match.matchIndex + 1} (ROUND {match.round})
              </h3>
              <p className="text-xs text-gray-400 font-mono">FACEIT-Style Verification & Lobby Credentials</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onCallAdmin && (
              <button
                onClick={() => onCallAdmin(match.id)}
                className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-950/80 transition-colors flex items-center gap-1.5"
              >
                <AlertCircle className="h-3.5 w-3.5" /> CALL ADMIN
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-bold px-2 py-1">
              ✕
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('MATCH')}
            className={`px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
              activeTab === 'MATCH' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Lobby & Scores
          </button>
          <button
            onClick={() => setActiveTab('MAP_VETO')}
            className={`px-4 py-2 text-xs font-bold uppercase transition-colors border-b-2 ${
              activeTab === 'MAP_VETO' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Map Pick / Ban Veto
          </button>
        </div>

        {activeTab === 'MATCH' && (
          <div className="space-y-6">
            {/* Teams & Check-in Header */}
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-center border-r border-white/10 pr-4">
                <span className="text-xs font-bold text-gray-400 block mb-1">TEAM 1</span>
                <span className="text-base font-black text-white">{match.team1?.team.name || 'TBD'}</span>
                <div className="mt-2">
                  {match.team1CheckedIn ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Checked In
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      Pending Check-In
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center pl-4">
                <span className="text-xs font-bold text-gray-400 block mb-1">TEAM 2</span>
                <span className="text-base font-black text-white">{match.team2?.team.name || 'TBD'}</span>
                <div className="mt-2">
                  {match.team2CheckedIn ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Checked In
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                      Pending Check-In
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Match Check-in Prompt */}
            {!isCheckedIn && currentUserTeamId && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-center">
                <p className="text-xs text-amber-300 mb-3">Match Check-In required before credentials unlock.</p>
                <button
                  onClick={handleCheckIn}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                >
                  ⚡ Check In Now
                </button>
              </div>
            )}

            {/* Lobby Credentials */}
            <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Lock className="h-4 w-4 text-purple-400" /> Lobby Credentials
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block">ROOM / LOBBY ID</span>
                    <span className="font-mono text-sm font-bold text-white">{roomLobbyId}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(roomLobbyId, 'LOBBY')}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedLobby ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block">PASSWORD</span>
                    <span className="font-mono text-sm font-bold text-white">{roomPassword}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(roomPassword, 'PASS')}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedPass ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Score Submission Form */}
            <form onSubmit={handleSubmitScore} className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-4">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Dual-Score Submission & Proof</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">{match.team1?.team.name} Score</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreT1}
                    onChange={(e) => setScoreT1(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">{match.team2?.team.name} Score</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreT2}
                    onChange={(e) => setScoreT2(Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Screenshot Evidence URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://imgur.com/screenshot.png"
                  value={screenshotUrl}
                  onChange={(e) => setScreenshotUrl(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-purple-600 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/30 disabled:opacity-50"
              >
                {submitting ? 'Submitting Score...' : 'Submit Final Score'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'MAP_VETO' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Map Pool Veto Phase</h4>
            <div className="grid grid-cols-3 gap-3">
              {mapPool.map((map) => (
                <div key={map} className="rounded-lg border border-white/10 bg-black/40 p-3 text-center">
                  <span className="font-bold text-white text-sm block mb-2">{map}</span>
                  <div className="flex justify-center gap-1">
                    <button
                      onClick={() => handleMapVeto('BAN', map)}
                      className="rounded bg-red-500/20 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/40"
                    >
                      BAN
                    </button>
                    <button
                      onClick={() => handleMapVeto('PICK', map)}
                      className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/40"
                    >
                      PICK
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {vetoHistory.length > 0 && (
              <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-3">
                <span className="text-xs font-bold text-gray-400 block mb-2">Veto History</span>
                <div className="space-y-1 text-xs text-gray-300">
                  {vetoHistory.map((h: any, idx: number) => (
                    <div key={idx}>
                      <span className="font-bold">{h.action}:</span> {h.mapName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
