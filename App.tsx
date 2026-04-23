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
 * Some chunk errors happen outside of the React lifecycle.
 * This listener catches them and triggers a recovery refresh.
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

// Basic Error Boundary for catching dashboard crashes
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dashboard Crash Caught:", error, errorInfo);
    
    // Safety Fallback: If ErrorBoundary catches a module failure that lazyWithRetry missed
    const isFetchError = error?.name === 'ChunkLoadError' || 
                        error?.message?.includes('Failed to fetch') ||
                        error?.message?.includes('dynamic import');

    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    if (isFetchError && !pageHasBeenForceRefreshed) {
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
      this.handleReset();
    }
  }
  handleReset = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (let reg of regs) reg.unregister();
      });
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        for (let name of names) caches.delete(name);
      });
    }
    window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <PremiumErrorPage 
          title="Dashboard Error"
          message="We encountered a critical error while loading the dashboard. This usually happens due to a connection break or a missing module."
          error={this.state.error}
          resetErrorBoundary={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}

// Simple Loading Component
const LoadingScreen: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
);

const AuthenticatedApp: React.FC = () => {
  const { user, role, signOut, loading, isDemo } = useAuth();
  const { currentBranch } = useBranch();
  useRealtimeSync(); // Initialize Global Realtime Sync

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHomePage, setIsHomePage] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'create-school'>('login');
  const [showAuthConfirm, setShowAuthConfirm] = useState(false);

  // State to simulate subscription for demo purposes
  // In real app, this comes from 'schools' table via user's school_id
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'inactive' | 'trial'>('inactive');
  const [showPayment, setShowPayment] = useState(false);

  // Detect auth confirmation callback or invite acceptance
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('type=signup') || hash.includes('/auth/callback')) {
      setShowAuthConfirm(true);
    }
  }, []);

  // Detect invite-accept path (must check before session guard)
  const isInviteAccept = window.location.hash.includes('/invite/accept');

  useEffect(() => {
    if (user && role) {
      console.log(`👤 User Authenticated: ${user.email} as ${role}`);
      requestNotificationPermission();

      // Initialize Realtime Service
      let schoolId = (user as any).school_id || user.user_metadata?.school_id || user.app_metadata?.school_id;

      // Fix for demo users who might not have school_id in metadata
      const isDemoAccount = user.email?.includes('demo') || user.user_metadata?.is_demo;
      if (!schoolId && isDemoAccount) {
        schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'; // Oliskey Demo School ID
      }

      if (schoolId) {
        console.log(`👤 Active School Context: ${schoolId}`);
      }

      // Show welcome toast after email verification
      const showWelcome = localStorage.getItem('show_welcome_toast');
      if (showWelcome === 'true') {
        localStorage.removeItem('show_welcome_toast');
        setTimeout(async () => {
          const toast = (await import('react-hot-toast')).default;
          toast.success('Email verified successfully. Welcome to your dashboard! 🎉', {
            duration: 5000,
            position: 'top-center'
          });
        }, 500);
      }

      // Check subscription status if Admin/Proprietor
      if (role === DashboardType.Admin || role === DashboardType.Proprietor || role === DashboardType.SuperAdmin) {
        setSubscriptionStatus('active');
      } else {
        setSubscriptionStatus('active');
      }
    }
  }, [user, role]);

  const handleLogout = async () => {
    // isDemo is now available from useAuth scope
    await signOut();
    setIsHomePage(true);
    setIsChatOpen(false);

    if (isDemo) {
      localStorage.setItem('last_login_mode', 'demo');
    } else {
      localStorage.removeItem('last_login_mode');
    }
  };

  const renderDashboard = useMemo(() => {
    if (!user || !role) return null;
    const props = { onLogout: handleLogout, setIsHomePage, currentUser: user };
    console.log(`🚀 Routing to Dashboard for role: ${role}`);
    return <DashboardRouter {...props} />;
  }, [user?.id, role]);

  if (loading) return <LoadingScreen />;

  // Invite accept link — takes priority over everything
  if (isInviteAccept) {
    return <InviteAcceptScreen />;
  }

  // isDemo is now destructured from useAuth above
  
  // Handle email verification routes (Muted as requested)
  /*
  const hash = window.location.hash;
  const isVerifyEmail = hash.includes('/auth/verify');
  const isVerifyEmailScreen = hash.includes('/auth/verify-email');
  
  if (isVerifyEmail && !isDemo) {
    if (hash.includes('token=') || window.location.search.includes('token=')) {
        return <VerifyEmail />;
    }
    return <VerifyEmailScreen />;
  }

  if (isVerifyEmailScreen && !isDemo) {
    return <VerifyEmailScreen />;
  }
  */

  if (showAuthConfirm) {
    return <AuthCallback />;
  }

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
          {renderDashboard}
          {isHomePage && <AIChatWidget dashboardType={role} onClick={() => setIsChatOpen(true)} />}
        </VerificationGuard>
      </Suspense>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState(0);
  const [initMessage, setInitMessage] = useState('Initializing...');

  // Removed isSupabaseConfigured guard as we are now custom

  useEffect(() => {
    mobileSyncManager.initialize();
    PushNotificationManager.initialize();

    const initializeOfflineFirst = async () => {
      // Add a global 10-second fail-safe to ensure the app ALWAYS loads
      const failSafeTimeout = setTimeout(() => {
        if (isInitializing) {
          console.warn('⚠️ Initialization taking too long. Triggering fail-safe display...');
          setIsInitializing(false);
        }
      }, 7000); // Reduced from 10s to 7s for a snappier feel

      const isAuditMode = (window as any).__AUDIT_MODE__ || localStorage.getItem('audit_mode') === 'true';
      if (isAuditMode) {
        window.__AUDIT_MODE__ = true; // Persist to window so components can check it
        console.log('🛡️ Audit Mode Detected: Skipping initialization delays...');
        clearTimeout(failSafeTimeout);
        setIsInitializing(false);
        return;
      }
      try {
        console.log('🚀 Initializing offline-first features...');
        
        // Parallelize non-dependent initialization with timeouts to prevent hanging
        const withTimeout = (promise: Promise<any>, ms: number, label: string) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms))
          ]);
        };

        setInitMessage('Setting up environment...');
        // Pre-warm the most critical task only
        await withTimeout(runMigrations(), 5000, 'Migrations')
          .then(() => setInitProgress(40))
          .catch(err => console.warn(`⚠️ Offline migrations taking time. Continuing...`));
        
        // Defer background sync registration to after initial mount
        requestBackgroundSync().catch(() => {});
        
        setInitMessage('Starting cache cleanup...');
        setInitProgress(60);
        cacheCleanupScheduler.start();
        
        // Don't block the main UI for initial hydration if we already have a session
        // or if it's the very first time. Let it run in background or after login.
        if (!isInitialHydrationComplete()) {
           console.log('🌊 Initial hydration will run in background');
           initialDataHydration().catch(err => console.error('Background hydration failed:', err));
        }

        setInitMessage('Ready!');
        setInitProgress(100);
        
        // Reduced timeout for snappier feel
        setTimeout(() => {
          clearTimeout(failSafeTimeout);
          setIsInitializing(false);
        }, 200);
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        clearTimeout(failSafeTimeout);
        setIsInitializing(false);
      }
    };

    initializeOfflineFirst();

    const handleBackgroundSync = () => {
      console.log('🔄 Background sync triggered by Service Worker');
      syncEngine.triggerSync();
    };

    window.addEventListener('sw-background-sync', handleBackgroundSync);
    return () => {
      window.removeEventListener('sw-background-sync', handleBackgroundSync);
    };
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 6000,
        }}
      />
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
