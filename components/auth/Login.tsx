import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { DashboardType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { SchoolLogoIcon, THEME_CONFIG } from '../../constants';
import { authenticateUser } from '../../lib/auth';
import { useNavigate } from 'react-router-dom';
import SchoolSignup from './SchoolSignup';
import EmailVerificationScreen from './EmailVerificationScreen';

const EyeIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

import { DEMO_ACCOUNTS, DEMO_ROLES_ORDER, DEMO_SCHOOL_ID, DEMO_BRANCH_ID } from '../../lib/mockAuth';

// Global state to prevent multiple initializations of Google Identity Services
let googleIdentityInitialized = false;
let googleResponseHandler: ((resp: any) => void) | null = null;

const Login: React.FC<{ onNavigateToSignup: () => void; onNavigateToCreateSchool?: () => void }> = ({ onNavigateToSignup, onNavigateToCreateSchool }) => {
  const [view, setView] = useState<'login' | 'school_signup' | 'demo' | 'verify'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn, signInWithGoogle, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [showGoogleMock, setShowGoogleMock] = useState(false);
  
  // Verification state
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationUserId, setVerificationUserId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [googleInitialized, setGoogleInitialized] = useState(googleIdentityInitialized);

  const googleInitRef = useRef(false);

  // Initialize Google Identity Services
  useEffect(() => {
    // Update the global handler to point to this component instance's handler
    googleResponseHandler = handleGoogleResponse;

    const initializeGoogle = () => {
      if ((window as any).google && !googleIdentityInitialized) {
        console.log('🛡️ [Google] Initializing Identity Services...');
        (window as any).google.accounts.id.initialize({
          client_id: "721743639912-8ks885994n29is9595849494.apps.googleusercontent.com", // Placeholder: REPLACE WITH REAL ID
          callback: (response: any) => {
            if (googleResponseHandler) googleResponseHandler(response);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        googleIdentityInitialized = true;
        setGoogleInitialized(true);
      } else if (googleIdentityInitialized) {
        setGoogleInitialized(true);
      }
    };

    // Load Google script check
    if (!(window as any).google) {
      const interval = setInterval(() => {
        if ((window as any).google) {
          initializeGoogle();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    } else {
      initializeGoogle();
    }

    return () => {
      // Don't reset googleIdentityInitialized, but we can clear the handler if needed
      // Actually, keep it for the next mount if it's the same logical flow
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Decode JWT to get email and name (No library needed for basic preview)
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      const { email, name } = payload;
      
      console.log('🛡️ [Google] Verifying account:', email);
      
      // Call our backend to verify if this email has an account
      await signInWithGoogle(email, name);
      navigate('/');
    } catch (err: any) {
      console.error('❌ [Google] Auth Error:', err);
      // The backend returns "No Data" if not found
      setError(err.message || 'No Data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    if (googleInitialized) {
      // Trigger the Google Account Picker ("show them all the google account on that phone")
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          // If One Tap is blocked/not shown, we could use the standard button
          // But usually prompt() works well for the "all accounts" experience
          console.warn('One Tap not displayed:', notification.getNotDisplayedReason());
          setError('Please use the standard login or ensure Google services are enabled.');
        }
      });
    } else {
      setError('Google Sign-In is initializing. Please try again in a moment.');
    }
  };

  useEffect(() => {
    const lastMode = localStorage.getItem('last_login_mode');
    if (lastMode === 'demo' && view !== 'demo') {
      setView('demo');
    }
  }, []);

  // School Signup flow
  if (view === 'school_signup') {
    return <SchoolSignup
      onBack={() => setView('login')}
      onComplete={(email, role) => {
        setEmail(email);
        setPassword('');
        setView('login');
      }}
    />;
  }

  // Email Verification flow
  if (view === 'verify') {
    return (
      <EmailVerificationScreen
        email={verificationEmail}
        userId={verificationUserId}
        onBack={() => {
          setView('login');
          setVerificationEmail('');
          setVerificationUserId('');
          setOtpCode('');
          setError('');
        }}
        onVerified={async (token, user) => {
          const dashboardType = mapRoleToDashboard(user.role);
          await signIn(dashboardType, {
            userId: user.id,
            email: user.email,
            userType: user.role,
            token: token,
            schoolGeneratedId: user.school_generated_id,
            school: user.school_id ? { id: user.school_id } : undefined
          });
          navigate('/'); // Redirect to dashboard
        }}
      />
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Attempt Unified Auth (Backend handles Email or Username)
      const result = await authenticateUser(email, password);

      if (!result.success) {
        // If real auth fails, we might check for mock credentials if configured
        console.warn("Auth Failed:", result.error);

        throw new Error(result.error || 'Invalid credentials');
      }

      // 3. Success - Backend Auth
      if (result.success) {
        const dashboardType = mapRoleToDashboard(result.userType || 'student');

        await signIn(dashboardType, {
          userId: result.userId,
          email: result.email,
          userType: result.userType,
          token: result.token, // Pass the JWT from backend
          refreshToken: result.refreshToken || result.token, // Ensure refresh token is passed
          schoolGeneratedId: result.schoolGeneratedId,
          school: result.userData?.school_id ? { id: result.userData.school_id } : undefined

        });
        
        navigate('/'); // Redirect to dashboard
      }

    } catch (err: any) {
      console.error("Login Error", err);
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (roleKey: string) => {
    setError('');
    setIsLoading(true);

    try {
      console.log(`🚀 [Demo] Switching to Demo Role: ${roleKey}...`);
      await switchDemoRole(roleKey);
      navigate('/'); // Redirect to dashboard
    } catch (err: any) {
      console.error("❌ [Demo] Quick Login Error:", err);
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo View — centered role switcher
  if (view === 'demo') {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4">
        {/* Centered Card */}
        <div className="w-full max-w-[440px] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 flex flex-col items-center">

          {/* Header */}
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
            <SchoolLogoIcon className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-sm text-slate-500 mt-1 mb-8">Sign in to your demo portal</p>

          {/* Featured Roles Section */}
          <div className="w-full mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Featured Portals</h3>
            <div className="grid grid-cols-2 gap-3 w-full">
              {['admin', 'teacher', 'student', 'parent'].map((key) => {
                const account = DEMO_ACCOUNTS[key];
                if (!account) return null;
                return (
                  <button
                    key={key}
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(key)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl text-sm font-bold border-2 border-transparent transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${account.color} ${account.textColor} group relative overflow-hidden shadow-sm hover:shadow-md`}
                  >
                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:scale-110 transition-transform">
                      <SchoolLogoIcon className="w-8 h-8" />
                    </div>
                    <span className="capitalize text-lg mb-1">{key}</span>
                    <span className="text-[10px] font-medium opacity-70 line-clamp-1">{account.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other Roles Section */}
          <div className="w-full">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Specialized Portals</h3>
            <div className="grid grid-cols-2 gap-2 w-full">
              {DEMO_ROLES_ORDER.filter(k => !['admin', 'teacher', 'student', 'parent'].includes(k)).map((key) => {
                const account = DEMO_ACCOUNTS[key];
                return (
                  <button
                    key={key}
                    disabled={isLoading}
                    onClick={() => handleQuickLogin(key)}
                    className={`flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 border border-slate-100 bg-slate-50 text-slate-600 hover:bg-white hover:border-blue-200 hover:text-blue-600`}
                  >
                    <span className="capitalize">{key === 'examofficer' ? 'Exam Officer' : key === 'complianceofficer' ? 'Compliance' : key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Link */}
          <button
            type="button"
            onClick={() => setView('login')}
            className="mt-8 text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors"
          >
            Back to School Sign In
          </button>

        </div>


      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-100 p-4 sm:p-6">
      {/* Centered Card */}
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative">

        {/* Top Header Section */}
        <div className="pt-8 pb-6 px-6 sm:px-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
            <SchoolLogoIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">School Portal Sign In</h2>
        </div>

        {/* Form Section */}
        <div className="px-6 sm:px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" noValidate>
            <div>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email or Username"
                className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                required
                autoComplete="off"
                name="email_prevent_autofill"
              />
            </div>
            {/* Real Google Account Picker handled via GSI prompt */}

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none pr-12"
                required
                autoComplete="new-password"
                name="password_prevent_autofill"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70 text-sm sm:text-base"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            {/* Google OAuth enabled for custom backend bridging */}
            <button
              type="button"
              disabled={isLoading}
              onClick={async () => {
                try {
                  setError('');
                  handleGoogleClick();
                } catch (err: any) {
                  setError(err.message || 'Google Sign In failed');
                }
              }}
              className="w-full py-2.5 sm:py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base disabled:opacity-50"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>

            <div className="text-center">
              <a href="#" className="text-[10px] sm:text-xs text-slate-400 hover:text-slate-600 font-medium">Forgot Password?</a>
            </div>
          </form>

          {/* Separator */}
          <hr className="my-5 sm:my-6 border-slate-100" />

          {/* Bottom Actions */}
          <div className="space-y-2 sm:space-y-3">
            <button
              type="button"
              onClick={() => setView('demo')}
              className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 text-blue-700 font-bold text-xs sm:text-sm hover:bg-blue-50 rounded-lg transition-colors group"
            >
              <span className="group-hover:translate-x-1 transition-transform">{'>'}</span> Try Demo School
            </button>

            <button
              type="button"
              onClick={onNavigateToCreateSchool}
              className="w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 text-amber-600 font-bold text-xs sm:text-sm hover:bg-amber-50 rounded-lg transition-colors group"
            >
              <span className="group-hover:translate-x-1 transition-transform">{'>'}</span> Create School Account
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-4 right-4 left-4 sm:left-auto max-w-none sm:max-w-[200px] bg-red-50 text-red-600 text-[10px] sm:text-xs p-3 rounded-lg border border-red-100 shadow-sm animate-fade-in">
            {error}
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="mt-6 sm:mt-8 text-center max-w-md px-4">
        <h3 className="text-slate-800 font-bold text-[10px] sm:text-xs tracking-wider">PROFESSIONAL SCHOOL PORTAL</h3>
        <p className="text-slate-400 text-[10px] sm:text-xs mt-1">Efficient & Modern Learning Management</p>
      </div>
    </div>
  );
};

function mapRoleToDashboard(role: string): DashboardType {
  const map: any = {
    'admin': DashboardType.Admin,
    'school_admin': DashboardType.Admin,
    'teacher': DashboardType.Teacher,
    'student': DashboardType.Student,
    'parent': DashboardType.Parent,
    'superadmin': DashboardType.SuperAdmin,
    'proprietor': DashboardType.Proprietor,
    'inspector': DashboardType.Inspector,
    'examofficer': DashboardType.ExamOfficer,
    'complianceofficer': DashboardType.ComplianceOfficer,
    'compliance_officer': DashboardType.ComplianceOfficer,
    'compliance': DashboardType.ComplianceOfficer,
  };
  return map[role.toLowerCase().replace(' ', '')] || DashboardType.Student;
}

export default Login;
