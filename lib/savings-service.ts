import { api } from './api';

export interface SavingsPlan {
    id?: string;
    school_id: string;
    parent_id: string;
    student_id: string;
    target_amount: number;
    target_date: string;
    current_amount: number;
    frequency: 'weekly' | 'monthly';
    is_active: boolean;
}

export class SavingsService {
    /**
     * Calculates the installment amount required to reach a goal.
     */
    static calculateInstallment(target: number, date: string, frequency: 'weekly' | 'monthly') {
        const now = new Date();
        const goalDate = new Date(date);
        const diffTime = Math.abs(goalDate.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let periods = 0;
        if (frequency === 'weekly') {
            periods = Math.ceil(diffDays / 7);
        } else {
            periods = Math.ceil(diffDays / 30);
        }

        if (periods <= 0) return target;
        return Math.ceil(target / periods);
    }

    /**
     * Creates a new savings plan.
     */
    static async createPlan(plan: Omit<SavingsPlan, 'id' | 'current_amount' | 'is_active'>) {
        return await api.createSavingsPlan({
            ...plan,
            current_amount: 0,
            is_active: true
        });
    }

    /**
     * Fetches active plans for a parent.
     */
    static async getParentPlans(parentId: string) {
        return await api.getSavingsPlans();
    }

    /**
     * Adds funds to a plan (usually called via webhook or successful payment).
     */
    static async addFunds(planId: string, amount: number) {
        return await api.depositToSavingsPlan(planId, amount);
    }
}

