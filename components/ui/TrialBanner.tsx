import React from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';
import { usePlanStatus } from '../../lib/hooks/usePlanStatus';

interface TrialBannerProps {
    onUpgradeClick?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ onUpgradeClick }) => {
    const { planStatus, loading, isDemo } = usePlanStatus();

    if (loading || isDemo) return null;

    const { is_term1_free, exam_block_active, days_until_exam_block } = planStatus;

    if (is_term1_free) return null;
    if (!exam_block_active && days_until_exam_block === null) return null;

    if (exam_block_active) {
        return (
            <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">
                    Your exam period has started. Upgrade now to unlock exam features.
                </div>
                {onUpgradeClick && (
                    <button
                        onClick={onUpgradeClick}
                        className="bg-white text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"
                    >
                        Upgrade Now
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 text-sm font-medium">
                Exams start in{' '}
                <span className="font-bold">
                    {days_until_exam_block} day{days_until_exam_block !== 1 ? 's' : ''}
                </span>
                . Upgrade before then to keep full access.
            </div>
            {onUpgradeClick && (
                <button
                    onClick={onUpgradeClick}
                    className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 flex-shrink-0"
                >
                    Upgrade
                </button>
            )}
        </div>
    );
};

export default TrialBanner;
