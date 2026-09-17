import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { DashboardType } from './types';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { RealtimeStatusIndicator } from './components/shared/RealtimeStatusIndicator';
import { AppearanceSync } from './components/shared/LiquidGlassControl';
import { Toaster } from 'react-hot-toast';
import PremiumLoader from './components/ui/PremiumLoader';
import { runMigrations } from './lib/migrationManager';
import { cacheCleanupScheduler } from './lib/cacheManager';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useAuth } from './context/AuthContext';
import { useSubscriptionGate } from './hooks/useSubscriptionGate';
import { setAIAllowed } from './lib/ai';
import { useIdleKeepAlive } from './lib/hooks/useIdleKeepAlive';
import { lazyWithRetry } from './lib/lazyRetry';
import { APP_VERSION } from './lib/config';
import * as api from './lib/api/eager';
import { maxVersion, isOutdated } from './lib/version';

// Login and PremiumErrorPage are deliberately STATIC imports. They are the two
// screens that have to render when the lazy-chunk pipeline itself is broken
// (stale PWA cache, CDN failure, ChunkLoadError) — routing them through the same
// chunk loader that just failed leaves the user on a blank page with no way out.
// PremiumErrorPage additionally renders from ErrorBoundary, which sits OUTSIDE
// any Suspense boundary, where a lazy component would suspend with no parent to
// catch it.
import Login from './components/auth/Login';
import PremiumErrorPage from './components/ui/PremiumErrorPage';

const DashboardRouter = lazyWithRetry(() => import('./components/DashboardRouter'));
const Signup = lazyWithRetry(() => import('./components/auth/Signup'));
const CreateSchoolSignup = lazyWithRetry(() => import('./components/auth/CreateSchoolSignup'));
const AuthCallback = lazyWithRetry(() => import('./components/auth/AuthCallback'));
const InviteAcceptScreen = lazyWithRetry(() => import('./components/auth/InviteAcceptScreen'));
const VerificationGuard = lazyWithRetry(() => import('./components/auth/VerificationGuard'));
const AIChatScreen = lazyWithRetry(() => import('./components/shared/AIChatScreen'));
const AIChatWidget = lazyWithRetry(() => import('./components/shared/AIChatWidget'));
const MobileNavigationHandler = lazyWithRetry(() => import('./components/shared/MobileNavigationHandler'));
const ContextualMarquee = lazyWithRetry(() => import('./components/shared/ContextualMarquee'));
const UpdatePrompt = lazyWithRetry(() => import('./components/shared/UpdatePrompt'));
const SubscriptionLockScreen = lazyWithRetry(() => import('./components/shared/SubscriptionLockScreen'));

// framer-motion is used by ~250 lazy-loaded screens but essentially nothing
// eager (Login has zero motion.* usage) — yet importing MotionConfig here
// statically forced the entire library (339KB minified, the single largest
// piece of the eager bundle) into every visitor's critical-path download
// before the login page could even paint. Loading it the same way as every
// other non-critical piece of this shell lets Rollup split it into its own
// chunk instead. The Suspense fallback is the same content unwrapped (not a
// spinner), so there's no visible loading state — just a few ms window,
// usually already overlapped with other startup requests, where the
// prefers-reduced-motion setting isn't applied yet.
const LazyMotionConfig = lazyWithRetry(
  () => import('framer-motion').then(m => ({ default: m.MotionConfig })),
  'motion-config'
);

