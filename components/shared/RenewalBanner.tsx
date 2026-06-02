import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';

/**
 * Soft renewal banner — shown when the school is on a paid plan and the
 * current term closes within 7 days. Sits at the top of every dashboard.
 */
const RenewalBanner: React.FC = () => {
    const gate = useSubscriptionGate();
    const navigate = useNavigate();

    if (!gate.needsRenewal) return null;

    const closingDateLabel = gate.termClosingDate
        ? new Date(gate.termClosingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

    const headline = gate.daysLeft === 0
        ? `Your Term ${gate.currentTerm} plan closes today.`
        : gate.daysLeft === 1
            ? `1 day left on Term ${gate.currentTerm}. Renew before ${closingDateLabel}.`
            : `Your Term ${gate.currentTerm} plan closes in ${gate.daysLeft} days (${closingDateLabel}).`;

    return (
        <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <p className="text-xs sm:text-sm font-medium">{headline}</p>
                </div>
                <button
                    onClick={() => navigate('/subscription')}
                    className="flex-shrink-0 inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:bg-amber-700 transition"
                >
                    Renew now
                </button>
            </div>
        </div>
    );
};

export default RenewalBanner;
