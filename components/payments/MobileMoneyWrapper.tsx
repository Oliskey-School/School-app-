/**
 * Mobile Money Payment Wrapper
 * Supports M-Pesa, MTN Mobile Money, and Airtel Money via Paystack
 */

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Fee } from '../../types';
import { initializeTransaction, verifyTransaction } from '../../lib/payments';
import { supabase } from '../../lib/supabase';

interface MobileMoneyWrapperProps {
    fee: Fee;
    email: string;
    name: string;
    onSuccess?: () => void;
    onClose?: () => void;
}

type MobileMoneyProvider = 'mpesa' | 'mtn' | 'airtel';

export const MobileMoneyWrapper: React.FC<MobileMoneyWrapperProps> = ({
    fee,
    email,
    name,
    onSuccess,
    onClose
}) => {
    const [provider, setProvider] = useState<MobileMoneyProvider>('mpesa');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder';

    const getProviderCode = (provider: MobileMoneyProvider): string => {
        switch (provider) {
            case 'mpesa':
                return 'mpesa'; // Kenya
            case 'mtn':
                return 'mtn'; // Ghana, Uganda, etc.
            case 'airtel':
                return 'ATM'; // Airtel Money
            default:
                return 'mpesa';
        }
    };

    const handlePayment = async () => {
        if (!phoneNumber) {
            toast.error('Please enter your mobile money number');
            return;
        }

        setLoading(true);

        try {
            const reference = `MM-${Date.now()}-${fee.id}`;

            // Create pending transaction
            await initializeTransaction(
                fee.id,
                fee.studentId,
                fee.amount,
                reference,
                'Mobile Money'
            );

            // Initialize Paystack Mobile Money payment
            const response = await fetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${publicKey.replace('pk_', 'sk_')}`, // Note: This should use secret key
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    amount: fee.amount * 100, // Convert to kobo
                    currency: 'NGN',
                    reference: reference,
                    mobile_money: {
                        phone: phoneNumber,
                        provider: getProviderCode(provider)
                    },
                    metadata: {
                        fee_id: fee.id,
                        student_id: fee.studentId,
                        fee_title: fee.title,
                        custom_fields: [
                            { display_name: 'Fee Title', variable_name: 'fee_title', value: fee.title },
                            { display_name: 'Student ID', variable_name: 'student_id', value: fee.studentId.toString() }
                        ]
                    }
                })
            });

            const data = await response.json();

            if (data.status && data.data) {
                // Show USSD prompt or payment instructions
                // Show USSD prompt or payment instructions
                toast.success(
                    `Payment initiated! Check your phone for a prompt from ${provider.toUpperCase()}.`,
                    { duration: 6000 }
                );

                // Poll for payment status
                pollPaymentStatus(reference);
            } else {
                throw new Error(data.message || 'Failed to initialize payment');
            }
        } catch (error) {
            console.error('Mobile money payment error:', error);
            toast.error('Failed to initialize mobile money payment. Please try again.');
            setLoading(false);
        }
    };

    const pollPaymentStatus = async (reference: string) => {
        let attempts = 0;
        const maxAttempts = 60; // Poll for up to 5 minutes

        const interval = setInterval(async () => {
            attempts++;

            try {
                const result = await verifyTransaction(reference);

                if (result.success) {
                    clearInterval(interval);
                    setLoading(false);

                    // Send payment confirmation
                    try {
                        const { data: transaction } = await supabase
                            .from('transactions')
                            .select('id')
                            .eq('reference', reference)
                            .single();

                        if (transaction?.id) {
                            const { sendPaymentConfirmation } = await import('../../lib/payment-notifications');
                            await sendPaymentConfirmation({ transactionId: transaction.id });
                        }
                    } catch (notifError) {
                        console.error('Error sending payment notification:', notifError);
                    }

                    if (onSuccess) onSuccess();
                }
            } catch (error) {
                console.error('Polling error:', error);
            }

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                setLoading(false);
                toast.error('Payment verification timed out. Please check your transaction history.');
            }
        }, 5000); // Poll every 5 seconds
    };

    const getProviderInfo = (provider: MobileMoneyProvider) => {
        switch (provider) {
            case 'mpesa':
                return { name: 'M-Pesa', color: 'green', countries: 'Kenya, Tanzania' };
            case 'mtn':
                return { name: 'MTN Mobile Money', color: 'yellow', countries: 'Ghana, Uganda, Nigeria' };
            case 'airtel':
                return { name: 'Airtel Money', color: 'red', countries: 'Kenya, Uganda, Nigeria' };
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="hidden"
                id={`mobilemoney-btn-${fee.id}`}
            >
                Pay with Mobile Money
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Mobile Money Payment</h2>

                        {/* Amount */}
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-indigo-700 mb-1">Payment Amount</p>
                            <p className="text-3xl font-bold text-indigo-900">
                                {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(fee.amount)}
                            </p>
                        </div>

                        {/* Provider Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Provider
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['mpesa', 'mtn', 'airtel'] as MobileMoneyProvider[]).map((p) => {
                                    const info = getProviderInfo(p);
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setProvider(p)}
                                            className={`px-3 py-3 rounded-lg border-2 font-medium transition ${provider === p
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                                }`}
                                        >
                                            <div className="text-xs">{info.name}</div>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Available in: {getProviderInfo(provider).countries}
                            </p>
                        </div>

                        {/* Phone Number */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Mobile Money Number
                            </label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="e.g., 0712345678"
                                className="w-full border border-gray-300 rounded-lg px-4 py-3"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Enter the number registered with {getProviderInfo(provider).name}
                            </p>
                        </div>

                        {/* Info */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                            <p className="text-sm text-blue-800">
                                You'll receive a payment prompt on your phone. Complete the transaction to proceed.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    if (onClose) onClose();
                                }}
                                disabled={loading}
                                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePayment}
                                disabled={loading || !phoneNumber}
                                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                            >
                                {loading ? 'Processing...' : 'Pay Now'}
                            </button>
                        </div>

                        {loading && (
                            <div className="mt-4 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                <p className="text-sm text-gray-600 mt-2">
                                    Waiting for payment confirmation...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};
