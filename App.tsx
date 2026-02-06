
import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import DashboardRouter from './components/DashboardRouter';
import { DashboardType } from './types';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import CreateSchoolSignup from './components/auth/CreateSchoolSignup';
import AuthCallback from './components/auth/AuthCallback';
import VerificationGuard from './components/auth/VerificationGuard';
import AIChatScreen from './components/shared/AIChatScreen';
import { requestNotificationPermission, showNotification } from './components/shared/notifications';
import { ProfileProvider } from './context/ProfileContext';

// import { GamificationProvider } from './context/GamificationContext'; // Moved to StudentDashboard
import { AuthProvider, useAuth } from './context/AuthContext';
import { realtimeService } from './services/RealtimeService';
import { registerServiceWorker } from './lib/pwa';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { PWAInstallPrompt } from './components/shared/PWAInstallPrompt';
import { Toaster } from 'react-hot-toast';
import PremiumLoader from './components/ui/PremiumLoader';
import { supabase } from './lib/supabase';
// import { DataService } from './services/DataService';

// Offline-First Imports
import { syncEngine } from './lib/syncEngine';
import { networkManager } from './lib/networkManager';
import { registerServiceWorker as registerOfflineSW, requestBackgroundSync } from './lib/serviceWorkerRegistration';
import { runMigrations, initialDataHydration, isInitialHydrationComplete } from './lib/migrationManager';
import { cacheCleanupScheduler } from './lib/cacheManager';

// Mobile Optimizations
import { mobileSyncManager } from './lib/mobile/MobileSync';
import { PushNotificationManager } from './lib/mobile/PushConfig';
import { BranchProvider, BranchSwitcher } from './context/BranchContext';
import MobileNavigationHandler from './components/shared/MobileNavigationHandler';
import { ContextualMarquee } from './components/shared/ContextualMarquee';

const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('./components/admin/SuperAdminDashboard'));
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard'));
const ParentDashboard = lazy(() => import('./components/parent/ParentDashboard'));
const StudentDashboard = lazy(() => import('./components/student/StudentDashboard'));
const ProprietorDashboard = lazy(() => import('./components/proprietor/ProprietorDashboard'));
const InspectorDashboard = lazy(() => import('./components/inspector/InspectorDashboard'));
const ExamOfficerDashboard = lazy(() => import('./components/admin/ExamOfficerDashboard'));
const ComplianceOfficerDashboard = lazy(() => import('./components/admin/ComplianceOfficerDashboard'));
const CounselorDashboard = lazy(() => import('./components/admin/CounselorDashboard'));

// A simple checkmark icon for the success animation
const CheckCircleIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l2 2l4 -4" /></svg>;

const SuccessScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full bg-green-500 animate-fade-in">
    <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center">
      <CheckCircleIcon className="w-20 h-20 text-white animate-checkmark-pop" />
    </div>
    <p className="mt-4 text-2xl font-bold text-white">Login Successful!</p>
  </div>
);

const LoadingScreen: React.FC = () => (
  <PremiumLoader message="Initializing Oliskey School Portal..." />
);

// Basic Error Boundary for catching dashboard crashes
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dashboard Crash Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50 h-full flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold text-red-700 mb-2">Dashboard Error</h2>
          <p className="text-red-500 mb-4 max-w-md mx-auto">
            {this.state.error?.message || "Critical error loading dashboard."}
            <br />
            <span className="text-sm font-normal">This can happen due to a connection break or a module failing to load.</span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
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
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Reset Connection & Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Simple Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { useRealtimeSync } from './hooks/useRealtimeSync';

