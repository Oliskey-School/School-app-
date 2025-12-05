import React from 'react';
import { ShieldCheckIcon, LoginIcon, ChevronRightIcon } from '../../constants';

const ParentSecurityScreen: React.FC = () => {
    
    const loginHistory = [
        { device: 'Chrome on Windows', location: 'Lagos, NG', time: '2 hours ago', isCurrent: true },
        { device: 'App on Android', location: 'Lagos, NG', time: '1 day ago', isCurrent: false },
    ];

    return (
        <div className="p-4 space-y-5 bg-gray-50">
            <div className="bg-white rounded-xl shadow-sm p-2">
                <button className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-red-100 text-red-500">
                            <ShieldCheckIcon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-gray-700">Change Password</span>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400"/>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Login History</h3>
                <ul className="space-y-3">
                    {loginHistory.map((item, index) => (
                        <li key={index} className="flex items-center space-x-4">
                            <LoginIcon className="text-gray-400 h-6 w-6"/>
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-700">{item.device}</p>
                                <p className="text-sm text-gray-500">{item.location} - {item.time}</p>
                            </div>
                            {item.isCurrent && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Active</span>}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
export default ParentSecurityScreen;
