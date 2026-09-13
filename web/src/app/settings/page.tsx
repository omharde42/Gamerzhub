'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Palette, Bell, Shield, Link, Trash2, LogOut, Monitor, Moon, Sun,
  Volume2, Eye, UserX, Globe, Lock, Mail, Signal
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BackHeader } from '@/components/common/back-header';
import { RequireAuth } from '@/components/auth/require-auth';

type SettingsSection = 'appearance' | 'notifications' | 'privacy' | 'accounts' | 'danger';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  const sections: { id: SettingsSection; label: string; icon: any }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'accounts', label: 'Connected Accounts', icon: Link },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ];

  return (
    <RequireAuth>
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <BackHeader title="Settings" />
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <nav className="md:w-56 shrink-0 space-y-1" aria-label="Settings navigation">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeSection === s.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeSection === 'appearance' && <AppearanceSettings theme={theme} setTheme={setTheme} />}
            {activeSection === 'notifications' && <NotificationSettings />}
            {activeSection === 'privacy' && <PrivacySettings />}
            {activeSection === 'accounts' && <AccountSettings />}
            {activeSection === 'danger' && <DangerZone />}
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}

function AppearanceSettings({ theme, setTheme }: { theme: string | undefined; setTheme: (t: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Theme</CardTitle>
          <CardDescription>Choose how GamerZ Hub looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'dark', label: 'Dark', icon: Moon, desc: 'Obsidian' },
              { value: 'light', label: 'Light', icon: Sun, desc: 'Clean' },
              { value: 'system', label: 'System', icon: Monitor, desc: 'Auto' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === opt.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-border/80 text-muted-foreground'
                }`}
              >
                <opt.icon className="h-6 w-6" />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs opacity-60">{opt.desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Motion</CardTitle>
          <CardDescription>Control animations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="reduced-motion">Reduce animations</Label>
            <Switch id="reduced-motion" />
          </div>
          <p className="text-xs text-muted-foreground">
            Simplifies transitions and disables ambient animations for a calmer experience.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    messages: true,
    tournaments: true,
    friends: true,
    team: true,
    system: false,
    sounds: true,
  });

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    toast.success('Preference saved');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notification Categories</CardTitle>
          <CardDescription>Choose what you get notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'messages' as const, label: 'Messages', desc: 'Direct messages and chat', icon: Mail },
            { key: 'tournaments' as const, label: 'Tournaments', desc: 'Match starts, results, updates', icon: Globe },
            { key: 'friends' as const, label: 'Friend Requests', desc: 'New friend requests and accepts', icon: UserX },
            { key: 'team' as const, label: 'Team', desc: 'Team invites, scrim scheduling', icon: Shield },
            { key: 'system' as const, label: 'System', desc: 'Announcements and updates', icon: Signal },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <Switch checked={prefs[item.key]} onCheckedChange={() => toggle(item.key)} />
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Notification Sounds</p>
                <p className="text-xs text-muted-foreground">Play sounds for incoming notifications</p>
              </div>
            </div>
            <Switch checked={prefs.sounds} onCheckedChange={() => toggle('sounds')} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PrivacySettings() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Privacy</CardTitle>
          <CardDescription>Control who can see your activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Show online status', desc: 'Let others see when you are online' },
            { label: 'Show game activity', desc: 'Display what game you are currently playing' },
            { label: 'Allow profile indexing', desc: 'Let search engines index your profile' },
            { label: 'Show read receipts', desc: 'Let others know when you have read messages' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch defaultChecked={i < 2} />
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AccountSettings() {
  const providers = [
    { name: 'Google', connected: true, icon: 'G' },
    { name: 'Discord', connected: false, icon: 'D' },
    { name: 'Steam', connected: false, icon: 'S' },
    { name: 'Twitch', connected: false, icon: 'T' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connected Accounts</CardTitle>
          <CardDescription>Link your gaming and social accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {providers.map((p) => (
            <div key={p.name} className="flex items-center justify-between py-2 px-3 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
                  {p.icon}
                </div>
                <span className="text-sm font-medium">{p.name}</span>
              </div>
              <Button variant={p.connected ? 'outline' : 'default'} size="sm">
                {p.connected ? 'Disconnect' : 'Connect'}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DangerZone() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-border/50">
            <div>
              <p className="text-sm font-medium">Sign out of all devices</p>
              <p className="text-xs text-muted-foreground">End all active sessions</p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out All
            </Button>
          </div>
          <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-destructive/20 bg-destructive/5">
            <div>
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
