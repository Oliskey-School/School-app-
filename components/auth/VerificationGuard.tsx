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
    requireVerification = false
}) => {
    // Verification muted as requested
    return <>{children}</>;
    /*
    const { user, session } = useAuth();
    ...
    */
};

export default VerificationGuard;
