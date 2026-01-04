import React, { useState } from 'react';
import { sendOTPCode, verifyOTPCode, resendOTPCode } from '../../lib/verification';

interface PhoneVerificationProps {
    onVerified: () => void;
    onCancel?: () => void;
}

export function PhoneVerification({ onVerified, onCancel }: PhoneVerificationProps) {
    const [step, setStep] = useState<'phone' | 'code'>('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [expiresAt, setExpiresAt] = useState<string>('');

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await sendOTPCode(phone);
        setLoading(false);

        if (result.success) {
            setSuccess(result.message);
            setExpiresAt(result.expiresAt || '');
            setStep('code');
        } else {
            setError(result.message);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await verifyOTPCode(phone, code);
        setLoading(false);

        if (result.success) {
            setSuccess(result.message);
            setTimeout(() => onVerified(), 1500);
        } else {
            setError(result.message);
        }
    };

    const handleResend = async () => {
        setError('');
        setLoading(true);

        const result = await resendOTPCode(phone);
        setLoading(false);

        if (result.success) {
            setSuccess('New code sent!');
            setExpiresAt(result.expiresAt || '');
        } else {
            setError(result.message);
        }
    };

    if (step === 'phone') {
        return (
            <div className="max-w-md mx-auto p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Verify Phone Number</h2>
                    <p className="text-gray-600 mt-2">
                        We'll send a verification code to your phone
                    </p>
                </div>

                <form onSubmit={handleSendCode} className="space-y-4">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+234XXXXXXXXXX"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Format: +234XXXXXXXXXX (Nigerian number)
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={loading || !phone}
                            className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Sending...' : 'Send Code'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-6">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Enter Verification Code</h2>
                <p className="text-gray-600 mt-2">
                    We sent a 6-digit code to {phone}
                </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                        Verification Code
                    </label>
                    <input
                        type="text"
                        id="code"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                        required
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-green-700">{success}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                    {loading ? 'Verifying...' : 'Verify Code'}
                </button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                    >
                        Didn't receive code? Resend
                    </button>
                </div>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => setStep('phone')}
                        className="text-sm text-gray-600 hover:text-gray-700"
                    >
                        Change phone number
                    </button>
                </div>
            </form>
        </div>
    );
}
