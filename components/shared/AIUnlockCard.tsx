import React, { useState } from 'react';
import { Sparkles, Lock, CheckCircle } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { toast } from 'react-hot-toast';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { DashboardType } from '../../types';

const USER_AI_PRICE = 2000; // ₦ per term per user

interface AIUnlockCardProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const AIUnlockCard: React.FC<AIUnlockCardProps> = ({ navigateTo }) => {
    const gate = useSubscriptionGate();
    const { user, role, refreshCurrentSchool, isDemo } = useAuth() as any;
    const [paying, setPaying] = useState(false);

    const email = user?.email || '';
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';

    const initPay = usePaystackPayment({
        reference: `userai_${Date.now()}`,
        email,
        amount: USER_AI_PRICE * 100,
        publicKey,
        currency: 'NGN',
    });

    if (isDemo) return null;

    if (gate.isAIAllowed) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-xl flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">AI Features Enabled</p>
                        <p className="text-xs text-green-600 mt-0.5">You have full access to AI-powered tools this term.</p>
                    </div>
                </div>
            </div>
        );
    }

    const isAdmin = role === DashboardType.Admin || role === DashboardType.Proprietor;
    const isStaffOrFamily =
        role === DashboardType.Teacher ||
        role === DashboardType.Student ||
        role === DashboardType.Parent;
    const canSelfPay = isStaffOrFamily && gate.plan === 'basic';

    const handleSelfPay = () => {
        if (!email || !publicKey) {
            toast.error('Online payment is not configured. Please contact your school.');
            return;
        }
        initPay({
            onSuccess: async (ref: any) => {
                setPaying(true);
                try {
                    await api.post('/subscription/user-ai', { reference: ref.reference || ref.trxref });
                    await refreshCurrentSchool?.();
                    toast.success('AI is now unlocked on your account for this term!');
                } catch (e: any) {
                    toast.error(
                        e?.message ||
                        'Activation failed. Please contact support with reference: ' +
                        (ref.reference || ref.trxref)
                    );
                } finally {
                    setPaying(false);
                }
            },
            onClose: () => { /* user dismissed */ },
        });
    };

    if (isAdmin) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-xl flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">Upgrade to Advanced</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Unlock AI tools for your whole school — ₦3,000/child/term
                        </p>
                    </div>
                </div>
                {navigateTo && (
                    <button
                        onClick={() => navigateTo('upgrade', 'Billing & Plan')}
                        className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        View Plans →
                    </button>
                )}
            </div>
        );
    }

    if (canSelfPay) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 rounded-xl flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800 text-sm">Unlock AI for Your Account</p>
                        <p className="text-xs text-gray-500 mt-0.5">Personal AI access — ₦2,000 for this term</p>
                    </div>
                </div>
                <button
                    onClick={handleSelfPay}
                    disabled={paying}
                    className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                    {paying ? 'Activating…' : 'Pay ₦2,000 — Unlock AI'}
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-xl flex-shrink-0">
                    <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                    <p className="font-bold text-gray-800 text-sm">AI Features</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Your school needs to upgrade to Basic plan before you can unlock personal AI access.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIUnlockCard;
