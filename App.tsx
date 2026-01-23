
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { DashboardType } from './types';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
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
import { DataService } from './services/DataService';

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




const AuthenticatedApp: React.FC = () => {
  const { user, role, signOut, loading } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHomePage, setIsHomePage] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // State to simulate subscription for demo purposes
  // In real app, this comes from 'schools' table via user's school_id
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'inactive' | 'trial'>('inactive');
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (user && role) {
      console.log(`👤 User Authenticated: ${user.email} as ${role}`);
      requestNotificationPermission();

      // Check subscription status if Admin/Proprietor
      if (role === DashboardType.Admin || role === DashboardType.Proprietor || role === DashboardType.SuperAdmin) {
        const checkSubscription = async () => {
          // Demo Bypass
          if (user.email === 'demo@school.edu' || user.email?.includes('demo')) {
            setSubscriptionStatus('active');
            return;
          }

          try {
            // 1. Get School ID from Profile via Service
            const profile = await DataService.getUserProfile(user.id, user.email || '');

            if (profile?.school_id) {
              // 2. Get Subscription Status from Service
              const status = await DataService.getSchoolSubscription(profile.school_id);
              setSubscriptionStatus(status as any);
            } else {
              setSubscriptionStatus('inactive');
            }
          } catch (err) {
            console.error("Error checking subscription:", err);
            setSubscriptionStatus('inactive');
          }
        };
        checkSubscription();
      } else {
        // Non-admins don't pay
        setSubscriptionStatus('active');
      }

      // Realtime Subscriptions
      const userId = user.id;

      const notifChannel = realtimeService.subscribeToNotifications(userId, (payload) => {
        showNotification(payload.title || 'New Notification', {
          body: payload.message || payload.content,
          icon: 'https://cdn-icons-png.flaticon.com/512/1007/1007996.png'
        });
      });

      return () => {
        realtimeService.unsubscribeAll();
      };
    }
  }, [user, role]);

  if (loading) return <LoadingScreen />;

  if (!user || !role) {
    if (authView === 'signup') {
      return <Signup onNavigateToLogin={() => setAuthView('login')} />;
    }
    return <Login onNavigateToSignup={() => setAuthView('signup')} />;
  }

  const handleLogout = async () => {
    // Check if current user is a demo user before signing out
    const isDemo = user?.email?.includes('demo') || user?.user_metadata?.is_demo;
    await signOut();
    setIsHomePage(true);
    setIsChatOpen(false);

    // If it was a demo user, show the demo login view
    if (isDemo) {
      // We need a way to pass this to Login. 
      // Since `authView` is state here, we can use that if we expanded it.
      // Or we can save to local storage.
      localStorage.setItem('last_login_mode', 'demo');
    } else {
      localStorage.removeItem('last_login_mode');
    }
  };



  const renderDashboard = () => {
    const props = { onLogout: handleLogout, setIsHomePage, currentUser: user };
    console.log(`🚀 Rendering Dashboard for role: ${role}`);

    try {
      switch (role) {
        case DashboardType.SuperAdmin: return <SuperAdminDashboard {...props} />;
        case DashboardType.Admin: return <AdminDashboard {...props} />;
        case DashboardType.Teacher: return <TeacherDashboard {...props} />;
        case DashboardType.Parent: return <ParentDashboard {...props} />;
        case DashboardType.Student: return <StudentDashboard {...props} />;
        case DashboardType.Proprietor: return <ProprietorDashboard {...props} />;
        case DashboardType.Inspector: return <InspectorDashboard {...props} />;
        case DashboardType.ExamOfficer: return <ExamOfficerDashboard {...props} />;
        case DashboardType.ComplianceOfficer: return <ComplianceOfficerDashboard {...props} />;
        case DashboardType.Counselor: return <CounselorDashboard {...props} />;
        default:
          console.warn(`No specific component for role ${role}, falling back to Student.`);
          return <StudentDashboard {...props} />;
      }
    } catch (e) {
      console.error("Critical error in renderDashboard:", e);
      return <div className="p-8 text-red-600">Failed to render dashboard component.</div>;
    }
  };

  if (isChatOpen) {
    return <AIChatScreen onBack={() => setIsChatOpen(false)} dashboardType={role} />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        {renderDashboard()}
      </Suspense>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Register service worker for PWA functionality
    registerServiceWorker();
  }, []);

  return (
    <AuthProvider>
      <ProfileProvider>
        {/* Toast Notifications */}
        <Toaster position="top-right" />

        {/* Offline indicator - shows when no internet connection */}
        <OfflineIndicator />

        <div className="font-sans w-full min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center overflow-y-auto">
          <div className="relative w-full flex-1 flex flex-col shadow-2xl">
            <AuthenticatedApp />
          </div>
        </div>

        {/* PWA install prompt - shows after 30s if not installed */}
        <PWAInstallPrompt />
      </ProfileProvider>
    </AuthProvider>
  );
};

export default App;
