
import React, { useState, useEffect } from 'react';
import { SchoolLogoIcon, UserIcon, LockIcon, EyeIcon, EyeOffIcon } from '../../constants';
import { DashboardType } from '../../types';
import { checkSupabaseConnection } from '../../lib/database';

interface LoginProps {
  onLogin: (dashboard: DashboardType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkSupabaseConnection().then(connected => {
      setIsSupabaseConnected(connected);
    });
  }, []);

  const handleLoginClick = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = username.trim().toLowerCase();
    const pass = password.trim().toLowerCase();

    if (user === 'admin' && pass === 'admin') {
      onLogin(DashboardType.Admin);
    } else if (user === 'teacher' && pass === 'teacher') {
      onLogin(DashboardType.Teacher);
    } else if (user === 'parent' && pass === 'parent') {
      onLogin(DashboardType.Parent);
    } else if (user === 'student' && pass === 'student') {
      onLogin(DashboardType.Student);
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleDemoLogin = (user: 'admin' | 'teacher' | 'parent' | 'student') => {
    setUsername(user);
    setPassword(user);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-br from-sky-50 via-green-50 to-amber-50 p-4">
      <div className="w-full max-w-sm mx-auto bg-white/60 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <SchoolLogoIcon className="text-sky-500 h-20 w-20" />
          <h1 className="text-3xl font-bold text-gray-800 mt-4">Welcome back</h1>
          <p className="text-gray-500">Sign in to your portal</p>
        </div>

        <form className="space-y-5" onSubmit={handleLoginClick}>
          <div>
            <label htmlFor="username" className="text-sm font-medium text-gray-700 sr-only">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <UserIcon className="text-gray-400" />
              </span>
              <input
                type="text"
                name="username"
                id="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-3 text-gray-700 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                placeholder="Username (e.g., teacher)"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 sr-only">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <LockIcon className="text-gray-400" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 text-gray-700 bg-white/80 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                placeholder="Password (e.g., teacher)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-center">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded" />
              <label htmlFor="remember-me" className="ml-2 block text-gray-900">
                Remember me
              </label>
            </div>
            <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-sky-600 hover:text-sky-500">
              Forgot password?
            </a>
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all transform hover:scale-105"
            >
              Login
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-600 mb-2">Quick Logins:</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleDemoLogin('admin')} className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-semibold">Admin</button>
            <button type="button" onClick={() => handleDemoLogin('teacher')} className="p-2 bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors font-semibold">Teacher</button>
            <button type="button" onClick={() => handleDemoLogin('parent')} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-semibold">Parent</button>
            <button type="button" onClick={() => handleDemoLogin('student')} className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-semibold">Student</button>
          </div>
        </div>

        {/* Database Connection Status */}
        <div className="mt-4 text-center">
          {isSupabaseConnected === null ? (
            <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
              Checking database...
            </div>
          ) : isSupabaseConnected ? (
            <div className="text-xs text-green-600 flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Connected to Supabase
            </div>
          ) : (
            <div className="text-xs text-amber-600 flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              Using mock data
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
