import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ShieldCheckIcon, LoginIcon, ChevronRightIcon, LockIcon } from '../../constants';
import { supabase } from '../../lib/supabase';

interface TeacherSecurityScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const TeacherSecurityScreen: React.FC<TeacherSecurityScreenProps> = ({ navigateTo }) => {
    const [twoFactor, setTwoFactor] = useState(false);
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSecurityData = async () => {
            // Fetch 2FA status
            const { data: teacherData } = await supabase
                .from('teachers')
                .select('is_2fa_enabled')
                .eq('email', 'f.akintola@school.com')
                .single();

            if (teacherData) {
                setTwoFactor(teacherData.is_2fa_enabled || false);
            }

            // Fetch Login History
            const { data: historyData } = await supabase
                .from('login_history')
                .select('*')
                .eq('user_email', 'f.akintola@school.com')
                .order('login_time', { ascending: false });

            if (historyData) {
                setLoginHistory(historyData);
            }
            setLoading(false);
        };
        fetchSecurityData();
    }, []);

    const toggleTwoFactor = async () => {
        const newValue = !twoFactor;
        setTwoFactor(newValue);
        try {
            await supabase
                .from('teachers')
                .update({ is_2fa_enabled: newValue })
                .eq('email', 'f.akintola@school.com');
        } catch (err) {
            console.error('Error updating 2FA:', err);
            setTwoFactor(!newValue); // Revert on error
            toast.error('Failed to update 2FA setting.');
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
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className="text-green-500 h-6 w-6" />
                        <div>
                            <h3 className="font-bold text-gray-800">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-500">Add an extra layer of security.</p>
                        </div>
                    </div>
                    <button type="button" role="switch" aria-checked={twoFactor} onClick={toggleTwoFactor} className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${twoFactor ? 'bg-purple-600' : 'bg-gray-300'}`}>
                        <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${twoFactor ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Login History</h3>
                <ul className="space-y-3">
                    {loginHistory.length > 0 ? loginHistory.map((item, index) => (
                        <li key={index} className="flex items-center space-x-4">
                            <LoginIcon className="text-gray-400 h-6 w-6" />
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-700">{item.device}</p>
                                <p className="text-sm text-gray-500">{item.location} - {new Date(item.login_time).toLocaleString()}</p>
                            </div>
                            {item.is_current && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Active now</span>}
                        </li>
                    )) : <p className="text-sm text-gray-500">No login history available.</p>}
                </ul>
            </div>
        </div>
    );
};
export default TeacherSecurityScreen;
