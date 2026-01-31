import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { useAuth } from '../../context/AuthContext';
import { useTenantLimit } from '../../hooks/useTenantLimit';
import { PaymentService } from '../../services/PaymentService';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../layout/DashboardLayout'; // Adjust import if needed
import { ShieldCheck, Check, Users } from 'lucide-react';

const SubscriptionPage: React.FC = () => {
    const { currentSchool } = useAuth();
    const { currentCount, maxLimit, isPremium, planType } = useTenantLimit();
    const [loading, setLoading] = useState(false);

    // Paystack Configuration
    const config = {
        reference: `SCH_SUB_${new Date().getTime()}`,
        email: currentSchool?.contactEmail || 'admin@school.com', // Fallback or use admin email
        amount: 5000 * 100, // 5000 NGN in kobo
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key', // Ensure env var
    };

    const initializePayment = usePaystackPayment(config);

    const onSuccess = async (reference: any) => {
        setLoading(true);
        try {
            if (!currentSchool?.id) throw new Error("School ID not found");

            // 1. Verify and Record in Backend/DB
            await PaymentService.recordSubscriptionPayment(
                currentSchool.id,
                5000,
                reference.reference,
                'premium'
            );

            // 2. Refresh Context to update UI immediately
            // await refreshProfile(); 

            toast.success("Subscription upgraded successfully! You now have unlimited access.");
        } catch (error: any) {
            console.error(error);
            toast.error("Payment successful but failed to update subscription. Contact support.");
        } finally {
            setLoading(false);
        }
    };

    const onClose = () => {
        toast('Payment cancelled.');
    }

    const handleUpgrade = () => {
        // @ts-ignore
        initializePayment(onSuccess, onClose);
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Upgrade your School Plan
                    </h1>
                    <p className="mt-4 text-xl text-gray-500">
                        Unlock the full potential of your school management system.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Free Plan Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 opacity-75">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Basic Plan</h3>
                            {planType === 'free' && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                    Current
                                </span>
                            )}
                        </div>
                        <div className="mt-4 flex items-baseline text-gray-900">
                            <span className="text-4xl font-extrabold tracking-tight">Free</span>
                        </div>
                        <p className="mt-6 text-gray-500">Perfect for trying out the platform.</p>

                        <ul className="mt-6 space-y-4">
                            <li className="flex">
                                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                                <span className="ml-3 text-gray-500">Up to 10 Users (Students/Teachers)</span>
                            </li>
                            <li className="flex">
                                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                                <span className="ml-3 text-gray-500">Basic Records</span>
                            </li>
                            <li className="flex">
                                <Check className="flex-shrink-0 h-6 w-6 text-green-500" />
                                <span className="ml-3 text-gray-500">Standard Support</span>
                            </li>
                        </ul>
                    </div>

                    {/* Premium Plan Card */}
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-indigo-500 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
                            Recommended
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Premium Plan</h3>
                            {isPremium && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    Active
                                </span>
                            )}
                        </div>
                        <div className="mt-4 flex items-baseline text-gray-900">
                            <span className="text-4xl font-extrabold tracking-tight">₦5,000</span>
                            <span className="ml-1 text-xl font-semibold text-gray-500">/month</span>
                        </div>
                        <p className="mt-6 text-gray-500">Unlimited growth for your institution.</p>

                        <ul className="mt-6 space-y-4">
                            <li className="flex">
                                <ShieldCheck className="flex-shrink-0 h-6 w-6 text-indigo-500" />
                                <span className="ml-3 text-gray-500 font-medium">Unlimited Users</span>
                            </li>
                            <li className="flex">
                                <Check className="flex-shrink-0 h-6 w-6 text-indigo-500" />
                                <span className="ml-3 text-gray-500">Advanced Analytics</span>
                            </li>
                            <li className="flex">
                                <Check className="flex-shrink-0 h-6 w-6 text-indigo-500" />
                                <span className="ml-3 text-gray-500">Priority Support</span>
                            </li>
                            <li className="flex">
                                <Check className="flex-shrink-0 h-6 w-6 text-indigo-500" />
                                <span className="ml-3 text-gray-500">Custom Branding</span>
                            </li>
                        </ul>

                        <div className="mt-8">
                            {isPremium ? (
                                <button
                                    disabled
                                    className="w-full bg-green-50 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-green-700 cursor-default"
                                >
                                    Plan Active
                                </button>
                            ) : (
                                <button
                                    onClick={handleUpgrade}
                                    disabled={loading}
                                    className="w-full bg-indigo-600 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-white hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-all shadow-lg hover:shadow-xl"
                                >
                                    {loading ? 'Processing...' : 'Upgrade Now'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-12 bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Users className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-indigo-800">Current Usage</h3>
                            <div className="mt-2 text-sm text-indigo-700">
                                <p>
                                    You are currently using <strong>{currentCount}</strong> out of <strong>{isPremium ? 'Unlimited' : maxLimit}</strong> available user slots.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SubscriptionPage;
