import api from '../lib/api';

interface PaymentInitialization {
    email: string;
    amount: number;
    metadata?: any;
    reference?: string;
}

/**
 * PaymentService handles interactions with Payment Gateways (e.g., Paystack).
 */
export const PaymentService = {

    /**
     * Initialize a transaction
     */
    initializeTransaction: async ({ email, amount, metadata }: PaymentInitialization) => {
        const reference = `SCH_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        return {
            reference,
            publicKey: (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || '',
        };
    },

    /**
     * Verify transaction and update subscription status
     */
    verifyTransaction: async ({ reference, gateway = 'paystack' }: { reference: string, gateway?: string }) => {
        try {
            const result = await (api as any).fetch(`/transactions/verify/${reference}?gateway=${gateway}`);
            return { success: true, data: result };
        } catch (error: any) {
            console.error('Verification error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Record a successful subscription payment
     */
    recordSubscriptionPayment: async (schoolId: string, amount: number, reference: string, planType: string) => {
        try {
            // Call the new subscription payment endpoint
            return await (api as any).post('/plans/subscribe', {
                schoolId,
                amount,
                reference,
                planType
            });
        } catch (error: any) {
            console.error('Error recording subscription:', error);
            throw error;
        }
    }
};

export default PaymentService;
