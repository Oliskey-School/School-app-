// 🚨 TESTING ONLY: This file stores plain OTP codes in memory for E2E testing
// This is only populated in non-production environments.

interface OTPStore {
    [email: string]: string;
}

const otpStore: OTPStore = {};

export const TestOTPStore = {
    set: (email: string, code: string) => {
        if (process.env.NODE_ENV !== 'production') {
            otpStore[email.toLowerCase()] = code;
        }
    },
    get: (email: string) => {
        return otpStore[email.toLowerCase()];
    },
    clear: (email: string) => {
        delete otpStore[email.toLowerCase()];
    }
};
