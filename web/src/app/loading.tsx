'use client';
import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative inline-block"
        >
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-2xl shadow-primary/20 mx-auto">
            <img src="/logo.webp" alt="GamerZ Hub" className="w-full h-full object-cover" loading="eager" decoding="async" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-ping opacity-25" />
        </motion.div>
        <motion.p
          className="text-muted-foreground animate-pulse-soft"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Loading...
        </motion.p>
      </div>
    </div>
  );
}
