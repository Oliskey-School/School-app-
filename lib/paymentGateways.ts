/**
 * Payment Gateway Integration Utility
 * Handles initialization and verification for Paystack and Flutterwave.
 * Requires VITE_PAYSTACK_PUBLIC_KEY and VITE_FLUTTERWAVE_PUBLIC_KEY.
 */


interface PaymentConfig {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    metadata?: any;
    callback_url?: string;
    onSuccess?: (response?: any) => void;
    onClose?: () => void;
    // Extra fields for Flutterwave/Paystack specifics if needed
    customer?: {
        name?: string;
        phonenumber?: string;
        email?: string;
    };
    customizations?: {
        title?: string;
        description?: string;
        logo?: string;
    };
    // Step 2 Additions:
    subaccount?: string; // For Paystack split payments
    split_group?: string; // For Flutterwave split payments
    is_bnpl?: boolean; // Enable Buy Now Pay Later installments
    student_code?: string; // For USSD referencing
}

// Helper to load scripts dynamically
const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
};

export const initializePaystackPayment = async (config: PaymentConfig) => {
    try {
        if (!window.PaystackPop) {
            await loadScript('https://js.paystack.co/v1/inline.js');
        }

        const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

        if (!publicKey) {
            throw new Error('Paystack public key is missing');
        }

        // @ts-ignore
        const handler = window.PaystackPop.setup({
            key: publicKey,
            email: config.email,
            amount: Math.round(config.amount * 100), // Paystack takes amount in kobo/cents
            currency: config.currency,
            ref: config.reference,
            subaccount: config.subaccount, // SPLIT PAYMENTS SUPPORT
            metadata: {
                ...config.metadata,
                is_bnpl: config.is_bnpl,
                student_code: config.student_code,
                custom_fields: [
                    {
                        display_name: "Student Code",
                        variable_name: "student_code",
                        value: config.student_code
                    }
                ]
            },
            callback: (response: any) => {
                if (config.onSuccess) {
                    config.onSuccess(response);
                } else if (config.callback_url) {
                    window.location.href = `${config.callback_url}?reference=${response.reference}&gateway=paystack`;
                }
            },
            onClose: () => {
                if (config.onClose) {
                    config.onClose();
                } else {
                    console.log('Payment modal closed');
                }
            }
        });

        handler.openIframe();
    } catch (error) {
        console.error("Paystack Init Error:", error);
        alert("Failed to load Paystack. Please check your internet connection.");
    }
};

export const initializeFlutterwavePayment = async (config: PaymentConfig) => {
    try {
        if (!window.FlutterwaveCheckout) {
            await loadScript('https://checkout.flutterwave.com/v3.js');
        }

        const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;

        if (!publicKey) {
            throw new Error('Flutterwave public key is missing');
        }

        // @ts-ignore
        window.FlutterwaveCheckout({
            public_key: publicKey,
            tx_ref: config.reference,
            amount: config.amount,
            currency: config.currency,
            payment_options: config.is_bnpl ? "card, account, ussd, barter" : "card, account, ussd, qr",
            redirect_url: config.callback_url, // Flutterwave handles redirect automatically if provided
            subaccounts: config.split_group ? [{ id: config.split_group }] : undefined, // SPLIT PAYMENTS
            meta: {
                ...config.metadata,
                student_code: config.student_code,
                moniepoint_ussd: `*5573*1*${config.student_code}#` // USSD REFERENCING
            },
            customer: config.customer || {
                email: config.email,
            },
            customizations: config.customizations || {
                title: "School Management System",
                description: config.is_bnpl ? "Buy Now Pay Later Installment" : "School Fee Payment",
                logo: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
            },
            callback: (data: any) => {
                if (config.onSuccess) {
                    config.onSuccess(data);
                }
            },
            onclose: () => {
                if (config.onClose) {
                    config.onClose();
                }
            }
        });
    } catch (error) {
        console.error("Flutterwave Init Error:", error);
        alert("Failed to load Flutterwave. Please check your internet connection.");
    }
};

/**
 * Verification helpers (simulated for client-side)
 * In production, these should be verified on the server via webhook.
 */
export const verifyPayment = async (reference: string, gateway: 'paystack' | 'flutterwave') => {
    // In a real app, you would call your Edge Function here to verify with the gateway API
    // and then update the 'payments' table in Supabase.

    console.log(`Verifying ${gateway} payment with reference: ${reference}`);

    // Simulate API call
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ status: 'success', reference });
        }, 1500);
    });
};
