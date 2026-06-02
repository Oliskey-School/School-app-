import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertOctagon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';

/**
 * Hard lockout screen — replaces the entire dashboard when the school's
 * subscription is expired (term ended, no renewal) or suspended (admin action).
 *
 * Suspended → no escape: must contact support.
 * Expired   → CTA to /subscription so admin can renew.
 */
const SubscriptionLockScreen: React.FC = () => {
    const navigate = useNavigate();
    const { signOut, role } = useAuth() as any;
    const gate = useSubscriptionGate();
    const isAdmin = role === 'admin' || role === 'superadmin' || role === 'proprietor';

    if (gate.isSuspended) {
        return (
            <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 flex items-center justify-center">
                        <AlertOctagon className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="mt-6 text-2xl font-bold text-slate-900">Account Suspended</h1>
                    <p className="mt-3 text-sm text-slate-600">
                        Your school's account has been suspended. Please contact Oliskey support to restore access.
                    </p>
                    <div className="mt-6">
                        <a
                            href="mailto:support@oliskey.com"
                            className="block w-full rounded-xl bg-slate-900 text-white px-5 py-3 font-semibold hover:bg-slate-800"
                        >
                            Contact support
                        </a>
                        <button
                            onClick={() => signOut?.()}
                            className="mt-3 w-full rounded-xl bg-slate-100 text-slate-700 px-5 py-3 font-semibold hover:bg-slate-200"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Expired
    const closingDateLabel = gate.termClosingDate
        ? new Date(gate.termClosingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center">
                    <Lock className="w-8 h-8 text-amber-600" />
                </div>
                <h1 className="mt-6 text-2xl font-bold text-slate-900">
                    Term {gate.currentTerm ?? ''} has ended
                </h1>
                <p className="mt-3 text-sm text-slate-600">
                    Your access ended on {closingDateLabel || 'the term closing date'}. Renew now to restore the dashboard for the next term.
                </p>
                <div className="mt-6 space-y-3">
                    {isAdmin ? (
                        <button
                            onClick={() => navigate('/subscription')}
                            className="block w-full rounded-xl bg-indigo-600 text-white px-5 py-3 font-semibold hover:bg-indigo-700"
                        >
                            Renew subscription
                        </button>
                    ) : (
                        <p className="text-xs text-slate-500">
                            Ask your school admin to renew the subscription to restore access.
                        </p>
                    )}
                    <button
                        onClick={() => signOut?.()}
                        className="block w-full rounded-xl bg-slate-100 text-slate-700 px-5 py-3 font-semibold hover:bg-slate-200"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionLockScreen;
