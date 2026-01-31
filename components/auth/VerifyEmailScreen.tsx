import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, RefreshCw, LogOut } from 'lucide-react';

/**
 * Verify Email Screen
 * Shown to users who haven't verified their email yet
 * Includes "Resend Email" functionality
 */

export const VerifyEmailScreen: React.FC = () => {
    const { user, signOut } = useAuth();
    const [isResending, setIsResending] = React.useState(false);
    const [resendSuccess, setResendSuccess] = React.useState(false);
    const [error, setError] = React.useState('');

    const handleResendEmail = async () => {
        if (!user?.email) return;

        try {
            setIsResending(true);
            setError('');

            const { supabase } = await import('../../lib/supabase');
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: user.email
            });

            if (resendError) throw resendError;

            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 5000);
        } catch (err: any) {
            setError(err.message || 'Failed to resend email. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-100">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                            <Mail className="w-10 h-10 text-amber-600" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            Verify Your Email Address
                        </h1>
                        <p className="text-gray-600 mb-4">
                            We sent a verification link to:
                        </p>
                        <p className="text-lg font-semibold text-indigo-600 mb-4">
                            {user?.email}
                        </p>
                        <p className="text-sm text-gray-500">
                            Click the link in the email to verify your account and access your dashboard.
                        </p>
                    </div>

                    {/* Success Message */}
                    {resendSuccess && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 text-center font-medium">
                                ✓ Verification email sent! Check your inbox.
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800 text-center">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleResendEmail}
                            disabled={isResending || resendSuccess}
                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isResending ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : resendSuccess ? (
                                <>
                                    ✓ Email Sent
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Resend Verification Email
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </button>
                    </div>

                    {/* Help Text */}
                    <div className="mt-6 space-y-2">
                        <p className="text-xs text-gray-500 text-center">
                            Didn't receive the email? Check your spam folder.
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                            Need help?{' '}
                            <a href="mailto:support@schoolapp.com" className="text-indigo-600 hover:underline">
                                Contact Support
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailScreen;
