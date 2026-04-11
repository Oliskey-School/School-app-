import prisma from '../config/database';
import axios from 'axios';
import { SocketService } from './socket.service';

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
                    amount = response.data.data.amount / 100;
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
                const existingPayment = await prisma.payment.findUnique({
                    where: { reference }
                });

                if (existingPayment) {
                    const updated = await prisma.payment.update({
                        where: { id: existingPayment.id },
                        data: { status: 'success', amount }
                    });
                    SocketService.emitToSchool(schoolId, 'finance:updated', { action: 'verify_payment', paymentId: updated.id });
                    return updated;
                } else {
                    const inserted = await prisma.payment.create({
                        data: {
                            school_id: schoolId,
                            branch_id: branchId && branchId !== 'all' ? branchId : null,
                            reference,
                            amount,
                            status: 'success',
                            purpose: 'fee_payment'
                        }
                    });
                    SocketService.emitToSchool(schoolId, 'finance:updated', { action: 'create_payment', paymentId: inserted.id });
                    return inserted;
                }
            } else {
                throw new Error('Payment verification failed at gateway');
            }
        } catch (error: any) {
            console.error('Payment Verification Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || 'Verification failed');
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
        const transaction = await prisma.payment.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : (data.branch_id || null),
                amount: data.amount,
                reference: data.reference,
                status: data.status || 'pending',
                purpose: data.purpose,
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
