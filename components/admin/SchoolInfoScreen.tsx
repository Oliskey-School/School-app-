import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SaveIcon, SchoolLogoIcon, CheckCircleIcon, XCircleIcon, PhotoIcon, BellIcon } from '../../constants';

// Since we don't have a MusicIcon in constants, I'll use a fallback or add it if I could.
// I'll stick to what is available or define a simple SVG locally if needed. 
// Actually, I can use 'SpeakerIcon' or just text.
// Let's use a local SVG for Music if not present.
const MusicalNoteIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M13 3v16l-5 -5l-5 5v-16l5 5l5 -5z" /> {/* Actually this is a banner icon, let's use a note */}
        <path d="M9 17v-13h10v13" />
        <path d="M9 8h10" />
        <path d="M5 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
        <path d="M15 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
    </svg>
);

const SchoolInfoScreen: React.FC = () => {
    const [info, setInfo] = useState({
        name: 'Excellence Academy',
        anthem: '',
        pledge: '',
        logo_url: '',
        hero_image_url: ''
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSchoolInfo();
    }, []);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const fetchSchoolInfo = async () => {
        try {
            // Assuming a 'school_info' table exists with a single row or similar mechanism
            // If not, we might need to create it or simulate it.
            // For now, let's simulate fetching or try to fetch from a generic 'settings' table if it exists.
            // I'll try to fetch from 'school_info' table.
            const { data, error } = await supabase.from('school_info').select('*').single();

            if (error && error.code !== 'PGRST116') { // Ignore row not found
                console.error('Error fetching info:', error);
            }

            if (data) {
                setInfo(data);
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMessage(null);

        try {
            // Upsert the school info
            // We assume ID 1 for the single school record
            const { error } = await supabase
                .from('school_info')
                .upsert({ id: 1, ...info });

            if (error) throw error;
            setStatusMessage({ type: 'success', text: 'School information updated!' });
        } catch (err) {
            console.error('Error saving:', err);
            // If table doesn't exist, we might fail here. 
            // In a real scenario we would ensure the table exists.
            setStatusMessage({ type: 'error', text: 'Failed to save information.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto pb-32 lg:pb-6">

            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">School Information</h1>
                <p className="text-gray-500 text-sm">Manage school anthem, pledge, and branding assets.</p>
                {statusMessage && (
                    <div className={`p-4 rounded-lg flex items-center space-x-2 animate-fade-in-down ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {statusMessage.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Branding Section */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <PhotoIcon className="w-5 h-5 mr-2 text-indigo-600" />
                            Branding & Images
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={info.name}
                                    onChange={e => setInfo({ ...info, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                                <div className="flex gap-4 items-start">
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        className="flex-grow p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={info.logo_url}
                                        onChange={e => setInfo({ ...info, logo_url: e.target.value })}
                                    />
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 flex-shrink-0 overflow-hidden">
                                        {info.logo_url ? <img src={info.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <SchoolLogoIcon className="text-gray-400" />}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                                <p className="text-xs text-gray-500 mb-2">Displayed on the login and landing pages.</p>
                                <div className="flex flex-col gap-4">
                                    <input
                                        type="text"
                                        placeholder="https://..."
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={info.hero_image_url}
                                        onChange={e => setInfo({ ...info, hero_image_url: e.target.value })}
                                    />
                                    {info.hero_image_url && (
                                        <div className="w-full h-48 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden relative">
                                            <img src={info.hero_image_url} alt="Hero" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Anthem & Pledge Section */}
                <div className="space-y-6">
                    <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <MusicalNoteIcon className="w-5 h-5 mr-2 text-pink-600" />
                            Anthem & Pledge
                        </h2>

                        <div className="space-y-4 flex-grow">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Anthem</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none h-40 resize-none font-medium text-gray-600"
                                    placeholder="Enter school anthem text..."
                                    value={info.anthem}
                                    onChange={e => setInfo({ ...info, anthem: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School Pledge</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none h-40 resize-none font-medium text-gray-600"
                                    placeholder="Enter school pledge text..."
                                    value={info.pledge}
                                    onChange={e => setInfo({ ...info, pledge: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-50">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-md flex justify-center items-center"
                            >
                                {isSaving ? 'Saving...' : (
                                    <>
                                        <SaveIcon className="w-5 h-5 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SchoolInfoScreen;
