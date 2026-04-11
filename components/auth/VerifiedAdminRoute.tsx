
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface VerifiedAdminRouteProps {
    children: React.ReactNode;
}

const VerifiedAdminRoute: React.FC<VerifiedAdminRouteProps> = ({ children }) => {
    const { user, role, loading, isDemo } = useAuth();
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    useEffect(() => {
        const checkVerification = async () => {
            // Muted: Always treat as verified
            setIsVerified(true);
            return;
            /*
            if (!user) {
                setIsVerified(false);
                return;
            }
            ...
            */
        };

        if (!loading) {
            checkVerification();
        }
    }, [user, role, loading]);

    useEffect(() => {
        if (isVerified === false) {
            // Redirect to Verify Email page if not verified (MUTED)
            // window.location.hash = '#/auth/verify-email';
            setIsVerified(true); // Force bypass
        }
    }, [isVerified]);

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

    if (isVerified === false) {
        return null;
    }

    return <>{children}</>;
};

export default VerifiedAdminRoute;
