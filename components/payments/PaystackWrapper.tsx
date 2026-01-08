
import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Fee } from '../../types';
import { initializeTransaction, verifyTransaction } from '../../lib/payments';
import { supabase } from '../../lib/supabase';

interface PaystackButtonProps {
    fee: Fee;
    email: string;
    onSuccess?: () => void;
    onClose?: () => void;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({ fee, email, onSuccess, onClose }) => {
    const [loading, setLoading] = useState(false);

    // Get Paystack public key from environment
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

    // Check if public key is configured
    const isConfigured = publicKey && publicKey !== '' && publicKey !== 'pk_test_placeholder' && publicKey !== 'your_paystack_public_key_here';

    // Check if email is valid
    const hasValidEmail = email && email.trim() !== '';

    const amountInKobo = fee.amount * 100; // Paystack takes amount in kobo

    const config = {
        reference: `TX-${Date.now()}-${fee.id}`,
        email: email || 'noemail@example.com',
        amount: amountInKobo,
        publicKey: publicKey || '',
        metadata: {
            custom_fields: [
                { display_name: "Fee Title", variable_name: "fee_title", value: fee.title },
                { display_name: "Student ID", variable_name: "student_id", value: fee.studentId.toString() }
            ]
        }
    };

    const handlePaystackSuccessAction = async (reference: any) => {
        // Implementation for whatever you want to do with reference and after success call.
        try {
            await verifyTransaction(reference.reference);

            // Send payment confirmation notification
            try {
                // Fetch the transaction that was just verified
                const { data: transaction } = await supabase
                    .from('transactions')
                    .select('id')
                    .eq('reference', reference.reference)
                    .single();

                if (transaction?.id) {
                    const { sendPaymentConfirmation } = await import('../../lib/payment-notifications');
                    await sendPaymentConfirmation({ transactionId: transaction.id });
                }
            } catch (notifError) {
                console.error('Error sending payment notification:', notifError);
                // Don't fail the payment if notification fails
            }

            if (onSuccess) onSuccess();
        } catch (e) {
            console.error("Verification failed", e);
        }
    };

    const handlePaystackCloseAction = () => {
        // implementation for  whatever you want to do when the Paystack dialog closed.
        console.log('closed');
        if (onClose) onClose();
    };

    const componentProps = {
        ...config,
        text: 'Pay Now',
        onSuccess: (reference: any) => handlePaystackSuccessAction(reference),
        onClose: handlePaystackCloseAction,
    };

    // Logic to initialize before opening modal
    const handlePaymentClick = async () => {
        // Validate configuration before attempting payment
        if (!isConfigured) {
            const toast = (await import('react-hot-toast')).toast;
            toast.error('Paystack payment gateway not configured. Please contact administrator.');
            console.error('Paystack public key not configured in environment variables');
            return;
        }

        if (!hasValidEmail) {
            const toast = (await import('react-hot-toast')).toast;
            toast.error('Email is required for payment. Please update your profile.');
            return;
        }

        setLoading(true);
        // Create Pending Transaction in DB
        await initializeTransaction(fee.id, fee.studentId, fee.amount, config.reference, 'Paystack');

        // We can't actually trigger the Hook manually nicely here without using the hook at top level
        // So usually we just let the hook handle the click.
        setLoading(false);
    };

    // Since usePaystackPayment returns a function found in the hook
    const initializePayment = usePaystackPayment(config);

    return (
        <button
            onClick={() => {
                handlePaymentClick().then(() => {
                    (initializePayment as any)(handlePaystackSuccessAction, handlePaystackCloseAction);
                });
            }}
            disabled={loading}
            className="hidden" // This is a logic wrapper, actual button is in FeeCard. But wait, we need to expose this.
            id={`paystack-btn-${fee.id}`}
        >
            Pay
        </button>
    );
};

// NOTE: In a real app, you'd likely use the hook directly in the parent or wrap this differently.
// For now, I'll document that we need 'react-paystack' installed.
