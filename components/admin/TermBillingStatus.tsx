import React from 'react';
import { CreditCard, CheckCircle, Clock } from 'lucide-react';
import { usePlanStatus } from '../../lib/hooks/usePlanStatus';
import TrialBanner from '../ui/TrialBanner';

interface TermBillingStatusProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const TermBillingStatus: React.FC<TermBillingStatusProps> = ({ navigateTo }) => {
    const { planStatus, loading, isDemo } = usePlanStatus();

    if (loading || isDemo) return null;

    const { current_term, is_term1_free, effective_plan } = planStatus;
    const termLabel = `Term ${current_term}`;
    const planLabel = effective_plan.charAt(0).toUpperCase() + effective_plan.slice(1);

    return (
        <div className="space-y-2 mb-1">
            <TrialBanner onUpgradeClick={() => navigateTo('upgrade', 'Billing & Plan')} />
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 text-green-600 flex-shrink-0">
                    <CreditCard className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{termLabel} — {planLabel} Plan</p>
                    {is_term1_free ? (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                            <CheckCircle className="w-3 h-3" />
                            Free this term — no payment required
                        </p>
                    ) : (
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Payment required for this term
                        </p>
                    )}
                </div>
                <button
                    onClick={() => navigateTo('upgrade', 'Billing & Plan')}
                    className="text-xs font-semibold text-green-600 hover:text-green-700 flex-shrink-0"
                >
                    Manage →
                </button>
            </div>
        </div>
    );
};

export default TermBillingStatus;
