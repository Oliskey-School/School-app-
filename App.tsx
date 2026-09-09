import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { AppearanceSync } from './components/shared/LiquidGlassControl';
import { MotionConfig } from 'framer-motion';
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
import { maxVersion, isOutdated } from './lib/version';

const DashboardRouter = lazyWithRetry(() => import('./components/DashboardRouter'));
const Login = lazyWithRetry(() => import('./components/auth/Login'));
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
const PremiumErrorPage = lazyWithRetry(() => import('./components/ui/PremiumErrorPage'));
const SubscriptionLockScreen = lazyWithRetry(() => import('./components/shared/SubscriptionLockScreen'));

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
    console.error('Dashboard Crash Caught:', error, errorInfo);
  }

  handleReset = () => window.location.reload();

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

  useEffect(() => {
    setAIAllowed(subscriptionGate.isAIAllowed);
  }, [subscriptionGate.isAIAllowed]);

  const [latestRegistryVersion, setLatestRegistryVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const run = () => {
      import('./lib/api').then(({ api }) => api.getAppVersions())
        .then((list: any[]) => {
          if (active && Array.isArray(list) && list[0]?.version) {
            setLatestRegistryVersion(list[0].version);
          }
        })
        .catch(() => {});
    };
    const timer = window.setTimeout(run, 2000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !role) return;
    const timer = window.setTimeout(() => {
      import('./components/shared/notifications')
        .then(({ requestNotificationPermission }) => requestNotificationPermission())
        .catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [user, role]);

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

  const isInviteAccept = window.location.hash.includes('/invite/accept');

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

  if (loading) return <LoadingScreen />;
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
        <MobileNavigationHandler />
        <ContextualMarquee />
        <VerificationGuard>
          {isVersionMismatch && <UpdatePrompt forced={true} targetVersion={latestVersion} />}
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
    setIsInitializing(false);

    const runBackgroundInitialization = () => {
      runMigrations()
        .then(() => cacheCleanupScheduler.start())
        .catch((error) => console.error('❌ Initialization failed:', error));

      import('./lib/mobile/MobileSync').then(({ mobileSyncManager }) => mobileSyncManager.initialize()).catch(() => {});
      import('./lib/mobile/PushConfig').then(({ PushNotificationManager }) => PushNotificationManager.initialize()).catch(() => {});
    };

    const idle = 'requestIdleCallback' in window
      ? window.setTimeout(() => (window as any).requestIdleCallback(runBackgroundInitialization, { timeout: 3000 }), 0)
      : window.setTimeout(runBackgroundInitialization, 1500);

    return () => window.clearTimeout(idle);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <Toaster position="top-right" />
      <OfflineIndicator />
      <AppearanceSync />
      {isInitializing ? (
        <PremiumLoader message={initMessage} fullScreen={true} />
      ) : (
        <div className="font-sans w-full min-h-screen bg-[#F0F2F5] flex flex-col overflow-x-hidden">
          <div className="relative w-full flex-1 flex flex-col overflow-x-hidden">
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                <AuthenticatedApp />
                <UpdatePrompt />
              </Suspense>
            </ErrorBoundary>
          </div>
        </div>
      )}
    </MotionConfig>
  );
};

export default App;
