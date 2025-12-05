import React, { useState } from 'react';
import { mockPermissionSlip } from '../../data';
import { PermissionSlip } from '../../types';
import { CalendarIcon, ClipboardListIcon, CheckCircleIcon, XCircleIcon } from '../../constants';

const PermissionSlipScreen: React.FC = () => {
    const [slip, setSlip] = useState<PermissionSlip>(mockPermissionSlip);

    const handleResponse = (status: 'Approved' | 'Rejected') => {
        setSlip(prev => ({...prev, status}));
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                 <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                    <ClipboardListIcon className="h-10 w-10 mx-auto text-green-400 mb-2" />
                    <h3 className="font-bold text-lg text-green-800">Digital Permission Slip</h3>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-5">
                    <h2 className="text-xl font-bold text-gray-800">{slip.title}</h2>
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mt-3 border-b pb-4 mb-4">
                        <div className="flex items-center space-x-2">
                            <CalendarIcon className="w-5 h-5 text-green-500" />
                            <span>{new Date(slip.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{slip.description}</p>
                </div>
                
                {slip.status !== 'Pending' && (
                    <div className={`p-4 rounded-xl text-center font-bold ${slip.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        You have {slip.status} this permission slip.
                    </div>
                )}
            </main>

            {slip.status === 'Pending' && (
                <div className="p-4 mt-auto bg-white border-t grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => handleResponse('Rejected')}
                        className="w-full flex justify-center items-center space-x-2 py-3 px-4 font-medium rounded-lg shadow-sm bg-red-500 text-white hover:bg-red-600"
                    >
                        <XCircleIcon className="w-5 h-5"/>
                        <span>Reject</span>
                    </button>
                    <button 
                        onClick={() => handleResponse('Approved')}
                        className="w-full flex justify-center items-center space-x-2 py-3 px-4 font-medium rounded-lg shadow-sm bg-green-500 text-white hover:bg-green-600"
                    >
                        <CheckCircleIcon className="w-5 h-5"/>
                        <span>Approve</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PermissionSlipScreen;