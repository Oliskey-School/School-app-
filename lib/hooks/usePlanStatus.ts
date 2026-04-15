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
};

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

        const fetch = async () => {
            setLoading(true);
            try {
                const data = await api.getPlanStatus(schoolId);

                if (cancelled) return;

                if (data && !data.error) {
                    setPlanStatus(prev => ({ ...prev, ...data }));
                }
            } catch (e: any) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetch();
        return () => { cancelled = true; };
    }, [schoolId]);

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
