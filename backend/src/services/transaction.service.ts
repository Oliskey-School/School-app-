import { supabase } from '../config/supabase';
import axios from 'axios';

export class TransactionService {
    static async verifyPayment(schoolId: string, branchId: string | undefined, reference: string, gateway: string) {
        try {
            let isValid = false;
            let amount = 0;

            if (gateway === 'paystack') {
                const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY || 'sk_test_dummy'}`
                    }
                });
                if (response.data.status === true && response.data.data.status === 'success') {
                    isValid = true;
                    amount = response.data.data.amount / 100; // Paystack returns in kobo
                }
            } else if (gateway === 'flutterwave') {
                const response = await axios.get(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY || 'sk_test_dummy'}`
                    }
                });
                if (response.data.status === 'success' && response.data.data.status === 'successful') {
                    isValid = true;
                    amount = response.data.data.amount;
                }
            }

            if (isValid) {
                // Update or Create the transaction in our DB
                const { data: updated, error } = await supabase
                    .from('payments')
                    .update({ status: 'success', amount: amount })
                    .eq('reference', reference)
                    .eq('school_id', schoolId);

                if (branchId && branchId !== 'all') {
                    (updated as any).eq('branch_id', branchId);
                }

                const { data: finalData, error: finalError } = await (updated as any).select().single();

                if (finalError) {
                    const { data: inserted, error: insError } = await supabase
                        .from('payments')
                        .insert({
                            school_id: schoolId,
                            branch_id: branchId,
                            reference: reference,
                            amount: amount,
                            status: 'success',
                            provider: gateway,
                            purpose: 'fee_payment'
                        })
                        .select()
                        .single();

                    if (insError) throw new Error(insError.message);
                    return inserted;
                }
                return finalData;
            } else {
                throw new Error('Payment verification failed at gateway');
            }
        } catch (error: any) {
            console.error('Payment Verification Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Verification failed');
        }
    }

    static async getTransactions(schoolId: string, branchId: string | undefined, feeId?: string) {
        let query = supabase
            .from('payments')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

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

    static async createTransaction(schoolId: string, branchId: string | undefined, data: any) {
        const dbData = {
            school_id: schoolId,
            branch_id: branchId || data.branch_id,
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
