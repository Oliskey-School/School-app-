export { };

declare global {
    interface Window {
        PaystackPop: {
            setup: (options: any) => {
                openIframe: () => void;
            };
        };
        google: any;
        FlutterwaveCheckout: (options: any) => void;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }

    interface ImportMetaEnv {
        readonly VITE_API_URL: string;
        readonly VITE_SUPABASE_URL: string;
        readonly VITE_SUPABASE_ANON_KEY: string;
        readonly VITE_PAYSTACK_PUBLIC_KEY: string;
        readonly VITE_FLUTTERWAVE_PUBLIC_KEY: string;
        readonly VITE_FIREBASE_VAPID_KEY: string;
    }
}
