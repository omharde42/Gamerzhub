'use client';

import React, { useEffect, useState } from 'react';
import { Activity, Radio, User, Shield, CheckCircle, AlertCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  user?: { profile?: { username?: string; avatar?: string } };
  team?: { team?: { name?: string; avatar?: string } };
}

interface ActivityFeedProps {
  tournamentId: string;
  apiBaseUrl?: string;
}

export function ActivityFeed({ tournamentId, apiBaseUrl = '/api' }: ActivityFeedProps) {
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, [tournamentId]);

  const fetchFeed = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBaseUrl}/tournaments/${tournamentId}/activity-feed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setFeed(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load activity feed', err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'SCORE_SUBMITTED':
        return <Shield className="h-4 w-4 text-purple-400" />;
      case 'DISPUTE':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Radio className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-400 animate-pulse" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Tournament Live Feed</h3>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Live
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-500">Loading activity feed...</div>
      ) : feed.length === 0 ? (
        <div className="py-8 text-center text-xs text-gray-500">No activity logged yet</div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {feed.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-3 text-xs">
              <div className="mt-0.5">{getTypeIcon(item.type)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200">{item.title}</span>
                  <span className="text-[10px] text-gray-500">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-gray-400 mt-0.5">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
