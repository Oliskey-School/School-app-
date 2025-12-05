
import React, { useState } from 'react';
import { LockIcon } from '../../constants';

const PasswordInput = ({ id, label, value, onChange }: { id: string, label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="relative mt-1">
            <LockIcon className="absolute inset-y-0 left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
            <input type="password" id={id} value={value} onChange={onChange} required className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" />
        </div>
    </div>
);

const ChangePasswordScreen: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }
        alert("Password changed successfully!");
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
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
                    <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
                        Update
                    </button>
                </div>
            </form>
        </div>
    );
};
export default ChangePasswordScreen;