'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { PremiumModal } from '@/components/ui/premium-modal';
import { usePanelNav } from '@/hooks/usePanelNav';
import { getInitials, cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { gamerLevel, levelTitle, levelColor } from '@/lib/gamer-level';
import { LevelChip } from '@/components/hud/level-chip';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime';
import { SearchOverlay } from '@/components/search/search-overlay';
import {
  Search, Bell, MessageSquare, Users,
  LogOut, User, Settings, Home, ChevronDown,
  Bookmark, Shield, Gamepad2 as GamepadIcon, MoreHorizontal,
  Globe, Sun, Moon, Menu, X, Newspaper, Film,
  Trophy, UserCheck
} from 'lucide-react';

const navIcons = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/news', icon: Newspaper, label: 'News' },
  { href: '/studio', icon: Film, label: 'Studio' },
  { href: '/friends', icon: Users, label: 'Network' },
  { href: '/servers', icon: Globe, label: 'Servers' },
];

export function Navbar({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);

  const { theme: activeTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openPanelFromNav = usePanelNav();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await api.get(`/profiles/search?q=${encodeURIComponent(searchQuery)}&limit=5`);
        setSearchResults(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  useEffect(() => {
    setMounted(true);
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useNotificationRealtime();

  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/notifications/unread-count').then(r => r.data.data),
    refetchInterval: 30000,
    enabled: !!user && pathname !== '/' && !pathname?.startsWith('/auth'),
  });

  const { data: chatUnreadData } = useQuery({
    queryKey: ['chat-unread'],
    queryFn: () => api.get('/chat/unread-counts').then(r => r.data.data || {}),
    refetchInterval: 15000,
    enabled: !!user && pathname !== '/' && !pathname?.startsWith('/auth'),
  });

  const { data: navStats } = useQuery({
    queryKey: ['analytics-stats-nav'],
    queryFn: () => api.get('/analytics/stats').then(r => r.data.data).catch(() => null),
    staleTime: 5 * 60 * 1000,
    enabled: !!user && pathname !== '/' && !pathname?.startsWith('/auth'),
  });

  const navMatches = navStats?.profile?.totalMatches ? Number(navStats.profile.totalMatches) : 0;
  const navLevel = gamerLevel(navMatches);
  const navRankTitle = levelTitle(navLevel.level);
  const navRankColor = levelColor(navLevel.level);

  const unreadCount = notifData?.count || 0;
  const totalChatUnread = Object.values(chatUnreadData || {}).reduce((sum: number, c: any) => sum + (c as number), 0);

  if (pathname === '/' || pathname?.startsWith('/auth')) return null;

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => {});
    } catch {}
    logout();
    router.push('/');
  };

  return (
    <motion.header
      className={`fixed top-0 z-40 w-full ${hidden ? 'pointer-events-none' : ''}`}
      aria-hidden={hidden || undefined}
      inert={hidden}
    >
      <motion.div
        initial={false}
        animate={{ y: hidden ? '-100%' : '0%', opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className={`w-full ${scrolled ? 'glass-strong border-border/60' : 'bg-background/80 backdrop-blur-md border-b border-border/60'} transition-colors duration-300`}
      >
      <div className="w-full mx-auto flex h-16 items-center px-4 md:px-6 gap-2 md:gap-3">

        {/* Left Side Menu Button: Trigger side drawer on mobile, brand on desktop */}
        <div className="flex md:hidden shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/40"
            aria-label="More options"
          >
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>

        {/* Desktop Brand Logo */}
        <Link href="/dashboard" className="hidden md:flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-primary/20 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary/40 shrink-0">
            <img src="/logo.webp" alt="GamerZ Hub" className="w-full h-full object-cover" />
          </div>
          <span className="text-base font-extrabold hidden sm:block text-foreground group-hover:text-primary transition-colors tracking-tight">GamerZ Hub</span>
        </Link>

        {/* Center: Maximized Search Bar on mobile & desktop, opens dedicated search interface instantly */}
        <div className="flex relative flex-1 mx-1 md:mx-0 max-w-full md:max-w-sm cursor-pointer" onClick={() => setIsSearchOpen(true)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            className="h-9 pl-9 bg-muted/50 border-0 rounded-full text-sm focus-visible:ring-1 focus-visible:ring-primary/30 w-full cursor-pointer pointer-events-auto placeholder:text-muted-foreground/70"
            placeholder="Search players, teams..."
            variant="ghost" 
            value=""
            readOnly
            onClick={() => setIsSearchOpen(true)}
            onFocus={() => setIsSearchOpen(true)}
          />
        </div>

        {/* Right Side: Profile icon (displayed on BOTH mobile & desktop) */}
        <div className="flex items-center gap-1.5 ml-auto">
          {/* Desktop Nav icons (hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navIcons.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/feed' && pathname?.startsWith(item.href));
              const isMessages = item.href === '/messages';
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 relative",
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  )}>
                  <Icon className={cn("h-4 w-4 transition-transform duration-200", isActive ? "text-emerald-400 scale-110" : "text-muted-foreground")} />
                  <span>{item.label}</span>
                  {isMessages && totalChatUnread > 0 && (
                    <span className="h-4 min-w-[16px] px-1 rounded-full bg-emerald-500 text-black text-[9px] font-extrabold flex items-center justify-center shadow-md">
                      {totalChatUnread > 9 ? '9+' : totalChatUnread}
                    </span>
                  )}
                </Link>
              );
            })}

            <button
              aria-label="Notifications"
              onClick={() => openPanelFromNav('notifications')}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 min-w-[70px] relative
                ${pathname === '/notifications' ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
            >
              <Bell className={`h-5 w-5 transition-all duration-200 ${unreadCount > 0 ? 'animate-pulse-glow' : ''}`} />
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 right-3 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-scale-in">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </nav>

          {/* Profile Dropdown (Both Mobile & Desktop) */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="User account menu" variant="ghost" className="flex items-center gap-1.5 px-2 h-11 w-11 md:w-auto rounded-lg hover:bg-accent/50 shrink-0">
                  <div className="level-ring shrink-0" style={{ ['--lvl-pct' as any]: `${navLevel.xp}%`, padding: 2 }}>
                    <Avatar className="h-7 w-7 md:h-6 md:w-6 border-0" status="online">
                      <AvatarImage src={user?.profile?.avatar || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-extrabold">{getInitials(user?.profile?.username || 'U')}</AvatarFallback>
                    </Avatar>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 glass-strong">
                <div className="flex items-center gap-3 p-3">
                  <div className="level-ring shrink-0" style={{ ['--lvl-pct' as any]: `${navLevel.xp}%` }}>
                    <Avatar className="h-11 w-11 border-0" ring>
                      <AvatarImage src={user?.profile?.avatar || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user?.profile?.username || 'U')}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user?.profile?.displayName || user?.profile?.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{(user?.profile as any)?.headline || 'Gamer'}</p>
                  </div>
                </div>
                <div className="px-3 pb-2">
                  <LevelChip totalMatches={navMatches} compact />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => openPanelFromNav('profile', { username: user?.profile?.username })}>
                  <User className="h-4 w-4 mr-3" /> View Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openPanelFromNav('settings')}>
                  <Settings className="h-4 w-4 mr-3" /> Settings
                </DropdownMenuItem>
                <Link href="/explore">
                  <DropdownMenuItem><Home className="h-4 w-4 mr-3" /> Explore</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                {/* Single Dual-Theme Selector inside Profile Dropdown */}
                <div className="px-3 py-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Appearance Theme</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${activeTheme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm' : 'bg-muted/30 text-muted-foreground border-transparent hover:text-foreground'}`}
                    >
                      <Moon className="h-3.5 w-3.5" /> Dark
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${activeTheme === 'light' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-sm' : 'bg-muted/30 text-muted-foreground border-transparent hover:text-foreground'}`}
                    >
                      <Sun className="h-3.5 w-3.5" /> Light
                    </button>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-3" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/auth/login">
                <Button variant="outline" size="sm" className="h-9 px-4 rounded-lg text-xs font-medium">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="default" size="sm" className="h-9 px-4 rounded-lg text-xs font-medium">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      </motion.div>

      {/* Mobile Left Side Drawer */}
      <PremiumModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="left"
        title="Menu"
        className="bg-background md:hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/10 p-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="level-ring shrink-0" style={{ ['--lvl-pct' as any]: `${navLevel.xp}%`, padding: 2 }}>
              <Avatar className="h-9 w-9 border-0">
                <AvatarImage src={user?.profile?.avatar || ''} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{getInitials(user?.profile?.username || 'U')}</AvatarFallback>
              </Avatar>
            </div>
            <div className="text-left min-w-0">
              <p className="font-semibold text-xs truncate max-w-[150px]">{user?.profile?.displayName || user?.profile?.username}</p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">@{user?.profile?.username}</p>
              <p className="text-[9px] font-mono font-black mt-0.5" style={{ color: navRankColor, textShadow: `0 0 8px ${navRankColor}88` }}>
                LVL {navLevel.level} • {navRankTitle}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDrawerOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body Links */}
        <div className="space-y-2 p-4">
          <button onClick={() => { setDrawerOpen(false); openPanelFromNav('profile', { username: user?.profile?.username }); }} className="flex w-full items-center gap-3 p-3 rounded-xl hover:bg-muted/85 text-sm text-foreground transition-all text-left">
            <User className="h-4 w-4 text-primary" /> User Profile
          </button>
          <button onClick={() => { setDrawerOpen(false); openPanelFromNav('settings'); }} className="flex w-full items-center gap-3 p-3 rounded-xl hover:bg-muted/85 text-sm text-foreground transition-all text-left">
            <Settings className="h-4 w-4 text-primary" /> Edit Profile
          </button>
          <button onClick={() => { setDrawerOpen(false); openPanelFromNav('games'); }} className="flex w-full items-center gap-3 p-3 rounded-xl hover:bg-muted/85 text-sm text-foreground transition-all text-left">
            <GamepadIcon className="h-4 w-4 text-primary" /> Popular Games
          </button>
          <button onClick={() => { setDrawerOpen(false); openPanelFromNav('tournaments'); }} className="flex w-full items-center gap-3 p-3 rounded-xl hover:bg-muted/85 text-sm text-foreground transition-all text-left">
            <Trophy className="h-4 w-4 text-primary" /> Tournaments
          </button>
          <button onClick={() => { setDrawerOpen(false); openPanelFromNav('connections'); }} className="flex w-full items-center gap-3 p-3 rounded-xl hover:bg-muted/85 text-sm text-foreground transition-all text-left">
            <UserCheck className="h-4 w-4 text-primary" /> Connections
          </button>
          <Link href="/saved" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/85 text-sm text-foreground transition-all">
            <Bookmark className="h-4 w-4 text-primary" /> Saved Posts
          </Link>
          <Link href={`/passport/${user?.profile?.username}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/85 text-sm text-foreground transition-all">
            <Shield className="h-4 w-4 text-primary" /> AI Resume & Passport
          </Link>
          <div className="my-3 border-t border-border/45" />
          {/* Dual Theme Selector Section in Mobile Drawer */}
          <div className="p-3 rounded-2xl bg-card/60 border border-border/40 space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground tracking-wider px-1">Theme System</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  "flex items-center justify-center gap-1.5 p-2 rounded-xl text-[11px] font-bold transition-all border",
                  mounted && activeTheme === 'light' ? "bg-orange-500/15 text-orange-500 border-orange-500/40 shadow-sm" : "bg-card/40 text-muted-foreground border-transparent hover:bg-card/80"
                )}
              >
                <Sun className="h-4 w-4 text-orange-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex items-center justify-center gap-1.5 p-2 rounded-xl text-[11px] font-bold transition-all border",
                  mounted && activeTheme === 'dark' ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-sm" : "bg-card/40 text-muted-foreground border-transparent hover:bg-card/80"
                )}
              >
                <Moon className="h-4 w-4 text-emerald-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          <div className="my-3 border-t border-border/45" />
          <Button variant="ghost" onClick={() => { setDrawerOpen(false); handleLogout(); }} className="w-full flex items-center justify-start gap-3 p-3 h-11 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </PremiumModal>
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </motion.header>
  );
}
