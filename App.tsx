import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { DashboardType } from './types';
import { requestNotificationPermission } from './components/shared/notifications';
import { realtimeService } from './services/RealtimeService';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { Toaster } from 'react-hot-toast';
import PremiumLoader from './components/ui/PremiumLoader';
import { runMigrations, initialDataHydration, isInitialHydrationComplete } from './lib/migrationManager';
import { cacheCleanupScheduler } from './lib/cacheManager';
import { mobileSyncManager } from './lib/mobile/MobileSync';
import { PushNotificationManager } from './lib/mobile/PushConfig';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useBranch } from './context/BranchContext';
import { useAuth } from './context/AuthContext';
import { requestBackgroundSync } from './lib/serviceWorkerRegistration';
import { syncEngine } from './lib/syncEngine';
import { lazyWithRetry } from './lib/lazyRetry';
import { APP_VERSION } from './lib/config';

// Unified lazy load with shared retry logic
const DashboardRouter = lazyWithRetry(() => import('./components/DashboardRouter'));
const Login = lazyWithRetry(() => import('./components/auth/Login'));
const Signup = lazyWithRetry(() => import('./components/auth/Signup'));
const CreateSchoolSignup = lazyWithRetry(() => import('./components/auth/CreateSchoolSignup'));
const AuthCallback = lazyWithRetry(() => import('./components/auth/AuthCallback'));
const VerifyEmail = lazyWithRetry(() => import('./components/auth/VerifyEmail'));
const VerifyEmailScreen = lazyWithRetry(() => import('./components/auth/VerifyEmailScreen'));
const InviteAcceptScreen = lazyWithRetry(() => import('./components/auth/InviteAcceptScreen'));
const VerificationGuard = lazyWithRetry(() => import('./components/auth/VerificationGuard'));
const AIChatScreen = lazyWithRetry(() => import('./components/shared/AIChatScreen'));
const AIChatWidget = lazyWithRetry(() => import('./components/shared/AIChatWidget'));
const MobileNavigationHandler = lazyWithRetry(() => import('./components/shared/MobileNavigationHandler'));
const ContextualMarquee = lazyWithRetry(() => import('./components/shared/ContextualMarquee'));
const PWAInstallPrompt = lazyWithRetry(() => import('./components/shared/PWAInstallPrompt'));
const UpdatePrompt = lazyWithRetry(() => import('./components/shared/UpdatePrompt'));
const PremiumErrorPage = lazyWithRetry(() => import('./components/ui/PremiumErrorPage'));

/**
 * GLOBAL FAILSFE: Unhandled Promise Rejections
 */
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

// Basic Error Boundary
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
  const { currentBranch } = useBranch();
  useRealtimeSync(); 

  // E2E Version Management Logic
  const schoolVersion = currentSchool?.platform_version;
  const isVersionMismatch = schoolVersion && schoolVersion !== APP_VERSION;

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

  useEffect(() => {
    if (user && role) {
      console.log(`👤 User Authenticated: ${user.email} as ${role}`);
      requestNotificationPermission();
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
          {/* Version Lock Overlay */}
          {isVersionMismatch && (
            <UpdatePrompt forced={true} targetVersion={schoolVersion} />
          )}
          
          {renderDashboard}
          {isHomePage && <AIChatWidget dashboardType={role} onClick={() => setIsChatOpen(true)} />}
        </VerificationGuard>
      </Suspense>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initMessage, setInitMessage] = useState('Initializing...');

  useEffect(() => {
    mobileSyncManager.initialize();
    PushNotificationManager.initialize();

    const initializeOfflineFirst = async () => {
      try {
        await runMigrations();
        cacheCleanupScheduler.start();
        setIsInitializing(false);
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        setIsInitializing(false);
      }
    };

    initializeOfflineFirst();
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      <OfflineIndicator />
      {isInitializing ? (
        <PremiumLoader message={initMessage} fullScreen={true} />
      ) : (
        <div className="font-sans w-full min-h-screen bg-[#F0F2F5] flex flex-col overflow-x-hidden">
          <div className="relative w-full flex-1 flex flex-col overflow-x-hidden">
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                <AuthenticatedApp />
                <PWAInstallPrompt />
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
