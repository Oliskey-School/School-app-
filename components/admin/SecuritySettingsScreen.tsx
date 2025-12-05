import React, { useState } from 'react';
import { ShieldCheckIcon, LoginIcon } from '../../constants';

const SecuritySettingsScreen: React.FC<{ navigateTo: (view: string, title: string, props?: any) => void; }> = ({ navigateTo }) => {
    const [twoFactor, setTwoFactor] = useState(false);
    const [passwordPolicy, setPasswordPolicy] = useState({
        minLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSpecial: false,
    });

    const loginHistory = [
        { device: 'Chrome on Windows', location: 'Lagos, NG', time: '2 hours ago', isCurrent: true },
        { device: 'Safari on iPhone', location: 'Abuja, NG', time: '1 day ago', isCurrent: false },
    ];

    return (
        <div className="p-4 space-y-5 bg-gray-50">
            <div className="bg-white p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <ShieldCheckIcon className="text-green-500 h-6 w-6"/>
                        <div>
                            <h3 className="font-bold text-gray-800">Enforce Two-Factor for Staff</h3>
                            <p className="text-sm text-gray-500">Require all teachers to use 2FA.</p>
                        </div>
                    </div>
                    <button type="button" role="switch" aria-checked={twoFactor} onClick={() => setTwoFactor(!twoFactor)} className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${ twoFactor ? 'bg-sky-600' : 'bg-gray-300' }`}>
                        <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ twoFactor ? 'translate-x-5' : 'translate-x-0' }`}/>
                    </button>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Password Policy</h3>
                <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex justify-between items-center">
                        <label>Minimum Length: {passwordPolicy.minLength}</label>
                        <input type="range" min="6" max="16" value={passwordPolicy.minLength} onChange={e => setPasswordPolicy(p => ({...p, minLength: parseInt(e.target.value)}))} className="w-24"/>
                    </div>
                    <div className="flex justify-between items-center">
                        <label>Require Uppercase Letter</label>
                        <input type="checkbox" checked={passwordPolicy.requireUppercase} onChange={e => setPasswordPolicy(p => ({...p, requireUppercase: e.target.checked}))} className="h-4 w-4 rounded text-indigo-600"/>
                    </div>
                    <div className="flex justify-between items-center">
                        <label>Require Number</label>
                        <input type="checkbox" checked={passwordPolicy.requireNumber} onChange={e => setPasswordPolicy(p => ({...p, requireNumber: e.target.checked}))} className="h-4 w-4 rounded text-indigo-600"/>
                    </div>
                    <div className="flex justify-between items-center">
                        <label>Require Special Character</label>
                        <input type="checkbox" checked={passwordPolicy.requireSpecial} onChange={e => setPasswordPolicy(p => ({...p, requireSpecial: e.target.checked}))} className="h-4 w-4 rounded text-indigo-600"/>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Recent System Logins</h3>
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
export default SecuritySettingsScreen;