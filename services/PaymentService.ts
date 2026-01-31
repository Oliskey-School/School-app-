import { supabase } from '../lib/supabase';

interface PaymentInitialization {
    email: string;
    amount: number;
    metadata?: any;
    reference?: string;
}

interface PaymentVerification {
    reference: string;
}

/**
 * PaymentService handles interactions with Payment Gateways (e.g., Paystack).
 * Note: specific SDKs (like react-paystack) might be used in the UI components,
 * but this service handles business logic and database updates.
 */
export const PaymentService = {

    /**
     * Initialize a transaction (Client-side generation of ref usually sufficient for Paystack)
     */
    initializeTransaction: async ({ email, amount, metadata }: PaymentInitialization) => {
        // In a real backend, we might call the Paystack API here to get an authorization URL.
        // For client-side integration (Popup), we mostly need a unique reference.
        const reference = `SCH_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        return {
            reference,
            publicKey: process.env.NEXT_PUBLIC_PAYSTACK_KEY || '', // Ensure this env var is set
        };
    },

    /**
     * Verify transaction and update subscription status
     */
    verifyTransaction: async ({ reference }: PaymentVerification) => {
        try {
            // 1. In a production app, verify with Paystack API via a secure backend function.
            // For this implementation, we will trust the client-side success callback but validate duplicates.

            // Check if reference already used
            const { data: existing } = await supabase
                .from('payments')
                .select('id')
                .eq('reference', reference)
                .maybeSingle();

            if (existing) {
                throw new Error('Transaction reference already processed');
            }

            return { success: true };
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
            // 1. Record the payment
            const { error: payError } = await supabase
                .from('payments')
                .insert({
                    school_id: schoolId,
                    amount,
                    reference,
                    status: 'success',
                    provider: 'paystack',
                    purpose: 'subscription_upgrade',
                    metadata: { plan: planType }
                });

            if (payError) throw payError;

            // 2. Update School Subscription Status
            const { error: schoolError } = await supabase
                .from('schools')
                .update({
                    is_premium: true,
                    plan_type: planType, // 'premium', etc.
                    subscription_status: 'active'
                })
                .eq('id', schoolId);

            if (schoolError) throw schoolError;

            return { success: true };
        } catch (error: any) {
            console.error('Error recording subscription:', error);
            throw error;
        }
    }
};
