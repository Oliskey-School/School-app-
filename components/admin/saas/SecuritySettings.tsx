import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
    Shield,
    Lock,
    Key,
    Smartphone,
    AlertTriangle,
    CheckCircle,
    Copy,
    RefreshCw,
    Save
} from 'lucide-react';

interface SecuritySettingsProps {
    navigateTo?: (screen: string) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ navigateTo }) => {
    const [loading, setLoading] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showQR, setShowQR] = useState(false);

    // Security settings
    const [settings, setSettings] = useState({
        sessionTimeout: 30,
        passwordExpiry: 90,
        maxLoginAttempts: 5,
        requireStrongPassword: true,
        allowMultipleSessions: false
    });

    useEffect(() => {
        checkTwoFactorStatus();
    }, []);

    const checkTwoFactorStatus = async () => {
        try {
            const user = await api.getMe();

            // Check if 2FA is enabled (this would need backend support)
            // For now, we'll simulate it
            const has2FA = localStorage.getItem('2fa_enabled') === 'true';
            setTwoFactorEnabled(has2FA);
        } catch (error) {
            console.error('Error checking 2FA status:', error);
        }
    };

    const generateQRCode = async () => {
        try {
            setLoading(true);

            // In a real implementation, you would:
            // 1. Generate a secret on the backend using speakeasy
            // 2. Create QR code using qrcode library
            // 3. Return both to the frontend

            // Simulated response
            const mockSecret = 'JBSWY3DPEHPK3PXP';
            const user = await api.getMe();
            const appName = 'SchoolApp';
            const otpauthUrl = `otpauth://totp/${appName}:${user?.email}?secret=${mockSecret}&issuer=${appName}`;

            // In production, use qrcode.toDataURL(otpauthUrl)
            setSecret(mockSecret);
            setQrCode(otpauthUrl); // This would be a data URL in production
            setShowQR(true);

        } catch (error) {
            console.error('Error generating QR code:', error);
            alert('Failed to generate QR code');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable2FA = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            alert('Please enter a valid 6-digit code');
            return;
        }

        try {
            setLoading(true);

            // In production, verify the code on the backend using speakeasy.verify()
            // For now, we'll simulate success

            localStorage.setItem('2fa_enabled', 'true');
            setTwoFactorEnabled(true);
            setShowQR(false);
            setVerificationCode('');
            alert('Two-Factor Authentication enabled successfully!');

        } catch (error) {
            console.error('Error enabling 2FA:', error);
            alert('Failed to enable 2FA. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const disable2FA = async () => {
        if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) {
            return;
        }

        try {
            setLoading(true);

            // In production, disable on backend
            localStorage.removeItem('2fa_enabled');
            setTwoFactorEnabled(false);
            alert('Two-Factor Authentication disabled');

        } catch (error) {
            console.error('Error disabling 2FA:', error);
            alert('Failed to disable 2FA');
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        alert('Secret copied to clipboard!');
    };

    const handleSaveSettings = async () => {
        try {
            setLoading(true);

            // In production, save to backend/database
            localStorage.setItem('security_settings', JSON.stringify(settings));
            alert('Security settings saved successfully!');

        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
                    <p className="text-gray-600 mt-1">Manage authentication and security preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Two-Factor Authentication */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-indigo-600" />
                            Two-Factor Authentication (2FA)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Status */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                {twoFactorEnabled ? (
                                    <>
                                        <CheckCircle className="w-6 h-6 text-green-500" />
                                        <div>
                                            <p className="font-medium text-gray-900">2FA Enabled</p>
                                            <p className="text-sm text-gray-600">Your account is protected</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                                        <div>
                                            <p className="font-medium text-gray-900">2FA Disabled</p>
                                            <p className="text-sm text-gray-600">Enable for extra security</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {!twoFactorEnabled && !showQR && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                    Two-factor authentication adds an extra layer of security to your account.
                                    You'll need to enter a code from your authenticator app when signing in.
                                </p>
                                <button
                                    onClick={generateQRCode}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                >
                                    <Key className="w-4 h-4" />
                                    Enable 2FA
                                </button>
                            </div>
                        )}

                        {showQR && (
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800 mb-2">
                                        <strong>Step 1:</strong> Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                    </p>
                                    <div className="bg-white p-4 rounded-lg text-center">
                                        {/* In production, display actual QR code image */}
                                        <div className="w-48 h-48 mx-auto bg-gray-200 flex items-center justify-center rounded">
                                            <p className="text-sm text-gray-500">QR Code Here</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-700 mb-2">
                                        <strong>Manual Entry:</strong> If you can't scan, enter this secret:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded font-mono text-sm">
                                            {secret}
                                        </code>
                                        <button
                                            onClick={copySecret}
                                            className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            <Copy className="w-4 h-4 text-gray-600" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <strong>Step 2:</strong> Enter the 6-digit code from your app
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={verifyAndEnable2FA}
                                        disabled={loading || verificationCode.length !== 6}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Verify & Enable
                                    </button>
                                    <button
                                        onClick={() => setShowQR(false)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {twoFactorEnabled && (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-sm text-green-800">
                                        ✓ Your account is protected with two-factor authentication
                                    </p>
                                </div>
                                <button
                                    onClick={disable2FA}
                                    disabled={loading}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    Disable 2FA
                                </button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Security Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-600" />
                            Security Preferences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Session Timeout */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Session Timeout (minutes)
                            </label>
                            <input
                                type="number"
                                value={settings.sessionTimeout}
                                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                                min={5}
                                max={120}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Automatically log out after this period of inactivity
                            </p>
                        </div>

                        {/* Password Expiry */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password Expiry (days)
                            </label>
                            <input
                                type="number"
                                value={settings.passwordExpiry}
                                onChange={(e) => setSettings({ ...settings, passwordExpiry: parseInt(e.target.value) })}
                                min={30}
                                max={365}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Force password change after this many days
                            </p>
                        </div>

                        {/* Max Login Attempts */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Login Attempts
                            </label>
                            <input
                                type="number"
                                value={settings.maxLoginAttempts}
                                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                                min={3}
                                max={10}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Lock account after this many failed login attempts
                            </p>
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-3 pt-4 border-t">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.requireStrongPassword}
                                    onChange={(e) => setSettings({ ...settings, requireStrongPassword: e.target.checked })}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Require Strong Passwords</p>
                                    <p className="text-xs text-gray-500">Enforce minimum 8 characters, uppercase, lowercase, numbers</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.allowMultipleSessions}
                                    onChange={(e) => setSettings({ ...settings, allowMultipleSessions: e.target.checked })}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Allow Multiple Sessions</p>
                                    <p className="text-xs text-gray-500">Users can be logged in from multiple devices</p>
                                </div>
                            </label>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveSettings}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 mt-6"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Settings
                                </>
                            )}
                        </button>
                    </CardContent>
                </Card>
            </div>

            {/* Security Tips */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-indigo-600" />
                        Security Best Practices
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">Use Strong Passwords</p>
                                <p className="text-sm text-gray-600">At least 12 characters with mixed case, numbers, and symbols</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">Enable 2FA</p>
                                <p className="text-sm text-gray-600">Add an extra layer of protection to your account</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">Regular Password Updates</p>
                                <p className="text-sm text-gray-600">Change your password every 90 days</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">Monitor Activity</p>
                                <p className="text-sm text-gray-600">Review audit logs regularly for suspicious activity</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SecuritySettings;

