import { supabase } from '../config/supabase';

export class TransactionService {
    static async getTransactions(schoolId: string, feeId?: string) {
        let query = supabase
            .from('payments')
            .select('*')
            .eq('school_id', schoolId);

        if (feeId) {
            query = query.eq('metadata->>fee_id', feeId).eq('status', 'success');
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // Map database snake_case to frontend camelCase
        return (data || []).map(t => ({
            id: t.id,
            schoolId: t.school_id,
            amount: t.amount,
            currency: t.currency,
            reference: t.reference,
            status: t.status,
            provider: t.provider,
            purpose: t.purpose,
            metadata: t.metadata,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));
    }

    static async createTransaction(schoolId: string, data: any) {
        const dbData = {
            school_id: schoolId,
            amount: data.amount,
            currency: data.currency || 'NGN',
            reference: data.reference,
            status: data.status || 'pending',
            provider: data.provider,
            purpose: data.purpose,
            metadata: data.metadata || {}
        };

        const { data: transaction, error } = await supabase
            .from('payments')
            .insert([dbData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: transaction.id,
            schoolId: transaction.school_id,
            amount: transaction.amount,
            currency: transaction.currency,
            reference: transaction.reference,
            status: transaction.status,
            provider: transaction.provider,
            purpose: transaction.purpose,
            metadata: transaction.metadata,
            createdAt: transaction.created_at,
            updatedAt: transaction.updated_at
        };
    }
}
