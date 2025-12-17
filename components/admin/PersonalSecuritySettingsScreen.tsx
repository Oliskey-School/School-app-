import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';

const PersonalSecuritySettingsScreen: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void; }> = ({ navigateTo }) => {
    const { profile } = useProfile();
    const [twoFactor, setTwoFactor] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            if (profile.id) {
                const { data, error } = await supabase
                    .from('users')
                    .select('two_factor_enabled')
                    .eq('id', profile.id)
                    .single();

                if (data) {
                    setTwoFactor(data.two_factor_enabled || false);
                }
            }
        };
        fetchSettings();
    }, [profile.id]);

    const toggleTwoFactor = async () => {
        setTwoFactor(!twoFactor);

        if (profile.id) {
            const { error } = await supabase
                .from('users')
                .update({ two_factor_enabled: !twoFactor })
                .eq('id', profile.id);

            if (error) {
                console.error('Error updating 2FA:', error);
                setTwoFactor(twoFactor);
            }
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full">
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-2">My Security</h3>
                <div className="flex justify-between items-center py-2">
                    <div>
                        <p className="font-semibold text-gray-700">Enable Two-Factor Authentication</p>
                        <p className="text-sm text-gray-500">Secure your account with an extra layer.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={twoFactor} onClick={toggleTwoFactor} className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${twoFactor ? 'bg-sky-600' : 'bg-gray-300'}`}>
                        <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${twoFactor ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
                <div className="mt-4 pt-4 border-t">
                    <button onClick={() => navigateTo('changePassword', 'Change Password', {})} className="w-full text-left font-semibold text-gray-700 py-2 hover:text-sky-600">
                        Change Your Password
                    </button>
                </div>
            </div>
        </div>
    );
};
export default PersonalSecuritySettingsScreen;
