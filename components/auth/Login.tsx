import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardType } from '../../types';
import { useAuth } from '../../context/AuthContext';
// import { useNavigate } from 'react-router-dom';
import { generateCustomId } from '../../lib/id-generator';
import { SchoolLogoIcon, THEME_CONFIG } from '../../constants';
// Simple Eye Icons
const EyeIcon = ({ size = 20 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const EyeOffIcon = ({ size = 20 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
import SchoolSignup from './SchoolSignup';
import { authenticateUser } from '../../lib/auth';

import { MOCK_USERS, mockLogin, DEMO_ACCOUNTS, DEMO_ROLES_ORDER, DEMO_SCHOOL_ID, DEMO_BRANCH_ID } from '../../lib/mockAuth';

const Login: React.FC<{ onNavigateToSignup: () => void; onNavigateToCreateSchool?: () => void }> = ({ onNavigateToSignup, onNavigateToCreateSchool }) => {
  const [view, setView] = useState<'login' | 'school_signup' | 'demo'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Resolve Username to Email (if needed)
      let resolvedEmail = email;

      // Simple check: if no '@', assume it's a username
      if (!email.includes('@')) {
        console.log(`Checking for username: ${email}`);

        try {
          const { data: userData } = await supabase
            .from('auth_accounts')
            .select('email')
            .eq('username', email.toLowerCase())
            .maybeSingle();

          if (userData?.email) {
            resolvedEmail = userData.email;
            console.log(`Resolved username ${email} to ${resolvedEmail}`);
          } else {
            console.warn('Username lookup failed, attempting direct auth anyway...');
          }
        } catch (err) {
          console.error('Error resolving username:', err);
        }
      }

      // 1. Attempt Unified Auth (Backend + Supabase Fallback inside authenticateUser)
      const result = await authenticateUser(resolvedEmail, password);

      if (!result.success) {
        // If real auth fails, we might check for mock credentials if configured
        console.warn("Auth Failed:", result.error);

        // 2. FALLBACK: Mock Patterns (Only if backend auth explicitly failed)
        // Check mock credentials locally
        const mockResult = await checkMockCredentials(email, password);
        if (mockResult.success) {
          await signIn(mockResult.dashboardType, {
            userId: mockResult.userId,
            email: email,
            userType: mockResult.role,
            isDemo: true,
            schoolGeneratedId: (mockResult as any).schoolGeneratedId,
            school: {
              id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
              branch_id: '7601cbea-e1ba-49d6-b59b-412a584cb94f',
              name: 'Oliskey Demo School',
              slug: 'demo',
              subscriptionStatus: 'active',
              createdAt: new Date().toISOString()
            },
            token: mockResult.token || localStorage.getItem('auth_token'),
            refreshToken: mockResult.refreshToken || localStorage.getItem('auth_refresh_token')
          });

          return;
        }

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

    // Use credentials from DEMO_ACCOUNTS
    let mockAccount = DEMO_ACCOUNTS[roleKey];

    if (!mockAccount) {
      setError(`Demo account not configured for ${roleKey}`);
      setIsLoading(false);
      return;
    }

    // Map account to the structure needed for login
    const userKey = roleKey.toLowerCase();
    const mockUserData = MOCK_USERS[userKey] || MOCK_USERS['student']; // Default to student if totally lost, but keep roleKey

    let mockUser = {
      id: mockUserData.id,
      email: mockAccount.email,
      password: mockAccount.password,
      role: mockAccount.role,
      metadata: mockUserData.metadata
    };

    // Role-specific email overrides if needed for Real Auth
    if (roleKey === 'teacher') {
      mockUser.email = 'john.smith@demo.com';
    } else if (roleKey === 'parent') {
      mockUser.email = 'parent1@demo.com';
    } else if (roleKey === 'admin') {
      mockUser.email = 'user@school.com';
    } else if (roleKey === 'proprietor') {
      mockUser.email = 'proprietor@demo.com';
    } else if (roleKey === 'inspector') {
      mockUser.email = 'inspector@demo.com';
    } else if (roleKey === 'examofficer') {
      mockUser.email = 'examofficer@demo.com';
    } else if (roleKey === 'complianceofficer') {
      mockUser.email = 'compliance@demo.com';
    }

    try {
      console.log(`🚀 [Demo] Attempting resilient Quick Login for ${roleKey} (${mockUser.email})...`);

      // Use the unified authentication logic which prioritizes backend tokens
      const result = await authenticateUser(mockUser.email, mockUser.password);

      if (result.success) {
        console.log(`✅ [Demo] Auth successful for ${roleKey}. Token present: ${!!result.token}`);
        const dashboardType = mapRoleToDashboard(mockUser.role);

        await signIn(dashboardType, {
          userId: result.userId,
          email: result.email,
          userType: dashboardType,
          isDemo: true,
          schoolGeneratedId: result.schoolGeneratedId,
          school: {
            id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
            branch_id: '7601cbea-e1ba-49d6-b59b-412a584cb94f',
            name: 'Oliskey Demo School',
            slug: 'demo',
            subscriptionStatus: 'active',
            createdAt: new Date().toISOString()
          },
          token: result.token,
          refreshToken: result.refreshToken
        });
        return;
      } else {
        throw new Error(result.error || 'Authentication failed');
      }
    } catch (err: any) {
      console.error("❌ [Demo] Quick Login Error:", err);
      // Fallback to local mock if everything else fails for true "offline" demo
      const dashboardType = mapRoleToDashboard(mockUser.role);
      await signIn(dashboardType, {
        userId: mockUser.id,
        email: mockUser.email,
        userType: dashboardType,
        isDemo: true,
        schoolGeneratedId: mockUser.metadata?.school_generated_id,
        school: {
          id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
          branch_id: '7601cbea-e1ba-49d6-b59b-412a584cb94f',
          name: 'Oliskey Demo School',
          slug: 'demo',
          subscriptionStatus: 'active',
          createdAt: new Date().toISOString()
        },
        token: 'mock-token' // Critical: Ensures api.ts knows we are in a demo session even if offline
      });
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

          {/* Role Grid */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {DEMO_ROLES_ORDER.map((key) => {
              const account = DEMO_ACCOUNTS[key];
              const isActive = false; // Not needed on login page

              // Get color from theme config for consistency
              const roleTheme = THEME_CONFIG[key as DashboardType] || { cardIconBg: 'bg-slate-50', iconColor: 'text-slate-600' };

              return (
                <button
                  key={key}
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(key)}
                  className={`flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${account.color} ${account.textColor}`}
                >
                  <span className="capitalize">{key === 'examofficer' ? 'Exam Officer' : key === 'complianceofficer' ? 'Compliance' : key}</span>
                </button>
              );
            })}
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
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">School Admin Sign In</h2>
        </div>

        {/* Form Section */}
        <div className="px-6 sm:px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" noValidate>
            <div>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Gmail or Username"
                className="w-full px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                required
                autoComplete="off"
                name="email_prevent_autofill"
              />
            </div>
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

            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { queryParams: { access_type: 'offline', prompt: 'consent' } }
                });
                if (error) setError(error.message);
              }}
              className="w-full py-2.5 sm:py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-all active:scale-95 text-sm sm:text-base"
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

async function getMockSessionForRole(roleName: string): Promise<{ success: boolean, role: string, dashboardType: DashboardType, userId: string, email: string }> {


  const role = roleName.toLowerCase().replace(' ', '');
  const dashboardType = mapRoleToDashboard(role);

  // PROFESSIONAL ID: SCH-branch-role-number
  const mockId = generateCustomId({
    schoolShortName: 'OLISKEY',
    branch: 'Lagos',
    role: role,
    sequenceNumber: Math.floor(Math.random() * 1000)
  });

  return {
    success: true,
    role: role,
    dashboardType: dashboardType,
    userId: mockId,
    email: `${role}@demo.com` // Matching the StudentDashboard.tsx demo check
  };
}

async function checkMockCredentials(email: string, pass: string): Promise<{ success: boolean, role: string, dashboardType: DashboardType, userId: string, schoolGeneratedId?: string, token?: string, refreshToken?: string }> {
  // 1. Simulating a DB lookup for mock users


  // Use the synced MOCK_USERS list for consistency
  const user = Object.values(MOCK_USERS).find(u =>
    u.email.toLowerCase() === email.toLowerCase() ||
    (u.username && u.username.toLowerCase() === email.toLowerCase())
  );

  if (user && user.password === pass) {
    console.log("Mock Credential Bypass Success for:", email);
    return {
      success: true,
      role: user.role,
      dashboardType: mapRoleToDashboard(user.role),
      userId: user.id,
      schoolGeneratedId: user.metadata?.school_generated_id,
      token: localStorage.getItem('auth_token') || undefined,
      refreshToken: localStorage.getItem('auth_refresh_token') || undefined
    };
  }

  return { success: false, role: '', dashboardType: DashboardType.Student, userId: '' };
}

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
