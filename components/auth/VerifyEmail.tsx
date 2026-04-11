import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DashboardType } from '../../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerifyEmail: React.FC = () => {
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Verifying your credentials...');
    const [errorDetails, setErrorDetails] = useState<string | null>(null);
    const { signIn } = useAuth();

    useEffect(() => {
        const verify = async () => {
            try {
                // Extract token from hash: /#/auth/verify?token=abc
                let token = null;
                if (window.location.hash.includes('?')) {
                    const params = new URLSearchParams(window.location.hash.split('?')[1]);
                    token = params.get('token');
                } else if (window.location.search) {
                    const params = new URLSearchParams(window.location.search);
                    token = params.get('token');
                }

                if (!token) throw new Error("No verification token found in URL.");

                const res = await fetch(`${API_BASE}/auth/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Verification failed');

                setStatus('success');
                setMessage('Verification successful! Welcome.');
                localStorage.setItem('show_welcome_toast', 'true');

                // Sign in the user immediately
                const dashRole = data.user.role.toLowerCase() === 'admin' ? DashboardType.Admin : DashboardType.Teacher;
                await signIn(dashRole, { ...data.user, token: data.token });

                setTimeout(() => {
                    window.location.hash = '';
                    window.location.href = '/';
                }, 1500);

            } catch (err: any) {
                setStatus('error');
                setMessage('Verification Failed');
                setErrorDetails(err.message || 'The link may be expired or invalid.');
            }
        };

        verify();
    }, [signIn]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-100">
                {status === 'processing' && (
                    <div className="space-y-4">
                        <div className="flex justify-center mb-6">
                            <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{message}</h2>
                        <p className="text-slate-500 font-medium">This will only take a moment.</p>
                    </div>
                )}
                {status === 'success' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="flex justify-center mb-6">
                            <CheckCircle className="h-20 w-20 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{message}</h2>
                        <p className="text-slate-500 font-medium flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Preparing your workspace...
                        </p>
                    </div>
                )}
                {status === 'error' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-center mb-6">
                            <XCircle className="h-20 w-20 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{message}</h2>
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                            <p className="text-red-600 font-medium text-sm">{errorDetails}</p>
                        </div>
                        <button
                            onClick={() => { window.location.hash = ''; window.location.reload(); }}
                            className="mt-6 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl hover:shadow-slate-900/20 active:scale-[0.98]"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
