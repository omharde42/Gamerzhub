'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ActionItem {
  id: string;
  type: string;
  title: string;
  description: string;
  link: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface PlayerActionCenterProps {
  apiBaseUrl?: string;
}

export function PlayerActionCenter({ apiBaseUrl = '/api' }: PlayerActionCenterProps) {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(`${apiBaseUrl}/tournaments/player/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setActions(json.data?.actions || []);
      }
    } catch (err) {
      console.error('Failed to load player actions', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || actions.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-red-500/30 bg-red-950/20 p-4 backdrop-blur-md transition-all hover:border-red-500/50 shadow-lg shadow-red-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 text-red-400 animate-pulse">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
              <h4 className="text-base font-bold text-white uppercase tracking-wider">
                🔴 {actions.length} {actions.length === 1 ? 'Action Required' : 'Actions Required'}
              </h4>
            </div>
            <p className="text-xs text-gray-400">Complete these tasks to maintain your tournament eligibility</p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg bg-red-600/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-600/50 transition-colors flex items-center gap-1"
        >
          {isOpen ? 'Collapse' : 'View Actions'}
          <ArrowRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-2 border-t border-red-500/20 pt-3">
          {actions.map((act) => (
            <div
              key={act.id}
              className="flex items-center justify-between rounded-lg bg-black/40 p-3 border border-red-500/20 hover:border-red-500/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-red-400" />
                <div>
                  <h5 className="text-sm font-semibold text-gray-200">{act.title}</h5>
                  <p className="text-xs text-gray-400">{act.description}</p>
                </div>
              </div>

              <Link
                href={act.link}
                className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600 transition-colors flex items-center gap-1"
              >
                Resolve <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
