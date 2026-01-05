import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

const getDashboardTypeFromRole = (role: string): DashboardType => {
  switch (role.toLowerCase()) {
    case 'admin': return DashboardType.Admin;
    case 'teacher': return DashboardType.Teacher;
    case 'parent': return DashboardType.Parent;
    case 'student': return DashboardType.Student;
    case 'proprietor': return DashboardType.Proprietor;
    case 'inspector': return DashboardType.Inspector;
    case 'examofficer': return DashboardType.ExamOfficer;
    case 'complianceofficer': return DashboardType.ComplianceOfficer;
    case 'counselor': return DashboardType.Counselor;
    default: return DashboardType.Student;
  }
};

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const { setProfile } = useProfile();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // TEMPORARY: Using mock authentication until demo accounts are created in Supabase Auth
      let role = 'student';
      if (email.includes('admin')) role = 'admin';
      else if (email.includes('teacher')) role = 'teacher';
      else if (email.includes('parent')) role = 'parent';

      const mockUserId = 'mock-user-' + Math.random().toString(36).substr(2, 9);
      const dashboardType = getDashboardTypeFromRole(role);

      const mockProfile = {
        id: mockUserId,
        name: email.split('@')[0],
        email: email,
        role: role.charAt(0).toUpperCase() + role.slice(1) as any,
        school_id: '00000000-0000-0000-0000-000000000001',
        school_name: 'Demo International School',
        phone: '123-456-7890',
        avatarUrl: `https://i.pravatar.cc/150?u=${mockUserId}`
      };

      setProfile(mockProfile);
      await signIn(dashboardType, {
        userId: mockUserId,
        email: email,
        userType: role,
      });

    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (role: string) => {
    const demoEmail = `${role}@school.com`;
    setEmail(demoEmail);
    setPassword('demo123');

    // Simulate instant login  
    const mockUserId = 'quick-' + role + '-' + Date.now();
    const dashboardType = getDashboardTypeFromRole(role);
    const mockProfile = {
      id: mockUserId,
      name: role.toUpperCase(),
      email: demoEmail,
      role: role.charAt(0).toUpperCase() + role.slice(1) as any,
      school_id: '00000000-0000-0000-0000-000000000001',
      school_name: 'Demo International School',
      phone: '123-456-7890',
      avatarUrl: `https://i.pravatar.cc/150?u=${mockUserId}`
    };

    setProfile(mockProfile);
    signIn(dashboardType, {
      userId: mockUserId,
      email: demoEmail,
      userType: role.charAt(0).toUpperCase() + role.slice(1),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-sky-50 via-green-50 to-amber-50 p-4">
      <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl transition-all border border-white/50">

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 animate-bounce-slow shadow-lg">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
          <p className="text-sm text-gray-600 mt-1">Sign in to your portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-white/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder-gray-400"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4"
              >
                <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Remember/Forgot */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <span className="ml-2 text-gray-600 group-hover:text-gray-900">Remember me</span>
            </label>
            <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">Forgot password?</a>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {/* Separator */}
        <div className="my-8">
          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500 font-semibold tracking-wide">QUICK LOGINS:</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>
        </div>

        {/* Quick Login Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleQuickLogin('admin')} className="px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-200 transition-all shadow-sm">Admin</button>
          <button onClick={() => handleQuickLogin('teacher')} className="px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl font-bold hover:bg-purple-200 transition-all shadow-sm">Teacher</button>
          <button onClick={() => handleQuickLogin('parent')} className="px-4 py-2.5 bg-green-100 text-green-700 rounded-xl font-bold hover:bg-green-200 transition-all shadow-sm">Parent</button>
          <button onClick={() => handleQuickLogin('student')} className="px-4 py-2.5 bg-amber-100 text-amber-700 rounded-xl font-bold hover:bg-amber-200 transition-all shadow-sm">Student</button>
          <button onClick={() => handleQuickLogin('proprietor')} className="px-4 py-2.5 bg-pink-100 text-pink-700 rounded-xl font-bold hover:bg-pink-200 transition-all shadow-sm">Proprietor</button>
          <button onClick={() => handleQuickLogin('inspector')} className="px-4 py-2.5 bg-cyan-100 text-cyan-700 rounded-xl font-bold hover:bg-cyan-200 transition-all shadow-sm">Inspector</button>
          <button onClick={() => handleQuickLogin('examofficer')} className="px-4 py-2.5 bg-orange-100 text-orange-700 rounded-xl font-bold hover:bg-orange-200 transition-all shadow-sm">Exam Officer</button>
          <button onClick={() => handleQuickLogin('complianceofficer')} className="px-4 py-2.5 bg-teal-100 text-teal-700 rounded-xl font-bold hover:bg-teal-200 transition-all shadow-sm">Compliance</button>
          <button onClick={() => handleQuickLogin('counselor')} className="px-4 py-2.5 bg-rose-100 text-rose-700 rounded-xl font-bold hover:bg-rose-200 transition-all shadow-sm col-span-2">Counselor</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
