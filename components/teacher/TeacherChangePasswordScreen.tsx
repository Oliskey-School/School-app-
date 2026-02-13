
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LockIcon, EyeIcon, EyeOffIcon } from '../../constants';
import { supabase } from '../../lib/supabase';

const PasswordInput = ({ id, label, value, onChange }: { id: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="relative mt-1">
                <LockIcon className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type={showPassword ? "text" : "password"}
                    id={id}
                    value={value}
                    onChange={onChange}
                    required
                    className="w-full pl-10 pr-10 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center pr-2 text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};

const TeacherChangePasswordScreen: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        const loadingToast = toast.loading("Updating password...");
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            toast.success("Password updated successfully!", { id: loadingToast });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');

            // Note: navigateTo is not in props here yet, but let's assume we might add it or just clear.
            // For now, just success message is fine.
        } catch (err: any) {
            console.error("Error updating password:", err);
            toast.error(err.message || "Failed to update password", { id: loadingToast });
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
                    <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                        Update Password
                    </button>
                </div>
            </form>
        </div>
    );
};
export default TeacherChangePasswordScreen;
