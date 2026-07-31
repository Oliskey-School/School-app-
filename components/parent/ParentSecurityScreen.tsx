import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheckIcon, ChevronRightIcon, LoginIcon } from '../../constants';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';

interface ParentSecurityScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const ParentSecurityScreen: React.FC<ParentSecurityScreenProps> = ({ navigateTo }) => {
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        const data = await api.getLoginHistory();
        setLoginHistory(data);
        setLoading(false);
    }, []);

    // Real-time synchronization
    useAutoSync(['login_history'], loadHistory);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3" />
                <p className="text-gray-400 text-sm font-medium">Loading security details...</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-5 bg-gray-50">
            <div className="bg-white rounded-xl shadow-sm p-2">
                <motion.button
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigateTo('parentChangePassword', 'Change Password')}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                    <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-green-100 text-green-600">
                            <ShieldCheckIcon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-gray-700">Change Password</span>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                </motion.button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Login History</h3>
                <ul className="space-y-3">
                    {loginHistory.length > 0 ? loginHistory.map((item, index) => (
                        <motion.li
                            key={index}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.04 }}
                            className="flex items-center space-x-4"
                        >
                            <LoginIcon className="text-gray-400 h-6 w-6" />
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-700">{item.device}</p>
                                <p className="text-sm text-gray-500">{item.location} - {item.time}</p>
                            </div>
                            {item.isCurrent && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Active</span>}
                        </motion.li>
                    )) : (
                        <li className="text-center py-4 text-gray-500 text-sm italic">
                            No recent login history found.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};
export default ParentSecurityScreen;
