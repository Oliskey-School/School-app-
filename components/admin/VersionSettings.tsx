import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface AppVersion {
    id: string;
    version: string;
    description: string;
    created_at: string;
}

export default function VersionSettings() {
    const { currentSchool } = useAuth();
    const [versions, setVersions] = useState<AppVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState<string | null>(null);

    useEffect(() => {
        fetchVersions();
    }, []);

    const fetchVersions = async () => {
        try {
            const data = await api.getAppVersions();
            setVersions(data);
        } catch (error) {
            console.error('Failed to fetch versions:', error);
            toast.error('Failed to load platform versions');
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchVersion = async (version: string) => {
        if (!currentSchool?.id) return;
        
        const confirmSwitch = window.confirm(`Are you sure you want to lock your school to version ${version}? This will become the functional version for all your users.`);
        if (!confirmSwitch) return;

        setSwitching(version);
        try {
            await api.setSchoolVersion(currentSchool.id, version);
            toast.success(`Successfully switched to version ${version}`);
            
            // Invalidate cached user profile so the reload picks up new version
            localStorage.removeItem('cached_user_profile');
            
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            toast.error(error.message || 'Failed to switch version');
        } finally {
            setSwitching(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Platform Version Management</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Select a stable version for your school. You will receive updates only for the selected branch.
                    </p>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                    Current Lock: {currentSchool?.platform_version || 'None'}
                </div>
            </div>

            <div className="divide-y divide-gray-50">
                {versions.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 italic">
                        No published versions found.
                    </div>
                ) : (
                    versions.map((v) => (
                        <div 
                            key={v.id} 
                            className={`p-5 flex items-center justify-between transition-all hover:bg-gray-50 ${
                                currentSchool?.platform_version === v.version ? 'bg-blue-50/30 border-l-4 border-primary' : ''
                            }`}
                        >
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-gray-900">v{v.version}</span>
                                    {currentSchool?.platform_version === v.version && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">ACTIVE</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-1">{v.description}</p>
                                <div className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Published on {new Date(v.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <div>
                                <button
                                    onClick={() => handleSwitchVersion(v.version)}
                                    disabled={switching !== null || currentSchool?.platform_version === v.version}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                        currentSchool?.platform_version === v.version
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                            : switching === v.version
                                            ? 'bg-primary/50 text-white cursor-wait animate-pulse'
                                            : 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md'
                                    }`}
                                >
                                    {switching === v.version ? 'Switching...' : currentSchool?.platform_version === v.version ? 'Selected' : 'Use this Version'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-amber-50 border-t border-amber-100 flex gap-3">
                <div className="flex-shrink-0 text-amber-500 mt-0.5">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="text-xs text-amber-700 leading-relaxed">
                    <p className="font-bold">Important Notice:</p>
                    Switching versions will reload the application for all users associated with this school. Only the features and configurations included in the selected version will remain functional.
                </div>
            </div>
        </div>
    );
}
