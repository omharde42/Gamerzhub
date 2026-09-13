'use client';

import React, { useState } from 'react';
import { Shield, ShieldAlert, Activity, CheckCircle, XCircle, AlertCircle, DollarSign, Users, Award } from 'lucide-react';
import { CommandCenter } from './command-center';
import { ActivityFeed } from './activity-feed';

interface OrganizerDashboardProps {
  tournament: {
    id: string;
    title: string;
    status: string;
    payoutStage?: string;
    payoutDetails?: any;
    teams?: Array<{
      id: string;
      registrationStatus?: string;
      actionRequiredNotes?: string;
      readinessScore?: number;
      team: { name: string; avatar?: string };
    }>;
  };
  apiBaseUrl?: string;
  onRefresh?: () => void;
}

export function OrganizerDashboard({ tournament, apiBaseUrl = '/api', onRefresh }: OrganizerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'SCREENING' | 'FEED' | 'PAYOUTS'>('COMMAND');
  const [payoutStage, setPayoutStage] = useState(tournament.payoutStage || 'PENDING');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [updatingPayout, setUpdatingPayout] = useState(false);

  const handleUpdatePayout = async (stage: string) => {
    setUpdatingPayout(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/tournaments/${tournament.id}/payouts`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payoutStage: stage,
          payoutDetails: { notes: payoutNotes, updatedAt: new Date() },
        }),
      });
      if (res.ok) {
        setPayoutStage(stage);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to update payout stage', err);
    } finally {
      setUpdatingPayout(false);
    }
  };

  const teams = tournament.teams || [];

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-md">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">Organizer Control Hub</h2>
          </div>
          <p className="text-xs text-gray-400">Manage screening, live matches, disputes, and prize payouts</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('COMMAND')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'COMMAND'
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Command Center
          </button>
          <button
            onClick={() => setActiveTab('SCREENING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'SCREENING'
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Roster Screening
          </button>
          <button
            onClick={() => setActiveTab('FEED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'FEED'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Activity Feed
          </button>
          <button
            onClick={() => setActiveTab('PAYOUTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-colors ${
              activeTab === 'PAYOUTS'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" /> Prize Payouts
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'COMMAND' && <CommandCenter tournamentId={tournament.id} apiBaseUrl={apiBaseUrl} onRefresh={onRefresh} />}

      {activeTab === 'SCREENING' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Registered Teams & Roster Readiness</h3>
          {teams.length === 0 ? (
            <p className="text-xs text-gray-500 py-6">No teams registered yet.</p>
          ) : (
            <div className="space-y-2">
              {teams.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center font-bold text-purple-300">
                      {t.team.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{t.team.name}</h4>
                      <span className="text-[10px] text-gray-400">Readiness Score: ⚡ {t.readinessScore || 0}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-2.5 py-1 text-[10px] font-bold text-gray-300 uppercase">
                      {t.registrationStatus || 'ACCEPTED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'FEED' && <ActivityFeed tournamentId={tournament.id} apiBaseUrl={apiBaseUrl} />}

      {activeTab === 'PAYOUTS' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-400" /> Prize Distribution Stage
              </h3>
              <p className="text-xs text-gray-400">Current Payout Stage: <span className="font-bold text-emerald-400 uppercase">{payoutStage}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => handleUpdatePayout('PENDING')}
              disabled={updatingPayout}
              className={`rounded-lg border p-3 text-xs font-bold uppercase transition-colors ${
                payoutStage === 'PENDING' ? 'bg-amber-500/30 border-amber-500 text-amber-300' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              1. Pending Completion
            </button>

            <button
              onClick={() => handleUpdatePayout('DISTRIBUTING')}
              disabled={updatingPayout}
              className={`rounded-lg border p-3 text-xs font-bold uppercase transition-colors ${
                payoutStage === 'DISTRIBUTING' ? 'bg-cyan-500/30 border-cyan-500 text-cyan-300' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              2. Distributing Prizes
            </button>

            <button
              onClick={() => handleUpdatePayout('COMPLETED')}
              disabled={updatingPayout}
              className={`rounded-lg border p-3 text-xs font-bold uppercase transition-colors ${
                payoutStage === 'COMPLETED' ? 'bg-emerald-500/30 border-emerald-500 text-emerald-300' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              3. Payout Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
