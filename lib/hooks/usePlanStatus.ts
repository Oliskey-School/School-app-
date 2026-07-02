import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../../context/AuthContext';

export interface PlanLimits {
    max_students: number;
    max_teachers: number;
}

export interface PlanUsage {
    students: number;
    teachers: number;
}

export interface PlanStatus {
    plan_type: string;
    subscription_status: string;
    effective_plan: string;
    trial_active: boolean;
    trial_days_left: number;
    trial_ends_at: string | null;
    is_expired: boolean;
    limits: PlanLimits;
    usage: PlanUsage;
    can_add_student: boolean;
    can_add_teacher: boolean;
    // Term-based billing
    current_term: 1 | 2 | 3;
    is_term1_free: boolean;      // true for terms 1 AND 2 (both are free)
    days_until_exam_block: number | null;
    exam_block_active: boolean;
    app_locked: boolean;         // hard lock — all roles blocked until admin pays
}

const DEFAULT_STATUS: PlanStatus = {
    plan_type: 'free',
    subscription_status: 'active',
    effective_plan: 'free',
    trial_active: false,
    trial_days_left: 0,
    trial_ends_at: null,
    is_expired: false,
    limits: { max_students: 50, max_teachers: 10 },
    usage: { students: 0, teachers: 0 },
    can_add_student: true,
    can_add_teacher: true,
    current_term: 1,
    is_term1_free: true,
    days_until_exam_block: null,
    exam_block_active: false,
    app_locked: false,
};

function calcTermFields(
    currentSchool: any,
    termInfo: { closing_date?: string } | null,
    planData: Partial<PlanStatus>
): Pick<PlanStatus, 'current_term' | 'is_term1_free' | 'days_until_exam_block' | 'exam_block_active' | 'app_locked'> {
    try {
        const anchor = currentSchool?.academic_session_start || currentSchool?.created_at;
        const start = anchor ? new Date(anchor) : new Date();
        const daysSinceStart = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
        const termIndex = Math.min(Math.max(Math.floor(daysSinceStart / 150), 0), 2);
        const current_term = (termIndex + 1) as 1 | 2 | 3;

        // Terms 1 AND 2 are free — payment only required from Term 3
        const is_term1_free = current_term <= 2;

        const closingDate = termInfo?.closing_date ? new Date(termInfo.closing_date) : null;
        const daysUntilClosing = closingDate
            ? Math.ceil((closingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

        const hasPaidSubscription =
            planData.subscription_status === 'active' && planData.plan_type !== 'free';

        // Hard lock: term 3+ with no paid sub and closing date passed (or 16+ months with no term config)
        const exam_block_active =
            current_term >= 3 &&
            !hasPaidSubscription &&
            (daysUntilClosing !== null ? daysUntilClosing <= 0 : daysSinceStart >= 480);

        // Soft warning: 30 days before closing in term 3+
        const days_until_exam_block =
            !exam_block_active &&
            current_term >= 3 &&
            !hasPaidSubscription &&
            daysUntilClosing !== null &&
            daysUntilClosing <= 30
                ? daysUntilClosing
                : null;

        const app_locked = exam_block_active;

        return { current_term, is_term1_free, days_until_exam_block, exam_block_active, app_locked };
    } catch {
        return { current_term: 1, is_term1_free: true, days_until_exam_block: null, exam_block_active: false, app_locked: false };
    }
}

export function usePlanStatus() {
    const { currentSchool, isDemo } = useAuth();
    const schoolId = currentSchool?.id;
    const [planStatus, setPlanStatus] = useState<PlanStatus>(DEFAULT_STATUS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!schoolId) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchAll = async () => {
            setLoading(true);
            try {
                const [planData, termInfo] = await Promise.all([
                    api.getPlanStatus(schoolId),
                    (api.get('/subscription/current-term') as Promise<any>).catch(() => null),
                ]);

                if (cancelled) return;

                if (planData && !planData.error) {
                    const termFields = calcTermFields(currentSchool, termInfo, planData);
                    setPlanStatus(prev => ({ ...prev, ...planData, ...termFields }));
                }
            } catch (e: any) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [schoolId, currentSchool]);

    return {
        planStatus,
        loading,
        error,
        canAddStudent: planStatus.can_add_student,
        canAddTeacher: planStatus.can_add_teacher,
        trialActive: planStatus.trial_active,
        trialDaysLeft: planStatus.trial_days_left,
        isExpired: planStatus.is_expired,
        effectivePlan: planStatus.effective_plan,
        isDemo,
    };
}