const AuthenticatedApp: React.FC = () => {
  const { user, role, signOut, loading } = useAuth();
  useRealtimeSync(); // Initialize Global Realtime Sync

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHomePage, setIsHomePage] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'create-school'>('login');
  const [showAuthConfirm, setShowAuthConfirm] = useState(false);

  // State to simulate subscription for demo purposes
  // In real app, this comes from 'schools' table via user's school_id
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'inactive' | 'trial'>('inactive');
  const [showPayment, setShowPayment] = useState(false);

  // Detect auth confirmation callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('type=signup') || hash.includes('/auth/callback')) {
      setShowAuthConfirm(true);
    }
  }, []);


  // ... (keep structure)

  useEffect(() => {
    if (user && role) {
      console.log(`👤 User Authenticated: ${user.email} as ${role}`);
      requestNotificationPermission();

      // Initialize Realtime Service
      const schoolId = user.user_metadata?.school_id || (user as any).school_id;
      if (schoolId) {
        realtimeService.initialize(user.id, schoolId);
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
        // DataService removed for fresh backend start - defaulting to active
        setSubscriptionStatus('active');
      } else {
        // Non-admins don't pay
        setSubscriptionStatus('active');
      }
    }
  }, [user, role]);

  const handleLogout = async () => {
    // Check if current user is a demo user before signing out
    const isDemo = user?.email?.includes('demo') || user?.user_metadata?.is_demo;
    await signOut();
    setIsHomePage(true);
    setIsChatOpen(false);

    // If it was a demo user, show the demo login view
    if (isDemo) {
      localStorage.setItem('last_login_mode', 'demo');
    } else {
      localStorage.removeItem('last_login_mode');
    }
  };

  /* 
     Dynamic Dashboard Router 
     Handles role-based rendering and school branding injection
  */
  const renderDashboard = useMemo(() => {
    if (!user || !role) return null;
    const props = { onLogout: handleLogout, setIsHomePage, currentUser: user };
    console.log(`🚀 Routing to Dashboard for role: ${role}`);
    return <DashboardRouter {...props} />;
  }, [user?.id, role]); // Only re-render when user ID or role changes

  if (loading) return <LoadingScreen />;

  // Show auth confirmation screen if callback detected
  if (showAuthConfirm) {
    return <AuthCallback />;
  }

  if (!user || !role) {
    if (authView === 'signup') {
      return <Signup onNavigateToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'create-school') {
      return <CreateSchoolSignup onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <Login onNavigateToSignup={() => setAuthView('signup')} onNavigateToCreateSchool={() => setAuthView('create-school')} />;
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
        </VerificationGuard>
      </Suspense>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState(0);
  const [initMessage, setInitMessage] = useState('Initializing...');

  useEffect(() => {
    // Initialize Mobile-Specific Features (Capacitor)
    mobileSyncManager.initialize();
    PushNotificationManager.initialize();

    // Initialize offline-first features
    const initializeOfflineFirst = async () => {
      try {
        console.log('🚀 Initializing offline-first features...');

        setInitMessage('Setting up database...');
        setInitProgress(20);

        // Run database migrations
        await runMigrations();

        setInitMessage('Registering Service Worker...');
        setInitProgress(40);

        // Register Service Worker for background sync (Non-blocking)
        registerOfflineSW().then(() => {
          console.log('✅ Service Worker registered (background)');
        }).catch(err => {
          console.warn('⚠️ Service Worker registration skipped or failed:', err);
        });

        // Request background sync permission (Non-blocking)
        requestBackgroundSync().catch(err => {
          console.warn('⚠️ Background sync request failed:', err);
        });

        setInitMessage('Starting cache cleanup...');
        setInitProgress(60);

        // Start cache cleanup scheduler
        // scheduler already auto-starts in its own file, but we can call it here too
        cacheCleanupScheduler.start();

        setInitMessage('Checking for initial data...');
        setInitProgress(80);

        // Perform initial hydration if first load
        if (!isInitialHydrationComplete()) {
          await initialDataHydration((progress, message) => {
            setInitProgress(80 + (progress * 0.2)); // 80-100%
            setInitMessage(message);
          });
        }

        setInitMessage('Ready!');
        setInitProgress(100);

        console.log('✅ Offline-first initialization complete');

        // Small delay to show completion and let UI settle
        setTimeout(() => {
          setIsInitializing(false);
        }, 800);

      } catch (error) {
        console.error('❌ Offline-first initialization failed:', error);
        // Continue anyway - app should still work
        setIsInitializing(false);
      }
    };

    // Also register legacy PWA service worker
    registerServiceWorker();

    // Initialize offline features
    initializeOfflineFirst();

    // Listen for background sync events from Service Worker
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
    <AuthProvider>
      <ProfileProvider>
        <BranchProvider>
          {/* Toast Notifications */}
          <Toaster position="top-right" />

          {/* Offline indicator - shows when no internet connection */}
          <OfflineIndicator />

          {isInitializing ? (
            <PremiumLoader message={initMessage} />
          ) : (
            <div className="font-sans w-full min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center overflow-y-auto">
              <div className="relative w-full flex-1 flex flex-col shadow-2xl">
                <AuthenticatedApp />
                <PWAInstallPrompt />
              </div>
            </div>
          )}
        </BranchProvider>
      </ProfileProvider>
    </AuthProvider>
  );
};

export default App;
