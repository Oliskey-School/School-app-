import React, { useState, useEffect, useRef } from 'react';
import { Mail, AlertTriangle, Send, CheckCircle, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';

type Step = 'idle' | 'editing' | 'awaiting_code';

const EmailVerificationPrompt: React.FC = () => {
    const { user, signIn, refreshUser } = useAuth();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [step, setStep] = useState<Step>('idle');
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [pendingEmail, setPendingEmail] = useState<string>('');
    const [code, setCode] = useState('');
    const [updating, setUpdating] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const codeInputRef = useRef<HTMLInputElement | null>(null);

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

    useEffect(() => {
        if (step === 'awaiting_code') {
            setTimeout(() => codeInputRef.current?.focus(), 50);
        }
    }, [step]);

    const handleDismiss = () => {
        localStorage.setItem('email_verification_prompt_dismissed_at', Date.now().toString());
        setIsDismissed(true);
        toast.success("Prompt hidden. It will reappear in 3 days if unverified.", {
            duration: 3000,
            icon: '👋'
        });
    };

    // Only show if user is logged in and email is not verified
    const isVerified = user?.email_verified === true || user?.user_metadata?.email_verified === true;

    if (isVerified || !user || isDismissed) return null;

    const isFakeDemo = (user?.id?.startsWith('d3300') || user?.user_metadata?.is_demo) &&
        (user?.email?.endsWith('@demo.com') || user?.email?.endsWith('@school.com'));

    const handleResend = async () => {
        setSending(true);
        try {
            if (isFakeDemo) {
                await new Promise(r => setTimeout(r, 600));
                setSent(true);
                setPendingEmail(user.email!);
                setStep('awaiting_code');
                toast.success('Verification code sent! (Demo Mode — use any 6 digits)');
                setSending(false);
                return;
            }

            const result = await api.resendVerification(user.email!);

            if (result.success) {
                setSent(true);
                setPendingEmail(user.email!);
                setStep('awaiting_code');
                toast.success(`Verification code sent to ${user.email}. Enter it below.`);
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
        const trimmed = newEmail.trim().toLowerCase();
        if (!trimmed) {
            toast.error('Please enter an email address.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            toast.error('Please enter a valid email address.');
            return;
        }
        if (trimmed === user.email?.toLowerCase()) {
            setStep('idle');
            return;
        }

        setUpdating(true);
        try {
            if (isFakeDemo) {
                await new Promise(r => setTimeout(r, 800));
                setPendingEmail(trimmed);
                setStep('awaiting_code');
                toast.success(`Code sent to ${trimmed}! (Demo Mode — use any 6 digits)`);
                setUpdating(false);
                return;
            }

            const result = await api.updateEmail({ userId: user.id, newEmail: trimmed });

            if (result.success) {
                setPendingEmail(result.email || trimmed);
                setStep('awaiting_code');
                toast.success(`A 6-digit code was sent to ${trimmed}. Enter it below.`);
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

    const handleVerifyCode = async () => {
        const cleaned = code.replace(/\D/g, '');
        if (cleaned.length !== 6) {
            toast.error('Please enter the 6-digit code.');
            return;
        }

        setVerifying(true);
        try {
            if (isFakeDemo) {
                await new Promise(r => setTimeout(r, 600));
                toast.success('Email verified! (Demo Mode)');
                if (signIn && user.user_metadata?.role) {
                    await signIn(user.user_metadata.role.toLowerCase(), {
                        ...user.user_metadata,
                        email: pendingEmail || user.email,
                        email_verified: true,
                        userId: user.id
                    });
                }
                setVerifying(false);
                return;
            }

            const result = await api.verifyEmailChange({ userId: user.id, code: cleaned });

            if (result.success) {
                toast.success('Email verified successfully!');
                setStep('idle');
                setCode('');
                if (refreshUser) await refreshUser();
            } else {
                toast.error(result.message || 'Invalid code. Please try again.');
            }
        } catch (error: any) {
            console.error('Error verifying code:', error);
            toast.error(error.message || 'Invalid or expired code.');
        } finally {
            setVerifying(false);
        }
    };

    const displayEmail = pendingEmail || user.email;

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

                    {step === 'editing' ? (
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
                                    {updating ? 'Sending...' : 'Send Code'}
                                </button>
                                <button
                                    onClick={() => {
                                        setStep('idle');
                                        setNewEmail(user.email || '');
                                    }}
                                    className="flex-1 sm:flex-none px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                            Your email <span className="font-semibold text-amber-600 dark:text-amber-400">{displayEmail}</span> is not yet confirmed.
                            <button
                                onClick={() => { setStep('editing'); setNewEmail(user.email || ''); }}
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
                        disabled={sending || step === 'editing'}
                        className={`group relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${sent
                            ? 'bg-green-500 text-white'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                            } disabled:opacity-70`}
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Sending...</span>
                            </>
                        ) : sent ? (
                            <>
                                <CheckCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
                                <span>Resend Code</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                <span>Resend Verification</span>
                            </>
                        )}
                    </button>

                    {sent && step !== 'awaiting_code' && (
                        <p className="mt-2 text-[10px] text-center text-green-600 font-medium animate-fade-in">
                            Check spam if not found
                        </p>
                    )}
                </div>
            </div>

            {step === 'awaiting_code' && (
                <div className="relative mt-5 pt-5 border-t border-amber-500/20 animate-fade-in">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex-grow">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                                Enter the 6-digit code we sent to{' '}
                                <span className="text-emerald-600 dark:text-emerald-400">{displayEmail}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                The code expires in 10 minutes. Check your spam folder if you don't see it.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                            ref={codeInputRef}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyCode(); }}
                            placeholder="••••••"
                            className="w-full sm:w-48 px-4 py-2 rounded-lg border border-emerald-500/30 bg-white/70 dark:bg-gray-800/70 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center text-lg font-mono tracking-[0.5em] font-bold text-gray-800 dark:text-white"
                        />
                        <button
                            onClick={handleVerifyCode}
                            disabled={verifying || code.length !== 6}
                            className="w-full sm:w-auto px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {verifying ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Verify & Activate</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => { setStep('idle'); setCode(''); }}
                            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

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
