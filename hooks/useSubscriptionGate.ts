import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export type PlanType = 'free' | 'basic' | 'advanced';
export type SubscriptionStatus = 'free' | 'active' | 'expired' | 'suspended';

export interface SubscriptionGate {
    plan: PlanType;
    status: SubscriptionStatus;
    /** Whole days remaining in current term. null when not on a term plan. */
    daysLeft: number | null;
    /** Current term closing date (ISO string) — null when on Free or no active term. */
    termClosingDate: string | null;
    /** Current term number 1/2/3 — null when not on a paid term. */
    currentTerm: number | null;
    academicSession: string | null;

    isFree: boolean;
    isExpired: boolean;
    isSuspended: boolean;
    /** Hard lock: app must redirect to /upgrade or show suspend screen. */
    isLocked: boolean;
    /** Soft warn: term ends in ≤7 days. */
    needsRenewal: boolean;
    /** AI features are gated to Advanced plan only. */
    isAIAllowed: boolean;
}

const FREE_GATE: SubscriptionGate = {
    plan: 'free',
    status: 'free',
    daysLeft: null,
    termClosingDate: null,
    currentTerm: null,
    academicSession: null,
    isFree: true,
    isExpired: false,
    isSuspended: false,
    isLocked: false,
    needsRenewal: false,
    isAIAllowed: false,
};

const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

export function useSubscriptionGate(): SubscriptionGate {
    const { currentSchool, isDemo, user } = useAuth() as any;

    return useMemo<SubscriptionGate>(() => {
        // Demo school always gets Advanced privileges — visitors should see the full product.
        if (isDemo || currentSchool?.id === DEMO_SCHOOL_ID) {
            return {
                ...FREE_GATE,
                plan: 'advanced',
                status: 'active',
                isFree: false,
                isAIAllowed: true,
            };
        }

        const plan = (currentSchool?.plan_type as PlanType) || 'free';
        const status = (currentSchool?.subscription_status as SubscriptionStatus) || 'free';
        const closing = currentSchool?.term_closing_date || null;

        let daysLeft: number | null = null;
        if (closing) {
            const ms = new Date(closing).getTime() - Date.now();
            daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
        }

        const isExpired = status === 'expired';
        const isSuspended = status === 'suspended';
        const isLocked = isExpired || isSuspended;
        const needsRenewal = status === 'active' && daysLeft !== null && daysLeft <= 7;

        // Per-user self-pay: a user who bought AI for THIS term (on a Basic school) keeps
        // AI on their own account even though the school isn't on Advanced.
        let selfPaidAi = false;
        try {
            const settings = typeof currentSchool?.settings === 'string'
                ? JSON.parse(currentSchool.settings) : currentSchool?.settings;
            const rec = settings?.ai_self_paid?.[user?.id];
            if (rec) {
                selfPaidAi = String(rec.term) === String(currentSchool?.current_term)
                    && String(rec.session) === String(currentSchool?.academic_session);
            }
        } catch { /* ignore malformed settings */ }

        const isAIAllowed = (plan === 'advanced' && status === 'active') || selfPaidAi;

        return {
            plan,
            status,
            daysLeft,
            termClosingDate: closing,
            currentTerm: currentSchool?.current_term ?? null,
            academicSession: currentSchool?.academic_session ?? null,
            isFree: plan === 'free',
            isExpired,
            isSuspended,
            isLocked,
            needsRenewal,
            isAIAllowed,
        };
    }, [currentSchool, isDemo, user?.id]);
}
