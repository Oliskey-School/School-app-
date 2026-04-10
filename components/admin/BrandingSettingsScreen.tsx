import React, { useState, useEffect } from 'react';
import { SchoolLogoIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const BrandingSettingsScreen: React.FC = () => {
    const { currentSchool, refreshCurrentSchool } = useAuth();
    const [logo, setLogo] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentSchool) {
            setLogo((currentSchool as any).logo_url || currentSchool.logoUrl || null);
            // Assuming settings JSON contains primaryColor
            setPrimaryColor((currentSchool as any).settings?.primaryColor || currentSchool.primaryColor || '#4f46e5');
        }
    }, [currentSchool]);

    const handleSave = async () => {
        if (!currentSchool?.id) return;

        setIsLoading(true);
        try {
            let finalLogoUrl = logo;

            // If a new file was uploaded, upload it first
            if (logoFile) {
                const uploadResult = await api.uploadAvatar(logoFile);
                finalLogoUrl = uploadResult.url;
            }

            await api.updateSchool(currentSchool.id, {
                logo_url: finalLogoUrl,
                settings: {
                    ...((currentSchool as any).settings || {}),
                    primaryColor: primaryColor
                }
            });

            await refreshCurrentSchool();
            toast.success('Branding settings saved successfully');
        } catch (error: any) {
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogo(URL.createObjectURL(file));
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50">
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">School Logo</h3>
                <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border">
                        {logo ? <img src={logo} alt="School Logo" className="w-full h-full object-contain p-1" /> : <SchoolLogoIcon className="text-gray-300 w-10 h-10" />}
                    </div>
                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg text-sm">
                        <span>Upload Logo</span>
                        <input type="file" onChange={handleLogoChange} accept="image/*" className="hidden" />
                    </label>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Primary Color Theme</h3>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-14 h-14 p-0 border-none rounded-lg cursor-pointer" style={{ 'WebkitAppearance': 'none' }} />
                    </div>
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="p-2 border rounded-md font-mono text-sm" />
                </div>
            </div>
            <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
                {isLoading ? 'Saving...' : 'Save Branding Settings'}
            </button>
        </div>
    );
};
export default BrandingSettingsScreen;

