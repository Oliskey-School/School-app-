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
        __AUDIT_MODE__: boolean;
        STUDENT_NAVIGATE: (view: string, title: string, props: any) => void;
        STUDENT_COMPONENTS: string[];
        TEACHER_NAVIGATE: (view: string, title: string, props: any) => void;
        TEACHER_COMPONENTS: string[];
        ADMIN_NAVIGATE: (view: string, title: string, props: any) => void;
        ADMIN_COMPONENTS: string[];
        PARENT_NAVIGATE: (view: string, title: string, props: any) => void;
        PARENT_COMPONENTS: string[];
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
        readonly VITE_GEMINI_API_KEY: string;
    }
}
