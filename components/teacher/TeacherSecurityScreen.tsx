
import React, { useState } from 'react';
import { ShieldCheckIcon, LoginIcon, ChevronRightIcon, LockIcon } from '../../constants';

interface TeacherSecurityScreenProps {
  navigateTo: (view: string, title: string, props?: any) => void;
}

const TeacherSecurityScreen: React.FC<TeacherSecurityScreenProps> = ({ navigateTo }) => {
    const [twoFactor, setTwoFactor] = useState(false);

    const loginHistory = [
        { device: 'Chrome on Windows', location: 'Lagos, NG', time: '5 hours ago', isCurrent: true },
        { device: 'Safari on iPhone', location: 'Abuja, NG', time: '2 days ago', isCurrent: false },
    ];

    return (
        <div className="p-4 space-y-5 bg-gray-50">
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
                    <ChevronRightIcon className="h-5 w-5 text-gray-400"/>
                </button>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className="text-green-500 h-6 w-6"/>
                        <div>
                            <h3 className="font-bold text-gray-800">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-500">Add an extra layer of security.</p>
                        </div>
                    </div>
                    <button type="button" role="switch" aria-checked={twoFactor} onClick={() => setTwoFactor(!twoFactor)} className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${ twoFactor ? 'bg-purple-600' : 'bg-gray-300' }`}>
                        <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ twoFactor ? 'translate-x-5' : 'translate-x-0' }`}/>
                    </button>
                </div>
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
                            {item.isCurrent && <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Active now</span>}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
export default TeacherSecurityScreen;
