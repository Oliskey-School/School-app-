/**
 * SMS and Phone Verification Service
 * Supports Africa's Talking and Twilio for Nigerian schools
 */

import { api } from './api';

// Africa's Talking configuration (preferred for Nigeria)
const AT_API_KEY = (import.meta.env as any).VITE_AFRICASTALKING_API_KEY;
const AT_USERNAME = (import.meta.env as any).VITE_AFRICASTALKING_USERNAME;

// Twilio configuration (fallback)
const TWILIO_ACCOUNT_SID = (import.meta.env as any).VITE_TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = (import.meta.env as any).VITE_TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = (import.meta.env as any).VITE_TWILIO_PHONE_NUMBER;

export interface PhoneVerificationResult {
    success: boolean;
    message: string;
    expiresAt?: string;
}

/**
 * Send OTP code via SMS using Backend Endpoint
 * This calls our custom backend which securely handles the SMS provider APIs
 */
export async function sendOTPCode(
    phone: string,
    purpose: 'phone_verification' | 'password_reset' | 'login' = 'phone_verification'
): Promise<PhoneVerificationResult> {
    try {
        // Validate phone number format
        const cleanPhone = cleanPhoneNumber(phone);
        if (!isValidNigerianPhone(cleanPhone)) {
            return {
                success: false,
                message: 'Invalid Nigerian phone number format. Use format: +234XXXXXXXXXX'
            };
        }

        // Call Backend to send OTP
        const { data, error } = await api.functions.invoke('send-otp', {
            body: {
                phone: cleanPhone,
                purpose
            }
        });

        if (error) {
            console.error('OTP send error:', error);
            return {
                success: false,
                message: error.message || 'Failed to send OTP'
            };
        }

        return {
            success: true,
            message: `Verification code sent to ${maskPhoneNumber(cleanPhone)}`,
            expiresAt: data?.expiresAt
        };
    } catch (error) {
        console.error('Send OTP error:', error);
        return {
            success: false,
            message: 'An error occurred while sending verification code'
        };
    }
}

/**
 * Verify OTP code
 */
export async function verifyOTPCode(
    phone: string,
    code: string
): Promise<PhoneVerificationResult> {
    try {
        const cleanPhone = cleanPhoneNumber(phone);

        // Call Backend to verify OTP
        const { data, error } = await api.functions.invoke('verify-otp', {
            body: {
                phone: cleanPhone,
                code: code.trim()
            }
        });

        if (error) {
            return {
                success: false,
                message: error.message || 'Invalid or expired code'
            };
        }

        if (!data?.valid) {
            return {
                success: false,
                message: data?.message || 'Invalid verification code'
            };
        }

        // Update user profile to mark phone as verified
        const { error: updateError } = await api
            .from('profiles')
            .eq('id', data.userId)
            .update({
                phone: cleanPhone,
                phone_verified: true,
                phone_verified_at: new Date().toISOString()
            });

        if (updateError) {
            console.error('Profile update error:', updateError);
            return {
                success: false,
                message: 'Verification succeeded but failed to update profile'
            };
        }

        return {
            success: true,
            message: 'Phone number verified successfully!'
        };
    } catch (error) {
        console.error('Verify OTP error:', error);
        return {
            success: false,
            message: 'An error occurred during verification'
        };
    }
}

/**
 * Clean phone number to standard format
 */
function cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with 0, replace with +234
    if (cleaned.startsWith('0')) {
        cleaned = '+234' + cleaned.substring(1);
    }

    // If doesn't start with +, add +234
    if (!cleaned.startsWith('+')) {
        cleaned = '+234' + cleaned;
    }

    return cleaned;
}

/**
 * Validate Nigerian phone number format
 */
function isValidNigerianPhone(phone: string): boolean {
    // Nigerian numbers: +234XXXXXXXXXX (13 digits total)
    const pattern = /^\+234\d{10}$/;
    return pattern.test(phone);
}

/**
 * Mask phone number for display
 */
function maskPhoneNumber(phone: string): string {
    if (phone.length < 4) return phone;
    const last4 = phone.slice(-4);
    const masked = '*'.repeat(phone.length - 4);
    return masked + last4;
}

/**
 * Resend OTP code (with rate limiting)
 */
export async function resendOTPCode(phone: string): Promise<PhoneVerificationResult> {
    // Check if we can resend (60 second cooldown)
    const lastSent = localStorage.getItem(`otp_last_sent_${phone}`);
    if (lastSent) {
        const timeSince = Date.now() - parseInt(lastSent);
        if (timeSince < 60000) {
            const waitTime = Math.ceil((60000 - timeSince) / 1000);
            return {
                success: false,
                message: `Please wait ${waitTime} seconds before requesting a new code`
            };
        }
    }

    // Send new code
    const result = await sendOTPCode(phone);

    if (result.success) {
        localStorage.setItem(`otp_last_sent_${phone}`, Date.now().toString());
    }

    return result;
}

/**
 * Check if phone number is already verified
 */
export async function isPhoneVerified(phone: string): Promise<boolean> {
    const cleanPhone = cleanPhoneNumber(phone);

    const { data, error } = await api
        .from('profiles')
        .select('phone_verified')
        .eq('phone', cleanPhone)
        .single();

    if (error || !data) return false;
    return (data as any).phone_verified === true;
}

/**
 * Get verification status for current user
 */
export async function getCurrentUserVerificationStatus() {
    // In our backend migration, we use the AuthContext or api.getCurrentUser()
    const { data: user, error: userError } = await api.getCurrentUser();

    if (userError || !user) return null;

    const { data, error } = await api
        .from('profiles')
        .select('phone, phone_verified, verification_status, id_document_url')
        .eq('id', user.id)
        .single();

    if (error || !data) {
        console.error('Get verification status error:', error);
        return null;
    }

    const profileData = data as any;
    return {
        hasPhone: !!profileData.phone,
        phoneVerified: profileData.phone_verified || false,
        hasIDDocument: !!profileData.id_document_url,
        verificationStatus: profileData.verification_status || 'unverified',
        isFullyVerified: profileData.phone_verified && profileData.verification_status === 'verified'
    };
}

