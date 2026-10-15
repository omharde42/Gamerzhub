'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Shield, Users, Trophy, Gamepad2, Swords, AlertTriangle,
  Loader2, LayoutDashboard, ShieldAlert, ExternalLink,
  Menu, X, Clock, FileText, ShoppingBag, Package,
  Newspaper, MessageSquare, Briefcase, LogIn, Settings
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// Modular Admin Tab Components
import { AdminDashboardTab } from '@/components/admin/dashboard-tab';
import { AdminUsersTab } from '@/components/admin/users-tab';
import { AdminSquadsTab } from '@/components/admin/squads-tab';
import { AdminTournamentsTab } from '@/components/admin/tournaments-tab';
import { AdminGamesTab } from '@/components/admin/games-tab';
import { AdminSessionsTab } from '@/components/admin/sessions-tab';
import { AdminReportsTab } from '@/components/admin/reports-tab';
import { AdminAuditLogsTab } from '@/components/admin/audit-logs-tab';
import { AdminProductsTab } from '@/components/admin/products-tab';
import { AdminOrdersTab } from '@/components/admin/orders-tab';
import { AdminNewsTab } from '@/components/admin/news-tab';
import { AdminFeedTab } from '@/components/admin/feed-tab';
import { AdminJobsTab } from '@/components/admin/jobs-tab';
import { AdminLoginsTab } from '@/components/admin/logins-tab';
import { AdminSettingsTab } from '@/components/admin/settings-tab';

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check auth and role access
  const isAuthorizedAdmin =
    isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN');

  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        router.push('/auth/login');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router]);

  // Primary Dashboard Data
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    enabled: isAuthorizedAdmin,
  });

  // Handle unauthorized state (Security Guard)
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-mono">Verifying administrative credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full glass-card text-center p-6 border-red-500/30">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-500">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Access Restricted</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Administrative privileges required. Account ({user?.email}) does not possess the permissions necessary to view the GamerZ Hub Admin Panel.
          </p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6 w-full text-xs font-semibold">
            Return to Public Website
          </Button>
        </Card>
      </div>
    );
  }

  const pendingReportsCount = (stats?.moderation?.pendingUserReports || 0) + (stats?.moderation?.pendingTournamentReports || 0);
  const pendingGamesCount = stats?.moderation?.pendingGameRequests || 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'games', label: 'Games Catalog & CMS', icon: Gamepad2, badge: pendingGamesCount > 0 ? `${pendingGamesCount} req` : null, badgeColor: 'bg-primary/20 text-primary border-primary/30' },
    { id: 'logins', label: 'User Logins & Sessions', icon: LogIn, badge: stats?.users?.active ? `${stats.users.active} users` : null, badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'news', label: 'News & Editorial', icon: Newspaper },
    { id: 'settings', label: 'Platform & Site Settings', icon: Settings },
    { id: 'feed', label: 'Community Feed', icon: MessageSquare },
    { id: 'jobs', label: 'Careers & Jobs', icon: Briefcase },
    { id: 'users', label: 'Users & Gamers', icon: Users },
    { id: 'squads', label: 'Squad Continuity', icon: Shield, badge: stats?.squads?.invitesPending > 0 ? `${stats.squads.invitesPending} inv` : null, badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy, badge: stats?.tournaments?.byStatus?.IN_PROGRESS > 0 ? `${stats.tournaments.byStatus.IN_PROGRESS} live` : null, badgeColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
    { id: 'sessions', label: 'Gaming Sessions', icon: Swords },
    { id: 'reports', label: 'Moderation Queue', icon: AlertTriangle, badge: pendingReportsCount > 0 ? `${pendingReportsCount}` : null, badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { id: 'audit-logs', label: 'Security & Audit Logs', icon: FileText },
    { id: 'products', label: 'Products & Store', icon: Package },
    { id: 'orders', label: 'Orders & Payments', icon: ShoppingBag, badge: stats?.orders?.byStatus?.PENDING ? `${stats.orders.byStatus.PENDING}` : null, badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Admin Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-9 w-9 p-0"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-foreground">GamerZ Hub</span>
                <Badge variant="default" className="text-[9px] px-1.5 py-0 uppercase tracking-widest font-bold">
                  {user?.role}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Autonomous Administration &amp; Moderation Control Plane
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Return to Website
          </Button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Sidebar Nav */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } md:block w-full md:w-60 shrink-0 space-y-1.5 bg-card/20 md:bg-transparent p-3 md:p-0 rounded-2xl border md:border-none border-border/60`}
        >
          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hidden md:block">
            Management Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground border-transparent' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </aside>

        {/* Dynamic Tab Body */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <AdminDashboardTab
              stats={stats}
              isLoading={statsLoading}
              onRefresh={refetchStats}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'news' && <AdminNewsTab />}

          {activeTab === 'logins' && <AdminLoginsTab />}

          {activeTab === 'settings' && <AdminSettingsTab />}

          {activeTab === 'feed' && <AdminFeedTab />}

          {activeTab === 'jobs' && <AdminJobsTab />}

          {activeTab === 'users' && <AdminUsersTab />}

          {activeTab === 'squads' && <AdminSquadsTab />}

          {activeTab === 'tournaments' && <AdminTournamentsTab />}

          {activeTab === 'games' && <AdminGamesTab />}

          {activeTab === 'sessions' && <AdminSessionsTab />}

          {activeTab === 'reports' && <AdminReportsTab />}

          {activeTab === 'audit-logs' && <AdminAuditLogsTab />}

          {activeTab === 'products' && <AdminProductsTab />}

          {activeTab === 'orders' && <AdminOrdersTab />}
        </main>
      </div>
    </div>
  );
}
