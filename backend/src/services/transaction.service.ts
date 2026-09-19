import prisma from '../config/database';
import axios from 'axios';
import { SocketService } from './socket.service';

export interface VerifiedGatewayPayment {
    reference: string;
    gateway: string;
    amount: number;      // major units (naira)
    currency: string;
    paid_at: string | null;
    metadata: any;
}

export class TransactionService {
    /**
     * Ask the gateway whether `reference` is a successful transaction and
     * return what it says. This method PERSISTS NOTHING: tying a verified
     * payment to a fee (and refusing a reference that was already used) is
     * the caller's job — see ParentService.recordPayment.
     *
     * ROOT CAUSE this replaces: it used to create/update a Payment row on
     * every successful verification, and the parent flow then recorded the
     * same payment again against the fee — two rows per real payment, and a
     * reference could be replayed without limit.
     */
    static async verifyPayment(reference: string, gateway: string): Promise<VerifiedGatewayPayment> {
        const ref = String(reference || '').trim();
        if (!ref) throw Object.assign(new Error('Payment reference is required'), { status: 400 });
        try {
            if (gateway === 'paystack') {
                const secret = process.env.PAYSTACK_SECRET_KEY;
                if (!secret) throw Object.assign(new Error('Paystack is not configured on the server'), { status: 503 });
                const response = await axios.get(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
                    headers: { Authorization: `Bearer ${secret}` }
                });
                const d = response.data?.data;
                if (response.data?.status === true && d?.status === 'success') {
                    return { reference: ref, gateway, amount: d.amount / 100, currency: d.currency || 'NGN', paid_at: d.paid_at || null, metadata: d.metadata ?? null };
                }
            } else if (gateway === 'flutterwave') {
                const secret = process.env.FLUTTERWAVE_SECRET_KEY;
                if (!secret) throw Object.assign(new Error('Flutterwave is not configured on the server'), { status: 503 });
                const response = await axios.get(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(ref)}`, {
                    headers: { Authorization: `Bearer ${secret}` }
                });
                const d = response.data?.data;
                if (response.data?.status === 'success' && d?.status === 'successful') {
                    return { reference: ref, gateway, amount: Number(d.amount), currency: d.currency || 'NGN', paid_at: d.created_at || null, metadata: d.meta ?? null };
                }
            } else {
                throw Object.assign(new Error('Unsupported payment gateway'), { status: 400 });
            }
            throw Object.assign(new Error('Payment verification failed at gateway'), { status: 402 });
        } catch (error: any) {
            if (error.status) throw error;
            console.error('Payment Verification Error:', error.response?.data || error.message);
            throw Object.assign(new Error(error.response?.data?.message || 'Verification failed'), { status: 402 });
        }
    }

    static async getTransactions(schoolId: string, branchId: string | undefined, feeId?: string) {
        const transactions = await prisma.payment.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : undefined,
                status: feeId ? 'success' : undefined
            },
            orderBy: { created_at: 'desc' }
        });

        return transactions.map(t => ({
            id: t.id,
            schoolId: t.school_id,
            amount: t.amount,
            reference: t.reference,
            status: t.status,
            purpose: t.purpose,
            metadata: t.metadata,
            createdAt: t.created_at,
            updatedAt: t.updated_at
        }));
    }

    static async createTransaction(schoolId: string, branchId: string | undefined, data: any) {
        const transaction = await (prisma.payment.create as any)({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : (data.branch_id || null),
                amount: data.amount,
                reference: data.reference,
                status: data.status || 'pending',
                purpose: data.purpose,
                payment_method: data.payment_method || 'manual',
                metadata: data.metadata || {}
            }
        });

        SocketService.emitToSchool(schoolId, 'finance:updated', { action: 'create_transaction', transactionId: transaction.id });

        return {
            id: transaction.id,
            schoolId: transaction.school_id,
            amount: transaction.amount,
            reference: transaction.reference,
            status: transaction.status,
            purpose: transaction.purpose,
            metadata: transaction.metadata,
            createdAt: transaction.created_at,
            updatedAt: transaction.updated_at
        };
    }
}
