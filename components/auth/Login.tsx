import React, { useState, useEffect } from 'react';
import { SchoolLogoIcon, UserIcon, LockIcon, EyeIcon, EyeOffIcon } from '../../constants';
import { DashboardType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';

interface LoginProps {
  onLogin?: (dashboard: DashboardType, user?: any) => void;
}

const Login: React.FC<LoginProps> = () => {
  const { signIn } = useAuth();
  const { setProfile } = useProfile();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Quick Login Roles and Colors matching the screenshot
  const quickLogins = [
    { role: 'admin', label: 'Admin', color: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' },
    { role: 'teacher', label: 'Teacher', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { role: 'parent', label: 'Parent', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { role: 'student', label: 'Student', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
    { role: 'proprietor', label: 'Proprietor', color: 'bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-200' },
    { role: 'inspector', label: 'Inspector', color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
    { role: 'examofficer', label: 'Exam Officer', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200' },
    { role: 'complianceofficer', label: 'Compliance', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  ];

  const getDashboardTypeFromRole = (role: string): DashboardType => {
    const normalizedRole = role?.toLowerCase() || 'student';
    switch (normalizedRole) {
      case 'admin': return DashboardType.Admin;
      case 'teacher': return DashboardType.Teacher;
      case 'parent': return DashboardType.Parent;
      case 'student': return DashboardType.Student;
      case 'proprietor': return DashboardType.Proprietor;
      case 'inspector': return DashboardType.Inspector;
      case 'examofficer': return DashboardType.ExamOfficer;
      case 'complianceofficer': return DashboardType.ComplianceOfficer;
      default: return DashboardType.Student;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    try {
      // Simulate network delay for effect
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock Login Logic
      // In a real app, this would be supabase.auth.signInWithPassword

      // Determine role from email (mock logic)
      let role = 'student';
      if (email.includes('admin')) role = 'admin';
      else if (email.includes('teacher')) role = 'teacher';
      else if (email.includes('parent')) role = 'parent';
      else if (email.includes('proprietor')) role = 'proprietor';
      else if (email.includes('inspector')) role = 'inspector';
      else if (email.includes('exam')) role = 'examofficer';
      else if (email.includes('compliance')) role = 'complianceofficer';

      const mockUserId = 'mock-user-' + Math.random().toString(36).substr(2, 9);
      const dashboardType = getDashboardTypeFromRole(role);

      const mockProfile = {
        id: mockUserId,
        name: email.split('@')[0],
        email: email,
        role: role.charAt(0).toUpperCase() + role.slice(1) as any,
        school_id: 'mock-school-id',
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
      console.error(err);
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
      school_id: 'mock-school-id',
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
          <SchoolLogoIcon className="text-sky-500 h-16 w-16 mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your portal</p>
        </div>

        {/* Login Form */}
        <form className="space-y-5" onSubmit={handleLogin}>

          {/* Email Input */}
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <UserIcon className="text-gray-400 h-5 w-5 group-focus-within:text-sky-500 transition-colors" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
              placeholder="Email (e.g., admin@school.com)"
            />
          </div>

          {/* Password Input */}
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <LockIcon className="text-gray-400 h-5 w-5 group-focus-within:text-sky-500 transition-colors" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm"
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:bg-sky-500 peer-checked:border-sky-500 transition-all"></div>
                <svg className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="text-gray-600 group-hover:text-gray-800 transition-colors">Remember me</span>
            </label>
            <button type="button" className="text-sky-600 font-semibold hover:text-sky-700 transition-colors">
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium text-center animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold shadow-lg shadow-sky-500/30 ${isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 transform hover:scale-[1.01] active:scale-[0.99]'
              } transition-all duration-200`}
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {/* Quick Logins */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-4">Quick Logins:</p>
          <div className="grid grid-cols-2 gap-3">
            {quickLogins.map((item) => (
              <button
                key={item.role}
                onClick={() => handleQuickLogin(item.role)}
                className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md ${item.color}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Database Status */}
        <div className="mt-8 flex items-center justify-center space-x-2">
          <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
          <span className={`text-xs font-medium ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
            {isConnected ? 'Connected to Database' : 'Database Offline'}
          </span>
        </div>

      </div>
    </div>
  );
};

export default Login;
