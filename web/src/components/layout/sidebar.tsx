'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, Newspaper, Users, Trophy, Briefcase,
  MessageSquare, BarChart3, Bot,
  Settings, LogOut, Gamepad2, Compass, Bookmark, Bell,
  Shield, Globe, Film, Swords, Sun, Moon, Palette, Medal, Handshake, Joystick, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const getNavItems = (username: string) => [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/feed', label: 'Feed', icon: Newspaper },
  { href: '/news', label: 'Gaming News', icon: Globe },
  { href: '/studio', label: 'Game Studio', icon: Film },
  { href: '/arcade', label: 'Arcade', icon: Joystick },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/friends', label: 'My Network', icon: Users },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/teams', label: 'Teams', icon: Trophy },
  { href: '/tournaments', label: 'Tournaments', icon: Gamepad2 },
  { href: '/tournaments/create', label: 'Host Tournament', icon: Plus },
  { href: '/challenges', label: 'Challenges', icon: Swords },
  { href: '/leaderboards', label: 'Leaderboards', icon: Medal },
  { href: '/partnership', label: 'Partnership', icon: Handshake },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/saved', label: 'Saved Posts', icon: Bookmark },
  { href: '/ai-coach', label: 'AI Coach', icon: Bot },
  { href: `/passport/${username}`, label: 'Gamer Passport', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  // `useTheme` must run on every render (even when the sidebar is hidden) so
  // the hook order stays stable — the app-wide ThemeProvider always wraps it.
  const { theme: activeTheme, setTheme } = useTheme();

  const { data: chatUnreadData } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: () => api.get('/chat/unread-counts').then(r => r.data.data || {}),
    refetchInterval: 15000,
  });
  const totalChatUnread = Object.values(chatUnreadData || {}).reduce((sum: number, c: any) => sum + (c as number), 0);

  if (pathname === '/' || pathname?.startsWith('/auth') || pathname?.startsWith('/auth/')) return null;

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const username = user?.profile?.username || '';
  const navItems = getNavItems(username);

  return (
    <aside aria-label="Control Panel" className="w-16 lg:w-64 shrink-0 transition-all duration-300">
      <div className="sticky top-20 flex flex-col gap-4 max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none pr-1">
        {/* User Card / Auth Card */}
        <div className="rounded-[26px] bg-card/75 backdrop-blur-2xl border border-white/10 dark:border-white/10 border-slate-200 overflow-hidden shadow-xl relative group">
          <div className="h-14 bg-gradient-to-r from-indigo-600 via-primary to-purple-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_70%)]" />
          </div>

          {user ? (
            <>
              {/* Profile Header */}
              <div className="px-3 pb-3 -mt-8 text-center block animate-fade-in">
                <Link href={`/profile/${user?.profile?.username || ''}`}>
                  <Avatar className="h-16 w-16 mx-auto border-2 border-background shadow-md cursor-pointer hover:scale-105 transition-transform">
                    <AvatarImage src={user?.profile?.avatar || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg">
                      {getInitials(user?.profile?.username || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Link href={`/profile/${user?.profile?.username || ''}`} className="block mt-2">
                  <p className="font-semibold text-sm hover:text-primary transition-colors">
                    {user?.profile?.displayName || user?.profile?.username}
                  </p>
                </Link>
                <p className="text-xs text-muted-foreground">{(user?.profile as any)?.headline || user?.profile?.role || 'Gamer'}</p>
                {user?.profile?.rank && (
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
                    <Trophy className="h-3 w-3" /> {user.profile.rank}
                  </div>
                )}
              </div>

              {/* Connections & Settings Links */}
              <div className="border-t border-border/40 px-3 py-2 space-y-1 hidden lg:block">
                <Link href="/connections" className="flex items-center justify-between text-xs hover:bg-muted/80 rounded-lg px-2 py-1.5 -mx-1 transition-colors w-full">
                  <span className="text-muted-foreground">Connections</span>
                  <span className="text-primary font-semibold">{(user?.profile as any)?._count?.following || 0}</span>
                </Link>
                <Link href="/profile/settings" className="flex items-center text-xs text-muted-foreground hover:bg-muted/80 rounded-lg px-2 py-1.5 -mx-1 transition-colors w-full">
                  <Settings className="h-3 w-3 mr-1.5" /> Edit Profile
                </Link>
              </div>
            </>
          ) : (
            <div className="p-4 text-center space-y-3 pt-6">
              <p className="text-xs text-muted-foreground">Join GamerZ Hub to connect with pro gamers!</p>
              <Link href="/auth/login" className="block">
                <Button variant="default" size="sm" className="w-full text-xs font-bold rounded-xl">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Items (Direct Full-Page Navigation) */}
        <nav aria-label="Sidebar Navigation" className="space-y-1 bg-card/65 backdrop-blur-2xl p-2 rounded-[26px] border border-white/10 dark:border-white/10 border-slate-200 shadow-xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold tracking-wide transition-all duration-200 relative justify-center lg:justify-start group',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.35)] font-extrabold scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                )}
              >
                <div className="relative shrink-0">
                  <Icon className={cn('h-4 w-4 transition-all duration-200 group-hover:scale-110', isActive ? 'text-emerald-400' : 'text-[#94A3B8] group-hover:text-white')} />
                  {item.href === '/messages' && totalChatUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-[#FF3D71] text-white text-[9px] font-extrabold flex items-center justify-center shadow-md">
                      {totalChatUnread > 9 ? '9+' : totalChatUnread}
                    </span>
                  )}
                </div>
                <span className="hidden lg:block font-inter">{item.label}</span>
              </Link>
            );
          })}

          {/* Logout Button */}
          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide text-destructive hover:bg-destructive/10 transition-all duration-200 justify-center lg:justify-start mt-2 border-l-4 border-transparent"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden lg:block">Sign Out</span>
            </button>
          )}
        </nav>
      </div>
    </aside>
  );
}
