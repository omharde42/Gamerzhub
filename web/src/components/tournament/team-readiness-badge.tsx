'use client';

import React from 'react';
import { Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TeamReadinessBadgeProps {
  score: number;
}

export function TeamReadinessBadge({ score }: TeamReadinessBadgeProps) {
  let colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  let icon = <AlertTriangle className="h-3.5 w-3.5" />;
  let label = 'Low Readiness';

  if (score >= 80) {
    colorClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    icon = <Zap className="h-3.5 w-3.5 text-emerald-400" />;
    label = 'Ready to Compete';
  } else if (score >= 50) {
    colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    icon = <Zap className="h-3.5 w-3.5 text-amber-400" />;
    label = 'Partial Readiness';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${colorClass}`}>
      {icon}
      <span>⚡ {score}% ({label})</span>
    </div>
  );
}
