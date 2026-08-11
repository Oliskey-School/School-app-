
import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Fee } from '../../types';
import { recordParentGatewayPayment } from '../../lib/payments';

interface PaystackButtonProps {
    fee: Fee;
    email: string;
    onSuccess?: () => void;
    onClose?: () => void;
    schoolId?: string;
    branchId?: string | null;
}

export const PaystackButton: React.FC<PaystackButtonProps> = ({ fee, email, onSuccess, onClose, schoolId, branchId }) => {
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
        // The Paystack SDK reporting "success" only means the popup closed
        // without error — it does not mean money changed hands. Re-verify the
        // reference against Paystack's own API server-side and only then
        // record the payment, so a fee can never be marked paid on a
        // client-supplied claim alone.
        try {
            const toast = (await import('react-hot-toast')).toast;
            const result = await recordParentGatewayPayment(fee.id, fee.studentId, reference.reference, 'paystack', branchId);
            if (!result.success) {
                toast.error(result.message || 'Payment could not be verified. Please contact support with your reference: ' + reference.reference);
                return;
            }

            // Send payment confirmation notification
            try {
                const { sendPaymentConfirmation } = await import('../../lib/payment-notifications');
                await sendPaymentConfirmation({ reference: reference.reference });
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
        // Note: no pending transaction record is pre-created here — parents
        // don't have permission to write fee/payment records directly (only
        // admins do). The payment is recorded only after the gateway confirms
        // success, via recordParentGatewayPayment() in handlePaystackSuccessAction,
        // which independently re-verifies the charge server-side.

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
