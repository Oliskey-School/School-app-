import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * AuthCallback Component
 * Specifically designed to handle Supabase Auth verification redirects.
 * Extracts tokens from the URL (handling double-hash edge cases) and 
 * redirects the user to their appropriate dashboard based on metadata.
 */
const AuthCallback: React.FC = () => {
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Verifying your credentials...');
    const [errorDetails, setErrorDetails] = useState<string | null>(null);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                console.log('🔄 AuthCallback triggered. Parsing URL...');

                // 1. Extract tokens and params
                // We use a robust regex/manual split to handle potential double-hashes like /#/auth/callback#access_token=...
                const fullUrl = window.location.href;
                let params = new URLSearchParams();

                if (fullUrl.includes('access_token')) {
                    // Handle fragment identifying tokens specifically
                    const fragment = fullUrl.substring(fullUrl.indexOf('access_token'));
                    params = new URLSearchParams(fragment);
                } else if (window.location.search) {
                    // Fallback to standard query params (PKCE/OTP)
                    params = new URLSearchParams(window.location.search);
                }

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const errorCode = params.get('error');
                const errorDescription = params.get('error_description');

                // Check for oauth/signup errors passed in URL
                if (errorCode || errorDescription) {
                    throw new Error(errorDescription?.replace(/\+/g, ' ') || 'Authentication failed');
                }

                // 2. Set the session if tokens are found
                if (accessToken && refreshToken) {
                    console.log('🔑 Tokens found, setting session...');
                    const { data, error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) throw sessionError;

                    if (data.session) {
                        const role = data.session.user.user_metadata?.role || 'admin';
                        console.log(`✅ Session verified. User Role: ${role}`);

                        setStatus('success');
                        setMessage('Verification successful! Welcome.');
                        localStorage.setItem('show_welcome_toast', 'true');

                        // 3. Perform role-based redirection
                        setTimeout(() => {
                            // Priority redirect for admins as requested
                            if (role === 'admin' || role === 'proprietor') {
                                window.location.href = '/admin/dashboard';
                            } else {
                                window.location.href = '/'; // Default dash router handles others
                            }
                        }, 1500);
                        return;
                    }
                }

                // 4. Fallback: Check if session already exists (Supabase might have handled it via detectSessionInUrl)
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setStatus('success');
                    setMessage('Already signed in. Redirecting...');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                    return;
                }

                throw new Error('No valid session or tokens found in verification link.');

            } catch (err: any) {
                console.error('❌ AuthCallback Error:', err);
                setStatus('error');
                setMessage('Verification Failed');
                setErrorDetails(err.message || 'The link may be expired or invalid.');
            }
        };

        handleAuthCallback();
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
                {status === 'processing' && (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="h-20 w-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 text-indigo-600 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
                        <p className="text-gray-500">This will only take a moment.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="flex justify-center">
                            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
                        <div className="flex justify-center items-center text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Preparing your workspace...
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-center">
                            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="h-10 w-10 text-red-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
                        <p className="text-red-500 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                            {errorDetails}
                        </p>
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="mt-6 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-indigo-200"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
