/**
 * TrialBanner
 *
 * Shown at the top of the admin dashboard when:
 *   - Trial has ≤ 7 days remaining  (warning)
 *   - Trial has expired             (error — upgrade required)
 *   - A plan limit is approaching   (student/teacher count near max)
 *
 * Hidden for the demo school and when the plan is active with no issues.
 */

import React from 'react';
import { AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { usePlanStatus } from '../../lib/hooks/usePlanStatus';

interface TrialBannerProps {
    onUpgradeClick?: () => void;
}

const TrialBanner: React.FC<TrialBannerProps> = ({ onUpgradeClick }) => {
    const { planStatus, loading, isDemo, trialActive, trialDaysLeft, isExpired } = usePlanStatus();

    if (loading || isDemo) return null;

    const studentPct = planStatus.limits.max_students < 2_000_000_000
        ? planStatus.usage.students / planStatus.limits.max_students
        : 0;
    const teacherPct = planStatus.limits.max_teachers < 2_000_000_000
        ? planStatus.usage.teachers / planStatus.limits.max_teachers
        : 0;
    const nearLimit = studentPct >= 0.85 || teacherPct >= 0.85;

    // Nothing to show
    if (!isExpired && !(trialActive && trialDaysLeft <= 7) && !nearLimit) return null;

    if (isExpired) {
        return (
            <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">
                    Your free trial has expired. Some features are restricted. Upgrade to continue.
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

    if (trialActive && trialDaysLeft <= 7) {
        return (
            <div className="bg-amber-500 text-white px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">
                    Your 30-day free trial ends in <span className="font-bold">{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</span>.
                    Upgrade to keep full access.
                </div>
                {onUpgradeClick && (
                    <button
                        onClick={onUpgradeClick}
                        className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 flex-shrink-0 flex items-center gap-1"
                    >
                        <Sparkles className="w-3 h-3" />
                        Upgrade
                    </button>
                )}
            </div>
        );
    }

    if (nearLimit) {
        const resource = studentPct >= 0.85 ? 'students' : 'teachers';
        const used = resource === 'students' ? planStatus.usage.students : planStatus.usage.teachers;
        const max = resource === 'students' ? planStatus.limits.max_students : planStatus.limits.max_teachers;
        return (
            <div className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">
                    You have used {used} of {max} {resource} on your current plan.
                    Upgrade to add more.
                </div>
                {onUpgradeClick && (
                    <button
                        onClick={onUpgradeClick}
                        className="bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-50 flex-shrink-0"
                    >
                        Upgrade Plan
                    </button>
                )}
            </div>
        );
    }

    return null;
};

export default TrialBanner;
