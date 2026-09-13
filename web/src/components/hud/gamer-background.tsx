'use client';
import { useMemo, useState, useEffect } from 'react';

const PARTICLES = 26;

interface GamerBackgroundProps {
  dense?: boolean;
}

/**
 * Global animated background layer: drifting aurora blobs, rising neon
 * particles and a panning cyber grid. Fixed, pointer-events-none, GPU only.
 * Rendered once per app shell (dashboard + landing) — the APK webview gets
 * it automatically.
 */
export function GamerBackground({ dense = false }: GamerBackgroundProps) {
  const [particleCount, setParticleCount] = useState(6);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 640;
      setParticleCount(isMobile ? 6 : dense ? 18 : 12);
    }
  }, [dense]);

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      left: (i * 100) / particleCount + (i % 2 === 0 ? 3 : -3),
      size: (i % 3) + 1.5,
      duration: (i % 4) * 3 + 12,
      delay: -(i * 1.5),
      drift: (i % 2 === 0 ? 1 : -1) * 20,
      color:
        i % 3 === 0
          ? 'rgba(16,185,129,0.75)'
          : i % 3 === 1
            ? 'rgba(139,92,246,0.7)'
            : 'rgba(236,72,153,0.6)',
    }));
  }, [particleCount]);

  return (
    <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="gamer-aurora gamer-aurora-1" />
      <div className="gamer-aurora gamer-aurora-2" />
      <div className="gamer-aurora gamer-aurora-3" />
      <div className="gamer-grid-pan absolute inset-0 opacity-40" />
      {particles.map((p, i) => (
        <span
          key={i}
          className="gamer-particle"
          style={{
            left: `${p.left}%`,
            bottom: '-4vh',
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            ['--drift-x' as any]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}