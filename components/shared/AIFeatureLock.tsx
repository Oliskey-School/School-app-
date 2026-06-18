import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-hot-toast';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { DashboardType } from '../../types';

interface AIFeatureLockProps {
    /** Optional feature label shown in the lock overlay. */
    featureName?: string;
    children: React.ReactNode;
}

const USER_AI_PRICE = 2000; // ₦ (Advanced − Basic) per term, per user

/**
 * Wrap any AI-powered feature with this component to gate it behind the Advanced plan.
 *
 *   <AIFeatureLock featureName="AI Study Buddy"><StudyBuddy /></AIFeatureLock>
 *
 * When the user isn't entitled to AI, the children stay mounted behind a frosted overlay
 * with the right CTA:
 *   • Admin/Proprietor → "Upgrade to Advanced" (the whole-school plan).
 *   • Teacher/Student/Parent on a Basic school → "Unlock AI for my account — ₦2,000/term".
 *   • Teacher/Student/Parent on Free → ask the admin to upgrade (self-pay needs Basic).
 */
const AIFeatureLock: React.FC<AIFeatureLockProps> = ({ featureName = 'AI feature', children }) => {
    const gate = useSubscriptionGate();
    const navigate = useNavigate();
    const { user, role, refreshCurrentSchool } = useAuth() as any;
    const [paying, setPaying] = useState(false);

    const email = user?.email || '';
    const publicKey = (import.meta as any).env?.VITE_PAYSTACK_PUBLIC_KEY || '';
    const initPay = usePaystackPayment({
        reference: `userai_${Date.now()}`,
        email,
        amount: USER_AI_PRICE * 100, // kobo
        publicKey,
        currency: 'NGN',
    });

    // Hooks above run every render; only the rendered output is conditional.
    if (gate.isAIAllowed) return <>{children}</>;

    const isStaffOrFamily = role === DashboardType.Teacher || role === DashboardType.Student || role === DashboardType.Parent;
    const canSelfPay = isStaffOrFamily && gate.plan === 'basic';

    const handleSelfPay = () => {
        if (!email || !publicKey) { toast.error('Online payment is not configured. Please contact your school.'); return; }
        initPay({
            onSuccess: async (ref: any) => {
                setPaying(true);
                try {
                    await api.post('/subscription/user-ai', { reference: ref.reference || ref.trxref });
                    await refreshCurrentSchool?.();
                    toast.success('AI is now unlocked on your account for this term!');
                } catch (e: any) {
                    toast.error(e?.message || 'Could not activate AI. Please contact support.');
                } finally {
                    setPaying(false);
                }
            },
            onClose: () => { /* user dismissed */ },
        });
    };

    return (
        <div className="relative">
            {/* Real content underneath so layout doesn't shift */}
            <div aria-hidden className="pointer-events-none select-none blur-sm opacity-40">
                {children}
            </div>

            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm">
                <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        {featureName} is on Advanced
                    </h3>

                    {canSelfPay ? (
                        <>
                            <p className="mt-2 text-sm text-slate-600">
                                Unlock every AI tool on <strong>your own account</strong> this term for <strong>₦{USER_AI_PRICE.toLocaleString()}</strong>.
                            </p>
                            <button
                                onClick={handleSelfPay}
                                disabled={paying}
                                className="mt-5 inline-flex items-center justify-center w-full rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                            >
                                {paying ? 'Activating…' : `Unlock AI for me — ₦${USER_AI_PRICE.toLocaleString()}/term`}
                            </button>
                            <p className="mt-2 text-xs text-slate-400">Or ask your school admin to upgrade the whole school to Advanced.</p>
                        </>
                    ) : isStaffOrFamily ? (
                        <p className="mt-2 text-sm text-slate-600">
                            Ask your school admin to upgrade to the <strong>Advanced</strong> plan to unlock the AI tools.
                        </p>
                    ) : (
                        <>
                            <p className="mt-2 text-sm text-slate-600">
                                Upgrade to the Advanced plan (₦3,000 per child per term) to unlock every AI tool.
                            </p>
                            <button
                                onClick={() => navigate('/subscription')}
                                className="mt-5 inline-flex items-center justify-center w-full rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700"
                            >
                                Upgrade to Advanced
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIFeatureLock;
