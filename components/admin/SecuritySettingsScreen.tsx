import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, ClockIcon as HistoryIcon, LockIcon, LoginIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const SecuritySettingsScreen: React.FC = () => {
    const { currentSchool, currentBranchId } = useAuth();
    const [passwordPolicy, setPasswordPolicy] = useState({
        minLength: 8,
        requireUppercase: true, 
        requireNumber: true, 
        requireSpecial: false, 
    });
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentSchool?.settings?.security?.passwordPolicy) {
            setPasswordPolicy(prevPolicy => ({
                ...prevPolicy,
                ...currentSchool.settings.security.passwordPolicy
            }));
        }

        const fetchLoginHistory = async () => {
            if (!currentSchool?.id) return;
            let query = api
                .from('audit_logs')
                .select('*')
                .eq('school_id', currentSchool.id)
                .eq('type', 'login');

            if (currentBranchId && currentBranchId !== 'all') {
                query = query.eq('branch_id', currentBranchId);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error("Error fetching login history:", error);
                toast.error(`Error fetching login history: ${error.message} `);
                return;
            }

            if (data) {
                setLoginHistory(data.map(log => ({
                    id: log.id,
                    user: (log as any).user_name || 'System',
                    action: 'Logged In',
                    time: new Date(log.created_at).toLocaleString(),
                    device: log.metadata?.device || 'Unknown Device',
                    location: log.metadata?.location || 'Unknown Location',
                    isCurrent: false // Assuming fetched logs are not current session
                })));
            }
        };

        fetchLoginHistory();
    }, [currentSchool]);

    const handleSavePolicy = async () => {
        if (!currentSchool?.id) {
            toast.error("No school selected to save policy.");
            return;
        }
        setIsLoading(true);
        try {
            const { error } = await api
                .from('schools')
                .update({
                    settings: {
                        ...(currentSchool.settings || {}),
                        security: { ...(currentSchool.settings?.security || {}), passwordPolicy }
                    }
                })
                .eq('id', currentSchool.id);

            if (error) throw error;
            toast.success('Security settings saved');
        } catch (error: any) {
            toast.error(`Error: ${error.message} `);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 space-y-5 bg-gray-50">
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Password Policy</h3>
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between items-center">
                        <label>Minimum Length: {passwordPolicy.minLength}</label>
                        <input type="range" min="6" max="16" value={passwordPolicy.minLength} onChange={e => setPasswordPolicy(p => ({ ...p, minLength: parseInt(e.target.value) }))} className="w-24" />
                    </div>
                    <div className="flex justify-between items-center">
                        <label>Require Uppercase Letter</label>
                        <input type="checkbox" checked={passwordPolicy.requireUppercase} onChange={e => setPasswordPolicy(p => ({ ...p, requireUppercase: e.target.checked }))} className="h-4 w-4 rounded text-indigo-600" />
                    </div>
                    <div className="flex justify-between items-center">
                        <label>Require Number</label>
                        <input type="checkbox" checked={passwordPolicy.requireNumber} onChange={e => setPasswordPolicy(p => ({ ...p, requireNumber: e.target.checked }))} className="h-4 w-4 rounded text-indigo-600" />
                    </div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-700 text-sm">Force Special Characters</label>
                        <input type="checkbox" checked={passwordPolicy.requireSpecial} onChange={e => setPasswordPolicy({ ...passwordPolicy, requireSpecial: e.target.checked })} />
                    </div>
                </div>
                <button
                    onClick={handleSavePolicy}
                    disabled={isLoading}
                    className="mt-4 w-full bg-indigo-600 text-white font-bold py-2 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {isLoading ? 'Saving...' : 'Save Policy'}
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Recent System Logins</h3>
                <ul className="space-y-3">
                    {loginHistory.map((item, index) => (
                        <li key={index} className="flex items-center space-x-4">
                            <LoginIcon className="text-gray-400 h-6 w-6" />
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-700">{item.device}</p>
                                <p className="text-sm text-gray-500">{item.location} - {item.time}</p>
                            </div>
                            {item.isCurrent && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Active now</span>}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
export default SecuritySettingsScreen;
