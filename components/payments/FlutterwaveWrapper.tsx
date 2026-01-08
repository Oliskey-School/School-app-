/**
 * Flutterwave Payment Wrapper Component
 * Uses Flutterwave Inline SDK (no npm package required)
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Fee } from '../../types';
import { initializeTransaction, verifyTransaction } from '../../lib/payments';
import { supabase } from '../../lib/supabase';

interface FlutterwaveWrapperProps {
    fee: Fee;
    email: string;
    phone: string;
    name: string;
    onSuccess?: () => void;
    onClose?: () => void;
}

// Declare FlutterwaveCheckout type for TypeScript
declare global {
    interface Window {
        FlutterwaveCheckout: any;
    }
}

export const FlutterwaveWrapper: React.FC<FlutterwaveWrapperProps> = ({
    fee,
    email,
    phone,
    name,
    onSuccess,
    onClose
}) => {
    const [loading, setLoading] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    // Load Flutterwave SDK script
    useEffect(() => {
        const existingScript = document.getElementById('flutterwaveCheckout');

        if (!existingScript) {
            const script = document.createElement('script');
            script.src = 'https://checkout.flutterwave.com/v3.js';
            script.id = 'flutterwaveCheckout';
            script.async = true;
            script.onload = () => setScriptLoaded(true);
            document.body.appendChild(script);
        } else {
            setScriptLoaded(true);
        }
    }, []);

    const handlePaymentClick = async () => {
        if (!scriptLoaded || !window.FlutterwaveCheckout) {
            toast('Payment system is loading. Please try again in a moment.');
            return;
        }

        // Validate required customer data
        if (!email || email.trim() === '') {
            toast.error('Email is required for payment. Please update your profile.');
            return;
        }

        setLoading(true);

        // Get Flutterwave public key from environment
        const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;

        // Check if public key is configured
        if (!publicKey || publicKey === '' || publicKey === 'your_flutterwave_public_key_here') {
            setLoading(false);
            toast.error('Payment gateway not configured. Please contact administrator.');
            console.error('Flutterwave public key not configured in environment variables');
            return;
        }

        const txRef = `FLW-${Date.now()}-${fee.id}`;

        try {
            // Create pending transaction
            await initializeTransaction(
                fee.id,
                fee.studentId,
                fee.amount,
                txRef,
                'Flutterwave'
            );

            // Initialize Flutterwave payment with validated data
            window.FlutterwaveCheckout({
                public_key: publicKey,
                tx_ref: txRef,
                amount: fee.amount,
                currency: 'NGN',
                payment_options: 'card,mobilemoney,ussd,banktransfer',
                customer: {
                    email: email.trim(),
                    phone_number: phone || '0000000000',
                    name: name || 'Parent',
                },
                customizations: {
                    title: 'School Fee Payment',
                    description: fee.title,
                    logo: 'https://your-school-logo.png', // Replace with your logo
                },
                callback: async (response: any) => {
                    console.log('Flutterwave response:', response);

                    if (response.status === 'successful' || response.status === 'completed') {
                        try {
                            // Verify transaction
                            await verifyTransaction(txRef);

                            // Send payment confirmation
                            const { data: transaction } = await supabase
                                .from('transactions')
                                .select('id')
                                .eq('reference', txRef)
                                .single();

                            if (transaction?.id) {
                                const { sendPaymentConfirmation } = await import('../../lib/payment-notifications');
                                await sendPaymentConfirmation({ transactionId: transaction.id });
                            }

                            toast.success('Payment successful!');
                            if (onSuccess) onSuccess();
                        } catch (error) {
                            console.error('Error processing payment:', error);
                            toast.error('Payment completed but verification failed. Please contact support.');
                        }
                    } else {
                        toast.error('Payment was not completed. Please try again.');
                    }

                    setLoading(false);
                },
                onclose: () => {
                    console.log('Payment modal closed');
                    if (onClose) onClose();
                    setLoading(false);
                },
            });
        } catch (error) {
            console.error('Flutterwave initialization error:', error);
            setLoading(false);
            toast.error('Failed to initialize payment. Please try again or contact support.');
        }
    };

    return (
        <button
            onClick={handlePaymentClick}
            disabled={loading || !scriptLoaded}
            className="hidden"
            id={`flutterwave-btn-${fee.id}`}
        >
            {loading ? 'Processing...' : 'Pay with Flutterwave'}
        </button>
    );
};
