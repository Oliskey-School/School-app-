import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardType } from '../../types';
import { useAuth } from '../../context/AuthContext';
// import { useNavigate } from 'react-router-dom';
import { generateCustomId } from '../../lib/id-generator';
import { SchoolLogoIcon } from '../../constants';
// Simple Eye Icons
const EyeIcon = ({ size = 20 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const EyeOffIcon = ({ size = 20 }: { size?: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
import SchoolSignup from './SchoolSignup';
import { authenticateUser } from '../../lib/auth';

import { MOCK_USERS, mockLogin } from '../../lib/mockAuth';

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
            isDemo: true, // Mark as demo
            school: {
              id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1', // Key to Oliskey logic
              name: 'Oliskey Demo School',
              slug: 'demo',
              subscriptionStatus: 'active',
              createdAt: new Date().toISOString()
            }
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

    // Use credentials from MOCK_USERS
    // @ts-ignore
    const mockUser = MOCK_USERS[roleKey];

    if (!mockUser) {
      setError(`Demo account not configured for ${roleKey}`);
      setIsLoading(false);
      return;
    }

    try {
      console.log(`Attempting Quick Login for ${roleKey} (${mockUser.email})...`);

      // 1. Attempt REAL Supabase Auth (for valid session)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: mockUser.email,
        password: mockUser.password,
      });

      // 2. Fallback to MOCK AUTH if Real Auth fails
      if (authError) {
        console.warn("Real Auth failed:", authError.message);

        // Disable Mock Fallback for connected demo users to avoid confusion
        // The backend requires a real token.
        setError(`Login failed: ${authError.message}. Ensure the demo account exists.`);
        return;

        /* 
        // Disabled Mock Fallback
        const dashboardType = mapRoleToDashboard(mockUser.role);
        await signIn(dashboardType, { ... });
        */
      }

      if (data.session) {
        const dashboardType = mapRoleToDashboard(mockUser.role);

        // Fetch schoolGeneratedId from the relevant table based on role
        let schoolGeneratedId = undefined;
        try {
          const userId = data.user.id;
          let tableName = '';

          // Determine which table to query based on role
          if (dashboardType === 'student') {
            tableName = 'students';
          } else if (dashboardType === 'teacher') {
            tableName = 'teachers';
          } else if (dashboardType === 'parent') {
            tableName = 'parents';
          } else if (dashboardType === 'admin') {
            tableName = 'users'; // Admins are in the users table
          }

          // Fetch the school_generated_id if we have a valid table
          if (tableName) {
            const { data: userData, error: fetchError } = await supabase
              .from(tableName)
              .select('school_generated_id')
              .eq('user_id', userId)
              .maybeSingle();

            if (!fetchError && userData) {
              schoolGeneratedId = userData.school_generated_id || (userData as any).custom_id || (userData as any).staff_id;
            }
          }
        } catch (fetchErr) {
          console.warn('Failed to fetch schoolGeneratedId:', fetchErr);
        }

        const DEMO_SCHOOL = {
          id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
          name: 'Oliskey Demo School',
          slug: 'demo',
          subscriptionStatus: 'active',
          createdAt: new Date().toISOString()
        };

        await signIn(dashboardType, {
          userId: data.user.id,
          email: data.user.email!,
          userType: dashboardType,
          isDemo: true,
          schoolGeneratedId: schoolGeneratedId,
          school: DEMO_SCHOOL
        });
      }
    } catch (err: any) {
      console.error("Quick Login Error:", err);
      if (err.message && err.message.includes('captcha')) {
        setError("Security check failed. Please type the credentials manually.");
      } else {
        setError(err.message || `Failed to login as ${mockUser.role}.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Demo View (Quick Logins)
  if (view === 'demo') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#F8FAFC] p-4 py-8">
        <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative p-6 xs:p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
              <SchoolLogoIcon className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Welcome Back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to your demo portal</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="absolute top-4 right-4 max-w-[200px] bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 shadow-sm animate-fade-in z-50">
              {error}
            </div>
          )}

          {/* Mock Login Form */}
          <div className="space-y-4 mb-8 opacity-40 pointer-events-none scale-[0.98]">
            <input type="text" placeholder="Email (e.g. admin@school.com)" className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm" disabled />
            <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-slate-50 border border-gray-100 rounded-xl text-sm" disabled />
            <button className="w-full py-3 bg-[#A3A3A3] text-white font-bold rounded-xl text-md">Login</button>
          </div>

          <div className="text-center mb-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Quick Logins</span>
          </div>

          {/* Interactive Quick Logins - Responsive Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-8">
            {Object.entries(MOCK_USERS).map(([key, user]) => {
              const displayRole = key === 'examofficer' ? 'Exam Officer' : key === 'compliance' ? 'Compliance' : key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <button
                  key={key}
                  onClick={() => handleQuickLogin(key)}
                  disabled={isLoading}
                  className={`flex items-center justify-center py-2.5 px-4 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm hover:shadow-md
                    ${key === 'admin' ? 'bg-[#EBF5FF] text-[#1E40AF] hover:bg-blue-100' : ''}
                    ${key === 'teacher' ? 'bg-[#F5F3FF] text-[#5B21B6] hover:bg-purple-100' : ''}
                    ${key === 'parent' ? 'bg-[#F0FDF4] text-[#166534] hover:bg-green-100' : ''}
                    ${key === 'student' ? 'bg-[#FFF7ED] text-[#9A3412] hover:bg-orange-100' : ''}
                    ${key === 'oliskey' ? 'bg-indigo-700 text-white hover:bg-indigo-800' : ''}
                    ${['proprietor', 'inspector', 'examofficer', 'compliance'].includes(key) ? 'bg-[#F1F5F9] text-[#475569] hover:bg-slate-200' : ''}
                `}
                >
                  {displayRole}
                </button>
              )
            })}
          </div>

          <div className="mt-4 text-center border-t border-slate-100 pt-6">
            <button onClick={() => setView('login')} className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition">
              Back to School Sign In
            </button>
          </div>
        </div>
        {isLoading && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-slate-100 p-4 py-8">
      {/* Centered Card */}
      <div className="w-full max-w-[400px] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative">

        {/* Top Header Section */}
        <div className="pt-8 pb-6 px-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
            <SchoolLogoIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">School Admin Sign In</h2>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-8">
          <form onSubmit={handleLogin} className="space-y-4" autoComplete="off" noValidate>
            <div>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Gmail"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
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
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none pr-12"
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
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-70"
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
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>

            <div className="text-center">
              <a href="#" className="text-xs text-slate-400 hover:text-slate-600">Forgot Password?</a>
            </div>
          </form>

          {/* Separator */}
          <hr className="my-6 border-slate-100" />

          {/* Bottom Actions */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setView('demo')}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-blue-700 font-bold text-sm hover:bg-blue-50 rounded-lg transition-colors group"
            >
              <span className="group-hover:translate-x-1 transition-transform">{'>'}</span> Try Demo School <span className="text-slate-400 font-normal text-xs">(No Payment)</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToCreateSchool}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-amber-600 font-bold text-sm hover:bg-amber-50 rounded-lg transition-colors group"
            >
              <span className="group-hover:translate-x-1 transition-transform">{'>'}</span> Create School Account <span className="text-slate-400 font-normal text-xs">Sign Up</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="absolute top-4 right-4 max-w-[200px] bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 shadow-sm animate-fade-in">
            {error}
          </div>
        )}

      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center max-w-md px-4">
        <h3 className="text-slate-800 font-bold text-sm">PROFESSIONAL SIGN IN + PAYMENT ACCESS</h3>
        <p className="text-slate-400 text-xs mt-1">(Simple & Sellable)</p>

        <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active Subscription</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Inactive / Expired</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Paystack / Flutterwave</span>
        </div>
      </div>
    </div>
  );
};

async function getMockSessionForRole(roleName: string): Promise<{ success: boolean, role: string, dashboardType: DashboardType, userId: string, email: string }> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 600));

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

async function checkMockCredentials(email: string, pass: string): Promise<{ success: boolean, role: string, dashboardType: DashboardType, userId: string }> {
  // 1. Simulating a DB lookup for mock users
  await new Promise(r => setTimeout(r, 500));

  // Use the synced MOCK_USERS list for consistency
  const user = Object.values(MOCK_USERS).find(u => u.email.toLowerCase() === email.toLowerCase());

  if (user && user.password === pass) {
    console.log("Mock Credential Bypass Success for:", email);
    return {
      success: true,
      role: user.role,
      dashboardType: mapRoleToDashboard(user.role),
      userId: user.id
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
