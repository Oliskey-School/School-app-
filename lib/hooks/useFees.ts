import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Fee } from '../../types';

export interface UseFeesResult {
    fees: Fee[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createFee: (fee: Partial<Fee>) => Promise<Fee | null>;
    updateFee: (id: string | number, updates: Partial<Fee>) => Promise<Fee | null>;
    deleteFee: (id: string | number) => Promise<boolean>;
}

export function useFees(filters?: { studentId?: string | number; status?: string }): UseFeesResult {
    const [fees, setFees] = useState<Fee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const transformFee = (f: any): Fee => ({
        id: f.id,
        studentId: f.student_id,
        amount: f.total_fee,
        paidAmount: f.paid_amount,
        dueDate: f.due_date,
        status: f.status,
        title: f.title || 'School Fee'
    });

    const fetchFees = useCallback(async () => {
        try {
            setLoading(true);
            const schoolId = sessionStorage.getItem('school_id') || undefined;
            
            // Map filters to expected API structure
            const apiFilters = {
                ...filters,
                schoolId
            };
            
            const data = await api.getFees(apiFilters);

            const transformedFees: Fee[] = (data || []).map(transformFee);

            setFees(transformedFees);
            setError(null);
        } catch (err) {
            console.error('Error fetching fees:', err);
            setError(err as Error);
            setFees([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchFees();
    }, [fetchFees]);

    const createFee = async (feeData: Partial<Fee>): Promise<Fee | null> => {
        try {
            const data = await api.createFee({
                student_id: feeData.studentId,
                total_fee: feeData.amount,
                paid_amount: feeData.paidAmount,
                due_date: feeData.dueDate,
                status: feeData.status,
                title: feeData.title || 'School Fee',
                school_id: sessionStorage.getItem('school_id')
            });

            return transformFee(data);
        } catch (err) {
            console.error('Error creating fee:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateFee = async (id: string | number, updates: Partial<Fee>): Promise<Fee | null> => {
        try {
            const data = await api.updateFee(String(id), {
                student_id: updates.studentId,
                total_fee: updates.amount,
                paid_amount: updates.paidAmount,
                due_date: updates.dueDate,
                status: updates.status,
                title: updates.title
            });

            return transformFee(data);
        } catch (err) {
            console.error('Error updating fee:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteFee = async (id: string | number): Promise<boolean> => {
        try {
            await api.deleteFee(String(id));
            return true;
        } catch (err) {
            console.error('Error deleting fee:', err);
            setError(err as Error);
            return false;
        }
    };
    return {
        fees,
        loading,
        error,
        refetch: fetchFees,
        createFee,
        updateFee,
        deleteFee,
    };
}
