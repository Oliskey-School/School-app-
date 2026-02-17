import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
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

    const fetchFees = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase.from('student_fees').select('*');

            if (filters?.studentId) {
                query = query.eq('student_id', filters.studentId);
            }
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error: fetchError } = await query.order('due_date', { ascending: false });

            if (fetchError) throw fetchError;

            const transformedFees: Fee[] = (data || []).map(transformSupabaseFee);

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

        const channel = supabase
            .channel('student-fees-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'student_fees' },
                (payload) => {
                    console.log('Fee change detected:', payload);
                    fetchFees();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchFees]);

    const createFee = async (feeData: Partial<Fee>): Promise<Fee | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('student_fees')
                .insert([{
                    student_id: feeData.studentId,
                    total_fee: feeData.amount,
                    paid_amount: feeData.paidAmount,
                    due_date: feeData.dueDate,
                    status: feeData.status,
                    title: feeData.title || 'School Fee'
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseFee(data);
        } catch (err) {
            console.error('Error creating fee:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateFee = async (id: string | number, updates: Partial<Fee>): Promise<Fee | null> => {
        try {
            const { data, error: updateError } = await supabase
                .from('student_fees')
                .update({
                    student_id: updates.studentId,
                    total_fee: updates.amount,
                    paid_amount: updates.paidAmount,
                    due_date: updates.dueDate,
                    status: updates.status,
                    title: updates.title
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return transformSupabaseFee(data);
        } catch (err) {
            console.error('Error updating fee:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteFee = async (id: string | number): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('student_fees')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

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

const transformSupabaseFee = (f: any): Fee => ({
    id: f.id,
    studentId: f.student_id,
    amount: f.total_fee,
    paidAmount: f.paid_amount,
    dueDate: f.due_date,
    status: f.status,
    title: f.title || 'School Fee'
});
