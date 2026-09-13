'use client';
import dynamic from 'next/dynamic';
import { ReactNode, useEffect, useState } from 'react';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { MobileBottomNav } from './mobile-bottom-nav';
import { Footer } from './footer';
import { LEGAL_ROUTES } from '@/config/legal';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useAutoHideNav } from '@/hooks/useAutoHideNav';
import toast from 'react-hot-toast';
import { useOverlayActive } from '@/store/overlayStore';
import { GamerBackground } from '@/components/hud/gamer-background';
import { PageTransition } from '@/components/hud/page-transition';

const PanelHost = dynamic(() => import('./panel-host').then((m) => m.PanelHost), { ssr: false });
const CelebrationHost = dynamic(() => import('@/components/hud/celebration').then((m) => m.CelebrationHost), { ssr: false });
const ScrollControls = dynamic(() => import('./scroll-controls').then((m) => m.ScrollControls), { ssr: false });

export function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  // Validate and refresh session silently in the background
  useAuth();

  const [hasHydrated, setHasHydrated] = useState(false);

  // Instagram-style auto-hide for the top search bar & bottom nav on scroll.
  const navHidden = useAutoHideNav();

  // True while any premium modal/drawer/panel is open — dims, blurs and slightly
  // scales the app behind it so attention focuses on the active content.
  const overlayActive = useOverlayActive();

  useEffect(() => {
    document.body.style.overflow = overlayActive ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [overlayActive]);

  useEffect(() => {
    document.body.style.overflow = '';
  }, [pathname]);

  const isLanding = pathname === '/';
  const isAuthOrLanding = pathname === '/' || pathname?.startsWith('/auth') || pathname?.startsWith('/auth/');
  // Legal/documentation routes are public — never behind the auth guard, and
  // rendered full-width (no sidebar/bottom nav) like the landing page.
  const isLegalRoute = LEGAL_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`));
  const isPublicRoute = isAuthOrLanding || isLegalRoute;
  const hideSidebar = isPublicRoute || pathname?.startsWith('/messages') || pathname?.startsWith('/search');
  const hideBottomNav = isPublicRoute;
  const isServerPage = pathname?.startsWith('/servers/');
  const isMessages = pathname?.startsWith('/messages');
  const isSearch = pathname?.startsWith('/search');
  // Immersive full-screen experiences (chat, search) don't carry a footer.
  const hideFooter = isMessages || isSearch;

  useEffect(() => {
    // Check if the auth store is already hydrated from localStorage
    if (useAuthStore.persist.hasHydrated()) {
      setHasHydrated(true);
      return;
    }

    // Otherwise, listen for hydration completion
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    // Guard 1: Redirect to login if unauthenticated and trying to access private page
    if (!isAuthenticated && !isPublicRoute) {
      router.push('/auth/login');
      return;
    }

    // Guard 2: Redirect to feed if authenticated and trying to access landing/auth page
    if (isAuthenticated && user && isAuthOrLanding && pathname !== '/auth/callback') {
      router.push('/feed');
      return;
    }

    // Guard 3: Redirect to profile settings if profile is incomplete
    if (isAuthenticated && user) {
      const isProfileIncomplete =
        !user.profile ||
        !user.profile.displayName?.trim();

      const onSettingsPage = pathname === '/profile/settings';

      if (isProfileIncomplete && !onSettingsPage && !isPublicRoute) {
        toast('Gamer Passport incomplete. Please complete setup!', { id: 'setup-guard-toast' });
        router.push('/profile/settings');
      }
    }
  }, [hasHydrated, user, isAuthenticated, isPublicRoute, isAuthOrLanding, pathname, router]);

  const isRedirectingAuthenticatedUser = isAuthenticated && !!user && isAuthOrLanding && pathname !== '/auth/callback';
  const isRedirectingUnauthenticatedUser = !isAuthenticated && !isPublicRoute;

  // Render a branded splash screen only until hydration completes for private routes to eliminate unauthenticated redirects or layout flashes.
  // Public landing page (/) renders immediately on initial paint.
  if ((!hasHydrated || isRedirectingAuthenticatedUser || isRedirectingUnauthenticatedUser) && !isLanding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-all">
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-primary/20 shadow-xl relative shrink-0">
            <img src="/logo.webp" alt="GamerZ Hub" className="w-full h-full object-cover" loading="eager" decoding="async" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
            <span>Loading GamerZ Hub...</span>
          </div>
        </div>
      </div>
    );
  }

  // Dedicated lightweight landing shell: zero dashboard navigation DOM/JS mounted on landing page
  if (isLanding) {
    return (
      <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative safe-area-all">
        <GamerBackground dense />
        <main id="main-content" role="main" className="w-full min-h-screen relative z-10">
          <PageTransition pathname={pathname}>{children}</PageTransition>
        </main>
        <CelebrationHost />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Big Animation System: animated aurora + particles + panning grid */}
      <GamerBackground />

      <header role="banner" className={isMessages ? "hidden" : "block relative z-30"}>
        <Navbar hidden={navHidden} />
      </header>
      
      <div className={`w-full transition-[padding,transform] duration-300 ease-in-out relative z-10 ${overlayActive && !isMessages && !isSearch ? 'scale-[0.985]' : ''} ${!isLanding ? (isMessages || isSearch ? 'pt-0 pb-0' : 'pt-16 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-8') : ''}`}>
        <div className={`w-full max-w-7xl mx-auto flex gap-3 lg:gap-4.5 ${isMessages || isSearch ? 'px-0 py-0' : 'px-2 sm:px-4 md:px-6 py-2.5 md:py-5'}`}>
          {!hideSidebar && !isServerPage && !isMessages && (
            <aside aria-label="Control Panel" className="hidden md:block shrink-0">
              <Sidebar />
            </aside>
          )}
          <main id="main-content" role="main" className="flex-1 min-w-0 max-w-full">
            <PageTransition pathname={pathname}>{children}</PageTransition>
          </main>
        </div>
        {!hideFooter && (
          <div className="mt-10 md:mt-14">
            <Footer />
          </div>
        )}
      </div>
      {!hideBottomNav && (
        <nav aria-label="Mobile Navigation" className="block md:hidden">
          <MobileBottomNav hidden={navHidden} />
        </nav>
      )}
      {/* Progress bar + scroll-to-top FAB appear while the nav bars are auto-hidden */}
      {!isAuthOrLanding && !isMessages && <ScrollControls hidden={navHidden} />}
      {/* Premium overlay host: renders page-level features as panels */}
      <PanelHost />
      {/* Full-screen confetti + banner celebrations */}
      <CelebrationHost />
    </div>
  );
}
