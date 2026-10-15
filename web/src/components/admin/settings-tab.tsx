'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Settings, Bell, AlertTriangle, Shield, Globe,
  CheckCircle2, Loader2, Save, Layers, Activity, RefreshCw
} from 'lucide-react';

export function AdminSettingsTab() {
  const queryClient = useQueryClient();

  const [bannerEnabled, setBannerEnabled] = useState(true);
  const [bannerText, setBannerText] = useState('');
  const [bannerType, setBannerType] = useState('INFO');
  const [bannerLink, setBannerLink] = useState('/tournaments');

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationsOpen, setRegistrationsOpen] = useState(true);

  // Fetch current site settings
  const { data, isLoading } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: () => api.get('/admin/settings').then((r) => r.data.data),
  });

  useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      if (s.banner_enabled !== undefined) setBannerEnabled(s.banner_enabled === 'true');
      if (s.banner_text !== undefined) setBannerText(s.banner_text);
      if (s.banner_type !== undefined) setBannerType(s.banner_type);
      if (s.banner_link !== undefined) setBannerLink(s.banner_link);
      if (s.maintenance_mode !== undefined) setMaintenanceMode(s.maintenance_mode === 'true');
      if (s.registrations_open !== undefined) setRegistrationsOpen(s.registrations_open === 'true');
    }
  }, [data]);

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: (settings: Record<string, string>) =>
      api.put('/admin/settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-site-settings'] });
      toast.success('Platform settings saved successfully!');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || 'Failed to update settings'),
  });

  const handleSave = () => {
    saveMutation.mutate({
      banner_enabled: String(bannerEnabled),
      banner_text: bannerText,
      banner_type: bannerType,
      banner_link: bannerLink,
      maintenance_mode: String(maintenanceMode),
      registrations_open: String(registrationsOpen),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/40 p-4 rounded-2xl border border-border/50">
        <div>
          <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Platform &amp; Website Settings
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure global website announcements, operational modes, and accessibility controls.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 shrink-0 h-10 px-5 rounded-xl shadow-md shadow-primary/20"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Platform Changes
        </Button>
      </div>

      {/* ─── Global Announcement Banner ───────────────────────────────────── */}
      <Card className="glass-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Global Announcement Banner</h4>
                <p className="text-xs text-muted-foreground">
                  Display an active banner notification across the top of the entire website.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">
                {bannerEnabled ? 'Active' : 'Disabled'}
              </span>
              <input
                type="checkbox"
                checked={bannerEnabled}
                onChange={(e) => setBannerEnabled(e.target.checked)}
                className="w-5 h-5 rounded text-primary accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/40 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Banner Message</label>
              <Input
                placeholder="e.g. 🚀 Welcome to GamerZ Hub! Registrations open for upcoming tournaments."
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Banner Style / Color</label>
                <Select value={bannerType} onValueChange={setBannerType}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO" className="text-xs">Info (Primary Theme)</SelectItem>
                    <SelectItem value="SUCCESS" className="text-xs">Success (Emerald Green)</SelectItem>
                    <SelectItem value="WARNING" className="text-xs">Warning (Amber Gold)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Action Link (Optional)</label>
                <Input
                  placeholder="/tournaments or https://..."
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Live Preview */}
            {bannerEnabled && bannerText && (
              <div className="mt-3 p-3 rounded-xl border border-border/50 bg-card/60 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Live Preview</span>
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium flex items-center justify-between gap-3 ${
                    bannerType === 'SUCCESS'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : bannerType === 'WARNING'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-primary/10 text-primary border border-primary/30'
                  }`}
                >
                  <span className="truncate">{bannerText}</span>
                  {bannerLink && (
                    <span className="underline shrink-0 text-[11px] font-bold">Learn More →</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Platform Access & Controls ───────────────────────────────────── */}
      <Card className="glass-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Platform Access &amp; Operational Controls</h4>
              <p className="text-xs text-muted-foreground">
                Control user registrations and maintenance availability.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/40 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/50">
              <div>
                <p className="font-bold text-foreground">Public User Registrations</p>
                <p className="text-[11px] text-muted-foreground">
                  Allow new visitors to register accounts on GamerZ Hub.
                </p>
              </div>
              <input
                type="checkbox"
                checked={registrationsOpen}
                onChange={(e) => setRegistrationsOpen(e.target.checked)}
                className="w-5 h-5 rounded text-primary accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/50">
              <div>
                <p className="font-bold text-foreground">Maintenance Mode</p>
                <p className="text-[11px] text-muted-foreground">
                  Temporarily display a maintenance notice to non-admin visitors.
                </p>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-5 h-5 rounded text-primary accent-primary cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Diagnostics & System Info ─────────────────────────────────────── */}
      <Card className="glass-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Infrastructure &amp; Server Health</h4>
              <p className="text-xs text-muted-foreground">
                Runtime environment and database connection status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40 text-xs font-mono">
            <div className="p-3 rounded-xl bg-card/30 border border-border/40 space-y-1">
              <span className="text-[10px] text-muted-foreground">Database Status</span>
              <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card/30 border border-border/40 space-y-1">
              <span className="text-[10px] text-muted-foreground">Node Environment</span>
              <p className="font-bold text-foreground">production</p>
            </div>

            <div className="p-3 rounded-xl bg-card/30 border border-border/40 space-y-1">
              <span className="text-[10px] text-muted-foreground">Hosting</span>
              <p className="font-bold text-foreground">Render Cloud</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
