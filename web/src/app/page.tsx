'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import {
  Users,
  Trophy,
  Gamepad2,
  Zap,
  UserCheck,
  RotateCcw,
  Clock,
  ArrowRight,
  Menu,
  X,
  ExternalLink,
  Shield,
  Search,
  Sparkles,
  Flame,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function StartupLandingPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Preserve existing authentication behavior: redirect logged-in users to feed
  useEffect(() => {
    if (isAuthenticated && user) {
      router.push('/feed');
    }
  }, [isAuthenticated, user, router]);

  // Fetch real tournaments for the tournaments section
  const { data: tournamentsData } = useQuery({
    queryKey: ['landing-tournaments'],
    queryFn: () => api.get('/tournaments?limit=3').then((r) => r.data).catch(() => null),
    staleTime: 60 * 1000,
  });

  const displayTournaments = tournamentsData?.data && tournamentsData.data.length > 0
    ? tournamentsData.data.slice(0, 3)
    : [
        {
          id: 'demo-1',
          name: 'Valorant Champions Invitational',
          game: 'Valorant',
          status: 'REGISTRATION_OPEN',
          startDate: new Date().toISOString(),
          participants: 12,
          maxParticipants: 16,
          organizer: 'GamerZ Hub Arena',
          url: '/tournaments',
          source: 'gamerhub',
        },
        {
          id: 'demo-2',
          name: 'CS2 Premier Tactical Showdown',
          game: 'CS2',
          status: 'OPEN',
          startDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          participants: 24,
          maxParticipants: 32,
          organizer: 'Challonge Community',
          url: '/tournaments',
          source: 'challonge',
        },
        {
          id: 'demo-3',
          name: 'Apex Legends Squad Clash',
          game: 'Apex Legends',
          status: 'UPCOMING',
          startDate: new Date(Date.now() + 86400000 * 7).toISOString(),
          participants: 18,
          maxParticipants: 20,
          organizer: 'Esports League',
          url: '/tournaments',
          source: 'gamerhub',
        },
      ];

  if (isAuthenticated && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#070A11] text-foreground flex flex-col relative selection:bg-emerald-500/30 selection:text-emerald-400 overflow-x-hidden">
      {/* Background Aurora Ambient Lights */}
      <div className="gamer-aurora gamer-aurora-1 pointer-events-none" />
      <div className="gamer-aurora gamer-aurora-2 pointer-events-none" />

      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#070A11]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center p-1 group-hover:border-emerald-400 transition-colors shadow-lg shadow-emerald-500/10">
              <Image
                src="/logo.webp"
                alt="GamerZ Hub Logo"
                width={32}
                height={32}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <span className="font-extrabold text-lg tracking-wider text-white">
              GamerZ <span className="text-emerald-400">Hub</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-300">
            <Link href="/teams" className="hover:text-emerald-400 transition-colors">
              Discover
            </Link>
            <Link href="/tournaments" className="hover:text-emerald-400 transition-colors">
              Tournaments
            </Link>
            <Link href="/teams" className="hover:text-emerald-400 transition-colors">
              Teams
            </Link>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
              How It Works
            </a>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="rounded-xl px-4 font-bold border-white/15 bg-white/5 hover:bg-white/10 text-white">
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="rounded-xl px-5 font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black hover:brightness-110 shadow-lg shadow-emerald-500/25 transition-all">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white rounded-lg border border-white/10 bg-white/5"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#070A11]/95 backdrop-blur-2xl px-4 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <Link
              href="/teams"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-gray-200 hover:text-emerald-400 py-1"
            >
              Discover
            </Link>
            <Link
              href="/tournaments"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-gray-200 hover:text-emerald-400 py-1"
            >
              Tournaments
            </Link>
            <Link
              href="/teams"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-gray-200 hover:text-emerald-400 py-1"
            >
              Teams
            </Link>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-base font-semibold text-gray-200 hover:text-emerald-400 py-1"
            >
              How It Works
            </a>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full rounded-xl font-bold border-white/15 bg-white/5 text-white">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full rounded-xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 text-black">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-10 pb-16 md:pt-20 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-bold tracking-wide shadow-sm shadow-emerald-500/10">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Squad Continuity Platform</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-white">
                Find teammates.{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Build better squads.
                </span>
              </h1>

              <p className="text-sm sm:text-lg text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                GamerZ Hub helps gamers discover suitable teammates, find better gaming sessions, and turn good matches into squads that play together again.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link href="/auth/register" className="w-full sm:w-auto">
                  <Button size="xl" className="w-full sm:w-auto px-8 h-13 rounded-2xl font-black text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black shadow-xl shadow-emerald-500/25 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                    Find Your Squad <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/tournaments" className="w-full sm:w-auto">
                  <Button variant="outline" size="xl" className="w-full sm:w-auto px-7 h-13 rounded-2xl font-bold text-base border-white/15 bg-white/5 hover:bg-white/10 text-white">
                    Explore Tournaments
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right Product Visual / Teammate Discovery Mockup */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl border border-emerald-500/30 bg-[#0E1424]/90 p-4 sm:p-6 shadow-2xl shadow-emerald-950/50 backdrop-blur-xl space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-black text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-emerald-400 shrink-0" />
                      Teammate Discovery
                    </span>
                  </div>
                  <div className="self-start sm:self-auto max-w-full">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] sm:text-xs font-mono font-bold max-w-full truncate px-2.5 py-0.5">
                      Filter: Valorant • NA-East
                    </Badge>
                  </div>
                </div>

                {/* Player Card 1 */}
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 sm:p-4 transition-all hover:border-emerald-400/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 p-0.5 shrink-0 shadow-md shadow-emerald-500/20">
                        <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-emerald-400 text-xs sm:text-sm">
                          AX
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-white truncate">ApexViper</h4>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30 whitespace-nowrap shrink-0 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-emerald-400 shrink-0" /> Verified
                          </span>
                        </div>
                        <p className="text-xs text-emerald-400 font-mono font-semibold truncate mt-0.5">
                          Diamond II • IGL / Initiator
                        </p>
                      </div>
                    </div>

                    <span className="self-start sm:self-center shrink-0 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap shadow-sm shadow-emerald-500/20">
                      ⚡ 96% Match
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 mt-3 border-t border-white/10 text-xs">
                    <span className="text-gray-400 font-medium truncate">
                      Communication: <strong className="text-gray-100 font-semibold">Shotcaller</strong>
                    </span>
                    <button className="w-full sm:w-auto rounded-xl bg-emerald-500 px-4 py-1.5 font-bold text-black text-xs hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/25 active:scale-95 shrink-0">
                      Invite to Squad
                    </button>
                  </div>
                </div>

                {/* Player Card 2 */}
                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5 sm:p-4 transition-all hover:border-purple-400/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shrink-0 shadow-md shadow-purple-500/20">
                        <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center font-black text-purple-400 text-xs sm:text-sm">
                          KR
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-sm text-white truncate">Krono_CS</h4>
                          <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono font-bold px-2 py-0.5 rounded border border-purple-500/30 whitespace-nowrap shrink-0 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-purple-400 shrink-0" /> Verified
                          </span>
                        </div>
                        <p className="text-xs text-purple-300 font-mono font-semibold truncate mt-0.5">
                          Ascendant I • Duelist
                        </p>
                      </div>
                    </div>

                    <span className="self-start sm:self-center shrink-0 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap shadow-sm shadow-purple-500/20">
                      ⚡ 92% Match
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 mt-3 border-t border-white/10 text-xs">
                    <span className="text-gray-400 font-medium truncate">
                      Playstyle: <strong className="text-gray-100 font-semibold">Aggressive Entry</strong>
                    </span>
                    <button className="w-full sm:w-auto rounded-xl bg-white/10 px-4 py-1.5 font-bold text-gray-200 text-xs hover:bg-white/20 transition-all border border-white/10 shrink-0">
                      Invite to Squad
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM SECTION */}
      <section className="py-16 sm:py-20 border-t border-white/10 bg-[#0A0E17]/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Finding players is easy. <span className="text-emerald-400">Finding the right players isn&apos;t.</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-300">
              Most platforms leave session quality entirely to random chance. GamerZ Hub was built to fix the three core breakdown points in online gaming.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl p-6 border border-white/10 bg-white/[0.03] space-y-4 hover:border-red-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Random Teammates</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Solo queuing pairs you with unverified randoms with unpredictable commitment and mismatched goals.
              </p>
            </div>

            <div className="rounded-3xl p-6 border border-white/10 bg-white/[0.03] space-y-4 hover:border-amber-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Poor Compatibility</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Different skill levels, playstyles, and communication habits can ruin a session before the first match finishes.
              </p>
            </div>

            <div className="rounded-3xl p-6 border border-white/10 bg-white/[0.03] space-y-4 hover:border-purple-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                <RotateCcw className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white">No Continuity</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                You may have a great session with someone but never play together again due to lost contacts and missing history.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-base font-extrabold text-emerald-400 tracking-wide">
              GramerZ Hub is designed around solving that gap.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW GAMERZ HUB WORKS (6-Step Process) */}
      <section id="how-it-works" className="py-16 sm:py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3.5 py-1 text-xs font-bold rounded-full">
              Workflow
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-white">How GamerZ Hub Works</h2>
            <p className="text-sm text-gray-300">
              A structured 6-step loop built specifically to take you from solo queuing to repeat squad matches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Build your gamer identity',
                desc: 'Connect verified in-game UIDs, competitive rank, communication style, and active playing hours.',
              },
              {
                step: '02',
                title: 'Discover teammates',
                desc: 'Search and filter active players by game title, region, competitive goals, and availability.',
              },
              {
                step: '03',
                title: 'Understand compatibility',
                desc: 'Evaluate clear compatibility match scores comparing skill level, role synergy, and playstyle.',
              },
              {
                step: '04',
                title: 'Play together',
                desc: 'Drop into focused LFG sessions and enter matches with pre-screened teammates.',
              },
              {
                step: '05',
                title: 'Play Again',
                desc: 'Easily reconnect with compatible players who performed well in past sessions.',
              },
              {
                step: '06',
                title: 'Build your squad',
                desc: 'Turn repeat teammates into a permanent, trusted squad for ranked queues and tournaments.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-white/10 bg-[#0E1424]/70 p-6 space-y-3 hover:border-emerald-500/40 transition-all hover:-translate-y-1 shadow-lg">
                <span className="font-mono text-2xl font-black text-emerald-400">{s.step}</span>
                <h3 className="text-lg font-bold text-white">{s.title}</h3>
                <p className="text-xs text-gray-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CORE FEATURES */}
      <section className="py-16 sm:py-20 border-t border-white/10 bg-[#0A0E17]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <h2 className="text-2xl sm:text-4xl font-black text-white">Core Product Features</h2>
            <p className="text-sm text-gray-300">
              Purpose-built tools for finding compatible players and maintaining squad continuity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: UserCheck,
                title: 'Gamer Identity',
                desc: 'Unified gamer profiles featuring verified in-game accounts, rank ratings, and playstyle attributes.',
              },
              {
                icon: Users,
                title: 'Teammate Discovery',
                desc: 'Search for active players filtered by title, schedule, competitive role, and region.',
              },
              {
                icon: Zap,
                title: 'Compatibility',
                desc: 'Transparent compatibility matching scores evaluating skill parity, goals, and communication.',
              },
              {
                icon: Shield,
                title: 'Trust & Evidence',
                desc: 'Verified game IDs and player feedback ensure genuine credentials and non-toxic lobbies.',
              },
              {
                icon: Gamepad2,
                title: 'LFG / Sessions',
                desc: 'Create or join active gaming sessions without endless searching across third-party apps.',
              },
              {
                icon: RotateCcw,
                title: 'Play Again',
                desc: 'One-click reconnect feature allowing you to easily queue again with successful teammates.',
              },
              {
                icon: Trophy,
                title: 'Tournaments',
                desc: 'Discover competitive tournaments and test your squad chemistry in structured brackets.',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3 hover:border-emerald-500/40 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. TOURNAMENTS SECTION */}
      <section className="py-16 sm:py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 text-xs font-bold rounded-full mb-2">
                Competitions
              </Badge>
              <h2 className="text-2xl sm:text-4xl font-black text-white">Discover tournaments</h2>
              <p className="text-sm text-gray-300 mt-1">
                Find gaming tournaments and competitions in one place.
              </p>
            </div>

            <Link href="/tournaments">
              <Button variant="outline" className="rounded-xl font-bold text-xs border-white/15 hover:bg-white/5 text-white gap-2">
                Explore All Tournaments <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayTournaments.map((t: any, i: number) => {
              const isChallonge = t.source === 'challonge';
              const isExternal = t.url && (t.url.startsWith('http://') || t.url.startsWith('https://'));

              return (
                <div key={t.id || i} className="rounded-2xl border border-white/10 bg-[#0E1424]/70 p-5 space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-mono px-2 py-0.5 border ${
                          isChallonge
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {isChallonge ? '⚡ Challonge' : '🏆 GamerZ Hub'}
                      </Badge>
                      <span className="text-[10px] font-mono uppercase bg-white/5 text-gray-300 px-2 py-0.5 rounded border border-white/10 whitespace-nowrap">
                        {t.status?.replace('_', ' ') || 'OPEN'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-white truncate">{t.name || t.title}</h3>
                      <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">{t.game || 'Esports'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 pt-2 border-t border-white/10">
                      <span className="flex items-center gap-1 font-medium truncate">
                        <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> {t.participants ?? 0}/{t.maxParticipants ?? '16'}
                      </span>
                      <span className="flex items-center gap-1 font-medium truncate">
                        <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" /> {t.startDate ? formatDate(t.startDate) : 'TBD'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    {isExternal ? (
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 h-9 text-xs font-bold rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
                      >
                        View Tournament <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Link href={t.url || `/tournaments/${t.id}`}>
                        <Button className="w-full h-9 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110">
                          View Tournament
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. PRODUCT PREVIEW SECTION */}
      <section className="py-16 sm:py-20 border-t border-white/10 bg-[#0A0E17]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl sm:text-4xl font-black text-white">Designed for Seamless Teammate Discovery</h2>
            <p className="text-sm text-gray-300">
              A clean SaaS interface designed to get you out of random queues and into compatible squads.
            </p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-[#070A11] p-4 sm:p-6 shadow-2xl space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Find Teammates</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {['Valorant', 'CS2', 'League of Legends'].map((g, idx) => (
                  <span
                    key={g}
                    className={`text-[10px] font-mono font-bold px-3 py-1 rounded-full border max-w-full truncate ${
                      idx === 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-gray-400 border-white/10'
                    }`}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Roster Rows */}
            <div className="space-y-3">
              {[
                { name: 'Vortex_99', rank: 'Diamond III', role: 'Flex / Controller', match: '95%', status: 'Online Now' },
                { name: 'ShadowStrike', rank: 'Ascendant I', role: 'Entry Fragger', match: '91%', status: 'In Lobby' },
                { name: 'Nexus_Core', rank: 'Platinum II', role: 'Support / Sentinel', match: '88%', status: 'Online Now' },
              ].map((row, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 sm:p-4 text-xs hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                      {row.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-white text-sm truncate">{row.name}</h4>
                      <p className="text-[11px] text-gray-400 font-mono truncate">{row.rank} • {row.role}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0 text-center sm:text-left">
                      ⚡ {row.match} Compatibility
                    </span>
                    <Button size="sm" className="w-full sm:w-auto h-8 text-xs font-bold rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 shrink-0">
                      Send Squad Invite
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-20 border-t border-white/10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Your next squad could be <span className="text-emerald-400">one connection away.</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-300 max-w-xl mx-auto">
            Stop leaving match quality to chance. Discover suitable teammates, enjoy better sessions, and build repeat squads with GamerZ Hub.
          </p>
          <div className="pt-2">
            <Link href="/auth/register">
              <Button size="xl" className="px-10 h-14 rounded-2xl font-black text-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black shadow-xl shadow-emerald-500/30 hover:brightness-110 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-white/10 bg-[#04060B] py-12 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Brand */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg overflow-hidden border border-emerald-500/30 p-0.5">
                  <Image src="/logo.webp" alt="GamerZ Hub" width={24} height={24} className="w-full h-full object-cover rounded" />
                </div>
                <span className="font-extrabold text-base text-white">GamerZ Hub</span>
              </div>
              <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                GamerZ Hub helps gamers discover suitable teammates, find better gaming sessions, reconnect with good players, and build repeat squads.
              </p>
            </div>

            {/* Column 2: Navigation */}
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Product</h4>
              <ul className="space-y-1.5">
                <li><Link href="/teams" className="hover:text-emerald-400 transition-colors">Discover Teammates</Link></li>
                <li><Link href="/tournaments" className="hover:text-emerald-400 transition-colors">Tournaments</Link></li>
                <li><Link href="/teams" className="hover:text-emerald-400 transition-colors">Teams & Squads</Link></li>
              </ul>
            </div>

            {/* Column 3: Legal & Account */}
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Legal & Account</h4>
              <ul className="space-y-1.5">
                <li><Link href="/auth/login" className="hover:text-emerald-400 transition-colors">Sign In</Link></li>
                <li><Link href="/auth/register" className="hover:text-emerald-400 transition-colors">Create Account</Link></li>
                <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-center sm:flex sm:items-center sm:justify-between text-[11px]">
            <p>© {new Date().getFullYear()} GamerZ Hub. All rights reserved.</p>
            <p className="mt-2 sm:mt-0 font-mono text-emerald-400">Find Teammates. Build Better Squads.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

