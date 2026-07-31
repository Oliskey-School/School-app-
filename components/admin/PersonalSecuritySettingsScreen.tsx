import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const PersonalSecuritySettingsScreen: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void; }> = ({ navigateTo }) => {
    const { profile } = useProfile();
    const [twoFactor, setTwoFactor] = useState(false);

    useEffect(() => {
        if (profile) {
            setTwoFactor((profile as any).two_factor_enabled || false);
        }
    }, [profile]);

    const toggleTwoFactor = async () => {
        const newValue = !twoFactor;
        setTwoFactor(newValue);

        if (profile?.id) {
            try {
                await api.updateUser(profile.id, { two_factor_enabled: newValue });
                toast.success(`Two-factor authentication ${newValue ? 'enabled' : 'disabled'}`);
            } catch (err: any) {
                console.error('Error updating 2FA:', err);
                toast.error('Failed to update security settings');
                setTwoFactor(!newValue);
            }
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2">My Security</h3>
                <div className="flex justify-between items-center py-2">
                    <div>
                        <p className="font-semibold text-gray-700">Enable Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500">Secure your account with an extra layer.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={twoFactor} onClick={toggleTwoFactor} className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${twoFactor ? 'bg-sky-600' : 'bg-gray-300'}`}>
                        <motion.span aria-hidden="true" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 ${twoFactor ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
                <div className="mt-4 pt-4 border-t">
                    <motion.button whileHover={{ x: 2 }} onClick={() => navigateTo('changePassword', 'Change Password', {})} className="w-full text-left font-semibold text-gray-700 py-2 hover:text-sky-600">
                        Change Your Password
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};
export default PersonalSecuritySettingsScreen;
