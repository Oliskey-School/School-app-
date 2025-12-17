
import React, { useState } from 'react';
import { LockIcon } from '../../constants';
import { supabase } from '../../lib/supabase';

const PasswordInput = ({ id, label, value, onChange }: { id: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="relative mt-1">
            <LockIcon className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="password" id={id} value={value} onChange={onChange} required className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
        </div>
    </div>
);

const ChangePasswordScreen: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');

        if (newPassword !== confirmPassword) {
            setMessage("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            setMessage("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        try {
            // Note: UpdateUser usually doesn't require current password if session is active,
            // but for strict security, re-authentication is recommended. 
            // For this UI, we just update the password for the logged-in user.
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage("Password changed successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Error changing password:', err);
            setMessage(err.message || "Failed to change password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <main className="flex-grow p-4 overflow-y-auto">
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                        <PasswordInput id="currentPassword" label="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                        <PasswordInput id="newPassword" label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <PasswordInput id="confirmPassword" label="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                </main>
                <div className="p-4 mt-auto bg-gray-50 border-t border-gray-200">
                    {message && (
                        <div className={`mb-3 p-3 rounded-lg text-center text-sm font-medium ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {message}
                        </div>
                    )}
                    <button type="submit" disabled={loading} className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {loading ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </form>
        </div>
    );
};
export default ChangePasswordScreen;