'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Globe, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime';

const mobileNavItems: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/tournaments', icon: Trophy, label: 'Tournaments' },
  { href: '/friends', icon: Globe, label: 'Global Community' },
  { href: '/messages', icon: MessageSquare, label: 'Chat' },
];

export function MobileBottomNav({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  useNotificationRealtime();

  const { data: chatUnreadData } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: () => api.get('/chat/unread-counts').then((r) => r.data.data || {}),
    refetchInterval: 15000,
    enabled: !!user && pathname !== '/' && !pathname?.startsWith('/auth'),
  });

  const totalChatUnread = Object.values(chatUnreadData || {}).reduce(
    (sum: number, c: any) => sum + (c as number),
    0
  );

  const isActive = (item: (typeof mobileNavItems)[number]) => {
    if (item.href === '/feed') {
      return pathname === '/feed' || pathname === '/';
    }
    return pathname === item.href || pathname?.startsWith(item.href + '/');
  };

  return (
    <motion.nav
      initial={false}
      animate={{ y: hidden ? '100%' : '0%', opacity: hidden ? 0 : 1 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${hidden ? 'pointer-events-none' : ''}`}
      aria-hidden={hidden || undefined}
      inert={hidden}
    >
      <div className="bg-background/95 backdrop-blur-xl border-t border-primary/20 shadow-[0_-4px_20px_hsl(var(--background)/0.9)] safe-area-bottom relative">
        <div className="grid grid-cols-4 items-center justify-items-center w-full px-1 py-1.5">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const isChat = item.href === '/messages';

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-[9.5px] xs:text-[10px] font-bold transition-all duration-200 min-w-0 relative select-none ${
                  active ? 'text-emerald-400' : 'text-muted-foreground/75 hover:text-foreground'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[3px] bg-emerald-400 rounded-b-full shadow-[0_0_12px_rgba(52,211,153,0.9)] z-20" />
                )}
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-all duration-200 ${
                      active ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] scale-110' : 'text-muted-foreground/80'
                    }`}
                  />
                  {isChat && totalChatUnread > 0 && (
                    <span className="absolute -top-1 -right-2.5 h-3.5 min-w-[14px] px-1 rounded-full bg-destructive text-destructive-foreground text-[8px] font-black flex items-center justify-center shadow-sm">
                      {totalChatUnread > 9 ? '9+' : totalChatUnread}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-full text-center leading-tight tracking-tight px-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
