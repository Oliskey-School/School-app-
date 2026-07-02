import React from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import SubscriptionPage from '../subscription/SubscriptionPage';

interface PlanLockScreenProps {
    isAdmin: boolean;
    schoolName?: string;
}

/**
 * Shown to all roles when the school's subscription has expired (term 3+ unpaid).
 * Admin: sees the subscription payment page inline so they can pay immediately.
 * All other roles: sees a locked-out message directing them to contact admin.
 */
const PlanLockScreen: React.FC<PlanLockScreenProps> = ({ isAdmin, schoolName }) => {
    if (isAdmin) {
        return (
            <div className="w-full min-h-full flex flex-col">
                {/* Alert stripe */}
                <div className="flex-shrink-0 bg-red-600 text-white px-4 py-3 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-semibold">
                        All users are locked out. Renew your subscription below to restore access immediately.
                    </p>
                </div>
                {/* Inline payment page — no navigation needed from this context */}
                <div className="flex-1">
                    <SubscriptionPage />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-gray-50">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 max-w-sm w-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
                    <Lock className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Access Locked</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    {schoolName ? `${schoolName}'s` : "Your school's"} subscription for this term has not been renewed.
                    Please contact your school administrator to restore access.
                </p>
                <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-left">
                    <p className="text-xs font-semibold text-amber-800 mb-1">For administrators</p>
                    <p className="text-xs text-amber-700">
                        Log in with your admin account. You will be taken directly to the renewal page.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PlanLockScreen;
