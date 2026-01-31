import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

/**
 * Auth Confirmation Route
 * Handles email verification tokens from Supabase confirmation emails
 * Automatically exchanges token for session and redirects to dashboard
 */

export const AuthConfirm: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [email, setEmail] = useState('');

    useEffect(() => {
        const confirmEmail = async () => {
            try {
                // Helper to extract params from various sources
                const getParams = () => {
                    // 1. Try standard query params (PKCE flow often uses this)
                    const searchParams = new URLSearchParams(window.location.search);
                    if (searchParams.has('code') || searchParams.has('access_token') || searchParams.has('error')) {
                        return searchParams;
                    }

                    // 2. Try Hash params (Implicit flow)
                    const hash = window.location.hash.substring(1); // Remove #

                    // Handle HashRouter case: "/auth/callback?token=..."
                    const queryIndex = hash.indexOf('?');
                    if (queryIndex !== -1) {
                        return new URLSearchParams(hash.substring(queryIndex + 1));
                    }

                    // Handle standard hash: "access_token=..."
                    return new URLSearchParams(hash);
                };

                const params = getParams();
                const accessToken = params.get('access_token') || params.get('token'); // Some flows use 'token'
                const refreshToken = params.get('refresh_token');
                const type = params.get('type');
                const code = params.get('code'); // PKCE code
                const errorDescription = params.get('error_description');

                if (errorDescription) {
                    throw new Error(errorDescription.replace(/\+/g, ' '));
                }

                // Handle PKCE code exchange if present
                if (code) {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                    if (data.session) {
                        setStatus('success');
                        // ... proceed
                        localStorage.setItem('show_welcome_toast', 'true');
                        setTimeout(() => {
                            window.location.hash = '';
                            window.location.reload();
                        }, 1500);
                        return;
                    }
                }

                const token = accessToken;

                if (!token) {
                    setStatus('error');
                    setErrorMessage('No verification token found. Please check your email link.');
                    return;
                }

                // If we have access_token and refresh_token from hash, set session directly
                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (sessionError) throw sessionError;

                    // Success
                    setStatus('success');
                    localStorage.setItem('show_welcome_toast', 'true');

                    // Clear hash and reload to dashboard
                    setTimeout(() => {
                        window.location.hash = '';
                        window.location.reload();
                    }, 1500);
                    return;
                }

                // Otherwise, verify using OTP method (fallback)
                const { data, error } = await supabase.auth.verifyOtp({
                    token_hash: token,
                    type: (type as any) || 'signup'
                });

                if (error) {
                    throw error;
                }

                if (data.user) {
                    setStatus('success');
                    localStorage.setItem('show_welcome_toast', 'true');

                    // Get user role from metadata to redirect to appropriate dashboard
                    const userRole = data.user.user_metadata?.role || data.user.app_metadata?.role || 'admin';
                    console.log('User verified with role:', userRole);

                    // Clear hash and reload to dashboard
                    setTimeout(() => {
                        window.location.hash = '';
                        window.location.reload();
                    }, 1500);
                } else {
                    throw new Error('Email verification succeeded but no user returned');
                }
            } catch (error: any) {
                console.error('Email verification error:', error);
                setStatus('error');

                if (error.name === 'AbortError' || error.message?.includes('aborted')) {
                    console.warn('Request aborted, likely due to navigation or double-mount. Ignoring.');
                    return;
                }

                // User-friendly error messages
                if (error.message?.includes('expired')) {
                    setErrorMessage('This verification link has expired. Please request a new one.');
                } else if (error.message?.includes('invalid')) {
                    setErrorMessage('This verification link is invalid. Please check your email.');
                } else {
                    setErrorMessage(error.message || 'Failed to verify email. Please try again.');
                }
            }
        };

        confirmEmail();
    }, []);

    const handleResendEmail = async () => {
        try {
            if (!email) {
                setErrorMessage('Email address is required to resend verification. Please log in and try again.');
                return;
            }

            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email
            });

            if (error) throw error;

            setStatus('success');
            setErrorMessage('Verification email sent! Please check your inbox.');
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to resend email. Please try again later.');
        }
    };

    const handleBackToLogin = () => {
        window.location.hash = '';
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Status Icon */}
                    <div className="flex justify-center mb-6">
                        {status === 'loading' && (
                            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                        )}
                    </div>

                    {/* Status Message */}
                    <div className="text-center">
                        {status === 'loading' && (
                            <>
                                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                    Verifying Your Email
                                </h1>
                                <p className="text-gray-600">
                                    Please wait while we confirm your email address...
                                </p>
                            </>
                        )}

                        {status === 'success' && (
                            <>
                                <h1 className="text-2xl font-bold text-green-900 mb-2">
                                    Email Verified! 🎉
                                </h1>
                                <p className="text-gray-600 mb-4">
                                    Your email has been successfully verified.
                                </p>
                                <div className="flex items-center justify-center text-sm text-gray-500">
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Redirecting to dashboard...
                                </div>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <h1 className="text-2xl font-bold text-red-900 mb-2">
                                    Verification Failed
                                </h1>
                                <p className="text-gray-600 mb-6">
                                    {errorMessage}
                                </p>

                                <div className="space-y-3">
                                    {email && (
                                        <button
                                            onClick={handleResendEmail}
                                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center"
                                        >
                                            <Mail className="w-4 h-4 mr-2" />
                                            Resend Verification Email
                                        </button>
                                    )}
                                    <button
                                        onClick={handleBackToLogin}
                                        className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Back to Login
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Help Text */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Having trouble? Contact support at{' '}
                    <a href="mailto:support@schoolapp.com" className="text-indigo-600 hover:underline">
                        support@schoolapp.com
                    </a>
                </p>
            </div>
        </div>
    );
};

export default AuthConfirm;
