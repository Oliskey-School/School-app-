import React, { useState, useEffect } from 'react';
import { Mail, AlertTriangle, Send, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';

const EmailVerificationPrompt: React.FC = () => {
    const { user, signIn } = useAuth();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [updating, setUpdating] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // Initial check for dismissal state from localStorage
    useEffect(() => {
        const dismissedAt = localStorage.getItem('email_verification_prompt_dismissed_at');
        if (dismissedAt) {
            const dismissedDate = new Date(parseInt(dismissedAt));
            const now = new Date();
            const diffInHours = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60);

            // Re-show only after 3 days (72 hours)
            if (diffInHours < 72) {
                setIsDismissed(true);
            }
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('email_verification_prompt_dismissed_at', Date.now().toString());
        setIsDismissed(true);
        toast.success("Prompt hidden. It will reappear in 3 days if unverified.", {
            duration: 3000,
            icon: '👋'
        });
    };

    // Only show if user is logged in and email is not verified
    const isVerified = user?.user_metadata?.email_verified === true;

    if (isVerified || !user || isDismissed) return null;

    const handleResend = async () => {
        setSending(true);
        try {
            // Check if it's a mock demo user or a real user
            // We only bypass if the email is a FAKE demo email
            const isFakeDemo = (user?.id?.startsWith('d3300') || user?.user_metadata?.is_demo) &&
                (user?.email?.endsWith('@demo.com') || user?.email?.endsWith('@school.com'));

            if (isFakeDemo) {
                await new Promise(r => setTimeout(r, 800));
                setSent(true);
                toast.success('Verification email sent! (Demo Mode)');
                setSending(false);
                return;
            }

            // Call Backend API instead of local supabase client for better reliability (uses service role)
            const result = await api.resendVerification(user.email!);

            if (result.success) {
                setSent(true);
                toast.success('Verification email sent! Please check your inbox.');
            } else {
                toast.error(result.message || 'Failed to send verification email');
            }
        } catch (error: any) {
            console.error('Error resending verification:', error);
            toast.error(error.message || 'Network error. Please try again later.');
        } finally {
            setSending(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail || newEmail === user.email) {
            setIsEditing(false);
            return;
        }

        setUpdating(true);
        try {
            const isFakeDemo = (user?.id?.startsWith('d3300') || user?.user_metadata?.is_demo) &&
                (user?.email?.endsWith('@demo.com') || user?.email?.endsWith('@school.com'));

            if (isFakeDemo) {
                await new Promise(r => setTimeout(r, 1000));
                toast.success('Email updated successfully! (Demo Mode)');
                setIsEditing(false);
                if (signIn) {
                    await signIn(user.user_metadata?.role?.toLowerCase(), {
                        ...user.user_metadata,
                        email: newEmail,
                        userId: user.id
                    });
                }
                setUpdating(false);
                return;
            }

            // Real email update via Backend API (uses service role)
            const result = await api.updateEmail({ userId: user.id, newEmail });

            if (result.success) {
                toast.success(`Verification email sent to ${newEmail}! Please check your inbox.`);
                setIsEditing(false);
            } else {
                toast.error(result.message || 'Failed to update email');
            }
        } catch (error: any) {
            console.error('Error updating email:', error);
            toast.error(error.message || 'Network error. Please try again later.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="w-full mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 backdrop-blur-md p-4 sm:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 group/banner">
            {/* Animated Background Pulse */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl animate-pulse"></div>

            {/* Dismiss Button - Left Side as requested */}
            <button
                onClick={handleDismiss}
                className="absolute top-2 left-2 z-10 p-1.5 rounded-full bg-white/50 dark:bg-gray-800/50 text-gray-400 hover:text-amber-500 hover:bg-white dark:hover:bg-gray-800 transition-all opacity-0 group-hover/banner:opacity-100 focus:opacity-100"
                title="Dismiss for 3 days"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
                    <AlertTriangle className="w-6 h-6 animate-bounce-subtle" />
                </div>

                <div className="flex-grow text-center sm:text-left w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                            Email Confirmation Required
                        </h3>
                    </div>

                    {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="w-full sm:w-64 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-white/50 dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                placeholder="Enter correct email"
                            />
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <button
                                    onClick={handleUpdateEmail}
                                    disabled={updating}
                                    className="flex-1 sm:flex-none px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors disabled:opacity-50"
                                >
                                    {updating ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setNewEmail(user.email);
                                    }}
                                    className="flex-1 sm:flex-none px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                            Your email <span className="font-semibold text-amber-600 dark:text-amber-400">{user.email}</span> is not yet confirmed.
                            <button
                                onClick={() => setIsEditing(true)}
                                className="ml-2 text-xs font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2"
                            >
                                Edit Email
                            </button>
                            <br />
                            Please confirm your email to prevent data loss and ensure full account security.
                        </p>
                    )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <button
                        onClick={handleResend}
                        disabled={sending || sent || isEditing}
                        className={`group relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${sent
                            ? 'bg-green-500 text-white cursor-default'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                            } disabled:opacity-70`}
                    >
                        {sent ? (
                            <>
                                <CheckCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
                                <span>Sent</span>
                            </>
                        ) : sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                <span>Resend Verification</span>
                            </>
                        )}
                    </button>

                    {sent && (
                        <p className="mt-2 text-[10px] text-center text-green-600 font-medium animate-fade-in">
                            Check spam if not found
                        </p>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.4s ease-out forwards;
                }
            `}} />
        </div>
    );
};
export default EmailVerificationPrompt;
