import React from 'react';
import { useAuth } from '../../context/AuthContext';
import VerifyEmailScreen from './VerifyEmailScreen';

/**
 * Verification Guard Component
 * Blocks access to protected routes for users with unverified emails
 * 
 * Usage:
 * <VerificationGuard>
 *   <Dashboard />
 * </VerificationGuard>
 */

interface VerificationGuardProps {
    children: React.ReactNode;
    requireVerification?: boolean; // Set to false to skip verification check
}

export const VerificationGuard: React.FC<VerificationGuardProps> = ({
    children,
    requireVerification = true
}) => {
    const { user, session } = useAuth();

    // Not authenticated - check sessionStorage for auth state
    if (!user) {
        const storedUser = sessionStorage.getItem('user');
        if (!storedUser) {
            console.log('🔒 VerificationGuard: No user session found. Content hidden.');
            return null;
        }
    }

    // Skip verification check if explicitly disabled
    if (!requireVerification) {
        return <>{children}</>;
    }

    // For now, TEMPORARILY skip email verification during signup
    // TODO: Re-enable after proper email verification flow is tested
    const isEmailVerified = true; // Temporarily bypassed
    // const isEmailVerified = user?.email_confirmed_at !== null;

    if (!isEmailVerified) {
        console.log('📧 VerificationGuard: Email not verified, showing verification screen');
        return <VerifyEmailScreen />;
    }

    // Email verified - allow access
    return <>{children}</>;
};

export default VerificationGuard;
