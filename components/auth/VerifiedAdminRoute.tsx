
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface VerifiedAdminRouteProps {
    children: React.ReactNode;
}

const VerifiedAdminRoute: React.FC<VerifiedAdminRouteProps> = ({ children }) => {
    const { user, role, loading } = useAuth();
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    useEffect(() => {
        const checkVerification = async () => {
            if (!user) {
                setIsVerified(false);
                return;
            }

            // 1. Check if email is confirmed in Auth Metadata
            const emailConfirmed = user.email_confirmed_at || user.confirmed_at;

            // Allow demo accounts to bypass verification
            const isDemo = user.email?.includes('demo') || user.user_metadata?.is_demo;

            if (role === 'admin' && !emailConfirmed && !isDemo) {
                // Double check if metadata is stale by re-fetching user
                const { data: { user: freshlyFetchedUser } } = await supabase.auth.getUser();
                if (freshlyFetchedUser?.email_confirmed_at) {
                    setIsVerified(true);
                } else {
                    setIsVerified(false);
                }
            } else {
                setIsVerified(true);
            }
        };

        if (!loading) {
            checkVerification();
        }
    }, [user, role, loading]);

    if (loading || isVerified === null) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Verifying credentials...</p>
                </div>
            </div>
        );
    }

    if (!isVerified) {
        // Redirect to Verify Email page if not verified
        // We use window.location.hash because we might be in a HashRouter
        window.location.hash = '#/auth/verify-email';
        return null;
    }

    return <>{children}</>;
};

export default VerifiedAdminRoute;
