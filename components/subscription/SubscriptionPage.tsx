import React, { useState, useMemo } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../context/AuthContext';
import { useTenantLimit } from '../../hooks/useTenantLimit';
import { PaymentService } from '../../services/PaymentService';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../layout/DashboardLayout';
import { ShieldCheck, Check, Users } from 'lucide-react';

const PLANS = [
    {
        key: 'free',
        title: 'Free',
        price: 0,
        priceText: 'Free',
        description: 'Try the platform with a small school and basic access.',
        features: ['Up to 10 Users', 'Basic records', 'Standard support'],
        badge: 'Starter'
    },
    {
        key: 'per_child',
        title: 'Per Child',
        price: 1500,
        priceText: '₦1,500/child/mo',
        description: 'Pay only for the children you manage.',
        features: ['Limited features', 'Per-child billing', 'Email support'],
        badge: 'Flexible'
    },
    {
        key: 'unlimited',
        title: 'Unlimited',
        price: 3000,
        priceText: '₦3,000/mo',
        description: 'Unlimited access to all features and users.',
        features: ['Unlimited Users', 'All features', 'Priority support', 'Custom branding'],
        badge: 'Recommended'
    }
];

const PLAN_ORDER: Record<string, number> = {
    free: 1,
    per_child: 2,
    unlimited: 3
};

const SubscriptionPage: React.FC = () => {
    const { user, currentSchool } = useAuth();
    const { currentCount, maxLimit, isPremium, planType } = useTenantLimit();
    const [loading, setLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string>(planType === 'free' ? 'basic' : planType);

    const currentPlan = PLANS.find((plan) => plan.key === planType) || PLANS[0];
    const selectedPlanData = PLANS.find((plan) => plan.key === selectedPlan) || PLANS[1];
    const isUpgradeEligible = PLAN_ORDER[selectedPlan] > PLAN_ORDER[planType];

    const config = useMemo(() => ({
        reference: `SCH_SUB_${new Date().getTime()}`,
        email: currentSchool?.contactEmail || user?.email || 'admin@school.com',
        amount: selectedPlanData.price * 100,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key'
    }), [currentSchool?.contactEmail, user?.email, selectedPlanData.price]);

    const initializePayment = usePaystackPayment(config);

    const onSuccess = async (reference: any) => {
        setLoading(true);
        try {
            if (!currentSchool?.id) throw new Error('School ID not found');
            await PaymentService.recordSubscriptionPayment(
                currentSchool.id,
                selectedPlanData.price,
                reference.reference,
                selectedPlanData.key
            );
            toast.success(`You have successfully upgraded to ${selectedPlanData.title}.`);
        } catch (error: any) {
            console.error(error);
            toast.error('Payment was successful but updating your plan failed. Please contact support.');
        } finally {
            setLoading(false);
        }
    };

    const onClose = () => {
        toast('Payment cancelled.');
    };

    const handleUpgrade = () => {
        // @ts-ignore
        initializePayment(onSuccess, onClose);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-8 sm:mb-10">
                    <h1 className="text-2xl font-extrabold text-gray-900 sm:text-4xl">Upgrade Your School Plan</h1>
                    <p className="mt-4 text-base text-gray-500 max-w-2xl mx-auto sm:text-lg">
                        Choose the plan that fits your school and complete payment securely. Your subscription status will update automatically after payment.
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-indigo-600">Current Plan</p>
                        <h2 className="mt-2 sm:mt-3 text-xl sm:text-2xl font-bold text-slate-900">{currentPlan.title}</h2>
                        <p className="mt-2 text-xs sm:text-sm text-slate-500">{currentPlan.description}</p>

                        <div className="mt-4 sm:mt-6 space-y-3 text-xs sm:text-sm text-slate-600">
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Status</span>
                                <span className="rounded-full bg-green-50 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-green-700">{currentSchool?.subscription_status || 'active'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Usage</span>
                                <span>{currentCount} / {isPremium ? 'Unlimited' : maxLimit}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Plan Type</span>
                                <span className="capitalize">{currentSchool?.plan_type || 'free'}</span>
                            </div>
                            {currentSchool?.trial_ends_at && (
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">Trial ends</span>
                                    <span>{new Date(currentSchool.trial_ends_at).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Choose a plan</h2>
                                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">Select the plan you want and then complete payment using Paystack.</p>
                            </div>
                            <div className="rounded-full bg-slate-100 px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-slate-700">
                                Selected: <span className="font-semibold capitalize">{selectedPlanData.title}</span>
                            </div>
                        </div>

                        <div className="mt-5 sm:mt-6 grid gap-4 grid-cols-1 md:grid-cols-2">
                            {PLANS.map((plan) => {
                                const isCurrent = plan.key === planType;
                                const isSelected = plan.key === selectedPlan;
                                const isDowngrade = PLAN_ORDER[plan.key] < PLAN_ORDER[planType];
                                return (
                                    <button
                                        key={plan.key}
                                        type="button"
                                        onClick={() => setSelectedPlan(plan.key)}
                                        className={`block w-full rounded-2xl sm:rounded-3xl border p-4 sm:p-6 text-left transition ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-300'} ${isDowngrade ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        disabled={isDowngrade}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-[10px] sm:text-sm font-semibold uppercase tracking-wide text-slate-500">{plan.title}</p>
                                                <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold text-slate-900">{plan.priceText}</p>
                                            </div>
                                            {plan.badge && (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                    {plan.badge}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mt-3 text-xs sm:text-sm leading-5 sm:leading-6 text-slate-600">{plan.description}</p>
                                        <ul className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-2 sm:gap-3">
                                                    <Check className="mt-0.5 h-3 w-3 sm:h-4 sm:w-4 flex-none text-green-500" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="mt-4 sm:mt-6">
                                            {isCurrent ? (
                                                <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-sm font-semibold text-green-700">Current plan</span>
                                            ) : isDowngrade ? (
                                                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-sm font-semibold text-slate-700">Downgrade not supported</span>
                                            ) : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 sm:mt-8 rounded-2xl sm:rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">Selected plan summary</h3>
                                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500">{selectedPlanData.description}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-xs sm:text-sm text-slate-500">Amount due</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-slate-900">{selectedPlanData.priceText}</p>
                                </div>
                            </div>

                            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <button
                                    onClick={handleUpgrade}
                                    disabled={!isUpgradeEligible || loading}
                                    className={`inline-flex items-center justify-center rounded-xl sm:rounded-2xl px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold transition w-full sm:w-auto ${!isUpgradeEligible ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                >
                                    {loading ? 'Processing...' : isUpgradeEligible ? `Upgrade to ${selectedPlanData.title}` : 'Select a higher plan'}
                                </button>
                                <p className="text-[10px] sm:text-sm text-slate-500 text-center sm:text-right">
                                    Powered by Paystack.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 sm:mt-10 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                    <div className="flex items-center gap-2 sm:gap-3 text-slate-900">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" aria-hidden="true" />
                        <h3 className="text-base sm:text-lg font-semibold">Current Usage</h3>
                    </div>
                    <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-600">
                        You are currently using <strong>{currentCount}</strong> out of <strong>{isPremium ? 'Unlimited' : maxLimit}</strong> available user slots.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SubscriptionPage;