window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const isFetchError = error?.name === 'ChunkLoadError' ||
                      error?.message?.includes('Failed to fetch') ||
                      error?.message?.includes('dynamic import');

  const pageHasBeenForceRefreshed = JSON.parse(
    window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
  );

  if (isFetchError && !pageHasBeenForceRefreshed) {
    console.warn('⚠️ Global Fetch Error detected. Recovering app...');
    window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
    window.location.reload();
  }
});

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dashboard Crash Caught:", error, errorInfo);
  }
  handleReset = () => {
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <PremiumErrorPage
          title="Dashboard Error"
          message="We encountered a critical error while loading the dashboard."
          error={this.state.error}
          resetErrorBoundary={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

const LoadingScreen: React.FC = () => (
    <PremiumLoader message="Initializing School Workspace..." />
);

const AuthenticatedApp: React.FC = () => {
  const { user, role, signOut, loading, isDemo, currentSchool } = useAuth();
  useRealtimeSync();
  const subscriptionGate = useSubscriptionGate();

  useIdleKeepAlive(!!user && !!role && !isDemo);

  useEffect(() => { setAIAllowed(subscriptionGate.isAIAllowed); }, [subscriptionGate.isAIAllowed]);

  const [latestRegistryVersion, setLatestRegistryVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let active = true;
    api.getAppVersions()
      .then((list: any[]) => {
        if (active && Array.isArray(list) && list[0]?.version) setLatestRegistryVersion(list[0].version);
      })
      .catch(() => { });
    return () => { active = false; };
  }, [user]);

  const latestVersion = maxVersion(latestRegistryVersion, currentSchool?.platform_version, APP_VERSION);
  const isVersionMismatch = isOutdated(APP_VERSION, latestVersion);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHomePage, setIsHomePage] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'create-school'>('login');
  const [showAuthConfirm, setShowAuthConfirm] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('type=signup') || hash.includes('/auth/callback')) {
      setShowAuthConfirm(true);
    }
  }, []);

  // DashboardLayout's demo-mode "Create Your School" button lives deep under
  // DashboardRouter, with no direct path to this component's authView state —
  // it dispatches this event (alongside its own signOut()) instead of forcing
  // a full page reload, which used to land back on the login screen instead
  // of Create School.
  useEffect(() => {
    const handleDemoCreateSchool = () => setAuthView('create-school');
    window.addEventListener('demo-create-school', handleDemoCreateSchool);
    return () => window.removeEventListener('demo-create-school', handleDemoCreateSchool);
  }, []);

  const isInviteAccept = window.location.hash.includes('/invite/accept');

  useEffect(() => {
    if (user && role) {
      console.log(`👤 User Authenticated: ${user.email} as ${role}`);
      // Permission prompting is secondary work; do not make it part of dashboard
      // boot. The module is imported here rather than at the top of the file so
      // it stays out of the eager login graph entirely.
      const promptForNotifications = () => {
        void import('./components/shared/notifications')
          .then(({ requestNotificationPermission }) => requestNotificationPermission())
          .catch(() => { });
      };
      // typeof, not `in`: lib.dom declares requestIdleCallback as always present,
      // so `"requestIdleCallback" in window` narrows window to never in the else
      // branch and window.setTimeout stops type-checking there.
      const idle = typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(promptForNotifications, { timeout: 3000 })
        : window.setTimeout(promptForNotifications, 1000);
      return () => {
        if ('cancelIdleCallback' in window && typeof idle === 'number') window.cancelIdleCallback(idle);
        else window.clearTimeout(idle as number);
      };
    }
  }, [user, role]);

  const handleLogout = async () => {
    await signOut();
    setIsHomePage(true);
    setIsChatOpen(false);
  };

  const renderDashboard = useMemo(() => {
    if (!user || !role) return null;
    const props = { onLogout: handleLogout, setIsHomePage, currentUser: user };
    return <DashboardRouter {...props} />;
  }, [user?.id, role]);

  // A first-time visitor has no session to restore, so holding them behind the
  // auth-bootstrap spinner is pure dead time — the login shell can paint at once
  // while bootstrap finishes in the background. Once a stored token or user
  // exists the gate still applies: that transition IS authenticated work and
  // must not flash the login screen on the way through.
  let hasStoredSession = false;
  try {
    hasStoredSession = !!sessionStorage.getItem('auth_token');
  } catch {
    // sessionStorage throws in hardened/private browser contexts. Treat that as
    // unauthenticated so the critical login shell stays reachable.
  }
  if (loading && (hasStoredSession || !!user)) return <LoadingScreen />;
  if (isInviteAccept) return <InviteAcceptScreen />;
  if (showAuthConfirm) return <AuthCallback />;

  if (!user || !role) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        {authView === 'signup' ? (
          <Signup onNavigateToLogin={() => React.startTransition(() => setAuthView('login'))} />
        ) : authView === 'create-school' ? (
          <CreateSchoolSignup onNavigateToLogin={() => React.startTransition(() => setAuthView('login'))} />
        ) : (
          <Login
            onNavigateToSignup={() => React.startTransition(() => setAuthView('signup'))}
            onNavigateToCreateSchool={() => React.startTransition(() => setAuthView('create-school'))}
          />
        )}
      </Suspense>
    );
  }

  if (isChatOpen) {
    return <AIChatScreen onBack={() => setIsChatOpen(false)} dashboardType={role} />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        {/* Only mounted once a user/role exist (this branch runs after the
            !user || !role early return above), so it never shows on the
            public login screen before a socket connection has even been
            attempted. */}
        <RealtimeStatusIndicator />
        <MobileNavigationHandler />
        <ContextualMarquee />
        <VerificationGuard>
          {isVersionMismatch && (
            <UpdatePrompt forced={true} targetVersion={latestVersion} />
          )}
          {subscriptionGate.isLocked && !window.location.pathname.startsWith('/subscription') ? (
            <SubscriptionLockScreen />
          ) : (
            <>
              {renderDashboard}
              {isHomePage && <AIChatWidget dashboardType={role} onClick={() => setIsChatOpen(true)} />}
            </>
          )}
        </VerificationGuard>
      </Suspense>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initMessage] = useState('Initializing...');

  useEffect(() => {
    // These modules are not needed to paint the shell. Load them only after the
    // first interactive frame so mobile/offline infrastructure cannot block login.
    let cancelled = false;
    const initializeBackgroundServices = async () => {
      try {
        const [{ mobileSyncManager }, { PushNotificationManager }] = await Promise.all([
          import('./lib/mobile/MobileSync'),
          import('./lib/mobile/PushConfig'),
        ]);
        if (cancelled) return;
        mobileSyncManager.initialize();
        PushNotificationManager.initialize();
      } catch (error) {
        console.warn('⚠️ Background mobile initialization failed:', error);
      }
    };

    const startBackgroundInitialization = () => {
      void (async () => {
        try {
          await runMigrations();
          if (!cancelled) cacheCleanupScheduler.start();
        } catch (error) {
          console.error('❌ Background initialization failed:', error);
        }
      })();
      void initializeBackgroundServices();
    };

      // typeof, not `in`: lib.dom declares requestIdleCallback as always present,
      // so `"requestIdleCallback" in window` narrows window to never in the else
      // branch and window.setTimeout stops type-checking there.
    const idle = typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(startBackgroundInitialization, { timeout: 1500 })
      : window.setTimeout(startBackgroundInitialization, 250);

    // First paint is independent of migrations/mobile setup.
    setIsInitializing(false);

    return () => {
      cancelled = true;
      if ('cancelIdleCallback' in window && typeof idle === 'number') window.cancelIdleCallback(idle);
      else window.clearTimeout(idle as number);
    };
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        // react-hot-toast's own defaults are inconsistent (2s for success, 4s
        // for error/blank) and short enough that a message can disappear
        // before it's read. `loading` is deliberately left out — those are
        // meant to stay until the caller explicitly dismisses them; the real
        // "toasts never dismiss" bug was call sites that forgot to do that,
        // not the loading type itself.
        toastOptions={{ duration: 5000 }}
      />
      <OfflineIndicator />
      <AppearanceSync />
      {isInitializing ? (
        <PremiumLoader message={initMessage} fullScreen={true} />
      ) : (
        <div className="font-sans w-full min-h-screen bg-[#F0F2F5] flex flex-col overflow-x-hidden">
          <div className="relative w-full flex-1 flex flex-col overflow-x-hidden">
            <ErrorBoundary>
              {/* AuthenticatedApp has never mounted yet the first time this
                  Suspense resolves, so folding LazyMotionConfig's own chunk
                  load into the SAME boundary (rather than a separate Suspense
                  around already-mounted, stateful UI) costs nothing extra in
                  practice — both chunks fetch in parallel — and can't cause
                  a later remount. A MotionConfig swap placed around the
                  already-interactive app shell instead (tried first) did
                  cause one: Playwright caught it as the demo role tiles
                  never appearing after the "Try Demo School" click. */}
              <Suspense fallback={<LoadingScreen />}>
                <LazyMotionConfig reducedMotion="user">
                  <AuthenticatedApp />
                </LazyMotionConfig>
              </Suspense>
              {/* UpdatePrompt owns the ONLY service-worker registration
                  (useRegisterSW), so it stays mounted at the root, where it
                  renders before any login and survives logout. It gets its own
                  Suspense with a null fallback because sharing AuthenticatedApp's
                  boundary made the login shell wait on the PWA chunk. */}
              <Suspense fallback={null}>
                <UpdatePrompt />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
