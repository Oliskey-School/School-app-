import React from 'react';
import { APP_VERSION } from '../../lib/config';
import { useAuth } from '../../context/AuthContext';

export default function VersionStatusCard() {
    const { currentSchool } = useAuth();
    const schoolVersion = currentSchool?.platform_version;
    const isMismatch = schoolVersion && schoolVersion !== APP_VERSION;

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">System Version</h3>
                    <p className="text-sm text-gray-500">View and manage your application version status</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${isMismatch ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {isMismatch ? 'Update Pending' : 'Up to Date'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Local Client</div>
                    <div className="text-xl font-black text-gray-800">v{APP_VERSION}</div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">School Target</div>
                    <div className="text-xl font-black text-gray-800">v{schoolVersion || '---'}</div>
                </div>
            </div>

            {isMismatch && (
                <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-900">Synchronization Required</p>
                        <p className="text-xs text-amber-700 mt-0.5">Your local application version doesn't match the school's platform lock. Update now to ensure full feature compatibility.</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-amber-700 transition-all active:scale-95"
                    >
                        Update Now
                    </button>
                </div>
            )}

            {!isMismatch && (
                <div className="mt-6 flex items-center gap-2 text-xs text-gray-400">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Your application is fully synchronized with the school infrastructure.
                </div>
            )}
        </div>
    );
}
