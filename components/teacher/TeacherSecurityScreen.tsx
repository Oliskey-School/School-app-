import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ShieldCheckIcon, ChevronRightIcon, LockIcon } from '../../constants';
import { api } from '../../lib/api';

interface TeacherSecurityScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: string | null;
    userId?: string | null;
}

const TeacherSecurityScreen: React.FC<TeacherSecurityScreenProps> = ({ navigateTo }) => {
    const [twoFactor, setTwoFactor] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    // 2FA enrollment (enable) flow state
    const [enrolling, setEnrolling] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [enableCode, setEnableCode] = useState('');
    // Disable flow state
    const [disabling, setDisabling] = useState(false);
    const [disableCode, setDisableCode] = useState('');

    useEffect(() => {
        const fetchSecurityData = async () => {
            try {
                const me = await api.getMe();
                setTwoFactor(!!me?.two_factor_enabled);
            } catch (err) {
                console.error('Error fetching security data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSecurityData();
    }, []);

    const startEnrollment = async () => {
        setBusy(true);
        try {
            const { secret, qrCodeUrl } = await api.setup2FA();
            setSecret(secret);
            setQrCodeUrl(qrCodeUrl);
            setEnrolling(true);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to start 2FA setup.');
        } finally {
            setBusy(false);
        }
    };

    const confirmEnable = async () => {
        if (!enableCode.trim()) {
            toast.error('Enter the 6-digit code from your authenticator app.');
            return;
        }
        setBusy(true);
        try {
            await api.enable2FA(enableCode.trim());
            setTwoFactor(true);
            setEnrolling(false);
            setEnableCode('');
            setQrCodeUrl('');
            setSecret('');
            toast.success('Two-factor authentication enabled.');
        } catch (err: any) {
            toast.error(err?.message || 'Invalid code — please try again.');
        } finally {
            setBusy(false);
        }
    };

    const confirmDisable = async () => {
        if (!disableCode.trim()) {
            toast.error('Enter your current 6-digit authenticator code to confirm.');
            return;
        }
        setBusy(true);
        try {
            await api.disable2FA(disableCode.trim());
            setTwoFactor(false);
            setDisabling(false);
            setDisableCode('');
            toast.success('Two-factor authentication disabled.');
        } catch (err: any) {
            toast.error(err?.message || 'Invalid code — please try again.');
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Checking security protocols...</div>;

    return (
        <div className="p-4 space-y-5 bg-gray-50 h-full overflow-y-auto">
            <div className="bg-white rounded-xl shadow-sm p-2">
                <button
                    onClick={() => navigateTo('teacherChangePassword', 'Change Password')}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                    <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-red-100 text-red-500">
                            <LockIcon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-gray-700">Change Password</span>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className={`h-6 w-6 ${twoFactor ? 'text-green-500' : 'text-gray-400'}`} />
                        <div>
                            <h3 className="font-bold text-gray-800">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-500">{twoFactor ? 'Enabled — your account is protected.' : 'Add an extra layer of security.'}</p>
                        </div>
                    </div>
                    {twoFactor ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => setDisabling(v => !v)}
                            className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                            Disable
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={startEnrollment}
                            className="text-sm font-semibold text-purple-600 hover:text-purple-700 disabled:opacity-50"
                        >
                            Enable
                        </button>
                    )}
                </div>

                {enrolling && (
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-sm text-gray-600">Scan this QR code with an authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code it shows.</p>
                        {qrCodeUrl && <img src={qrCodeUrl} alt="2FA QR code" className="w-40 h-40 mx-auto border border-gray-200 rounded-lg" />}
                        {secret && <p className="text-xs text-center font-mono text-gray-400 break-all">Manual entry key: {secret}</p>}
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={enableCode}
                            onChange={e => setEnableCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            className="w-full text-center text-lg tracking-widest px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setEnrolling(false); setEnableCode(''); setQrCodeUrl(''); setSecret(''); }}
                                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={confirmEnable}
                                className="flex-1 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
                            >
                                Verify &amp; Enable
                            </button>
                        </div>
                    </div>
                )}

                {disabling && (
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-sm text-gray-600">Enter your current authenticator code to confirm disabling 2FA.</p>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={disableCode}
                            onChange={e => setDisableCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            className="w-full text-center text-lg tracking-widest px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setDisabling(false); setDisableCode(''); }}
                                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={confirmDisable}
                                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
                            >
                                Confirm Disable
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherSecurityScreen;
