import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SchoolLogoIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const BrandingSettingsScreen: React.FC = () => {
    const { currentSchool, refreshCurrentSchool } = useAuth();
    const [logo, setLogo] = useState<string | null>(null);
    // The logo URL as it was when the form was seeded. Save only sends logo_url
    // when it differs — re-sending the seeded value wrote an OLD logo back over
    // a newer one saved elsewhere (seen on a real school, 2026-09-18).
    const [seededLogo, setSeededLogo] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentSchool) {
            const current = (currentSchool as any).logo_url || currentSchool.logoUrl || null;
            setLogo(current);
            setSeededLogo(current);
            // Assuming settings JSON contains primaryColor
            setPrimaryColor((currentSchool as any).settings?.primaryColor || currentSchool.primaryColor || '#4f46e5');
        }
        // Seed only when the SCHOOL changes: AuthContext refreshes currentSchool in
        // the background, and re-seeding then replaced a freshly chosen logo with
        // the old one before the admin could press Save.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSchool?.id]);

    const handleSave = async () => {
        if (!currentSchool?.id) return;
        if (uploading) { toast.error('Please wait for the logo to finish uploading.'); return; }

        setIsLoading(true);
        try {
            const updates: Record<string, unknown> = {
                settings: {
                    ...((currentSchool as any).settings || {}),
                    primaryColor: primaryColor
                }
            };
            // Only a NEW logo is sent. The seeded value is never re-sent, so this
            // screen can no longer overwrite a logo saved from another screen or
            // device with a stale copy.
            if (logo && logo !== seededLogo) updates.logo_url = logo;

            await api.updateSchool(currentSchool.id, updates);

            await refreshCurrentSchool();
            if (updates.logo_url) setSeededLogo(logo);
            toast.success('Branding settings saved successfully');
        } catch (error: any) {
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Upload the moment a file is chosen (same pattern as profile photos): the
    // admin sees a preview, then a clear success or failure, and Save only ever
    // stores a URL that already exists in storage. Uploading at Save time meant a
    // picked file that never made it into state left the OLD logo saved with no
    // error shown.
    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-picking the same file
        if (!file) return;
        const preview = URL.createObjectURL(file);
        setLogo(preview);
        setUploading(true);
        const toastId = toast.loading('Uploading logo...');
        try {
            // Not uploadAvatar: that writes to the signed-in admin's OWN fixed
            // profile-photo object, so saving a school logo replaced the admin's
            // photo (and vice versa). The logo gets its own random-named object
            // under the school's branding folder.
            const uploadResult = await api.uploadFile('general', 'branding/', file);
            const url = uploadResult.publicUrl || uploadResult.url || '';
            if (!url) throw new Error('No file address was returned');
            setLogo(url);
            toast.success('Logo uploaded — press Save to apply it', { id: toastId });
        } catch (error: any) {
            setLogo(seededLogo);
            toast.error(`Logo upload failed: ${error?.message || 'please try again'}`, { id: toastId });
        } finally {
            setUploading(false);
            URL.revokeObjectURL(preview);
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white p-4 rounded-xl shadow-sm">
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
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-3">Primary Color Theme</h3>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-14 h-14 p-0 border-none rounded-lg cursor-pointer" style={{ 'WebkitAppearance': 'none' }} />
                    </div>
                    <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="p-2 border rounded-md font-mono text-sm" />
                </div>
            </motion.div>
            <motion.button
                whileHover={!isLoading ? { scale: 1.01 } : {}} whileTap={!isLoading ? { scale: 0.98 } : {}}
                onClick={handleSave}
                disabled={isLoading || uploading}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
                {isLoading ? 'Saving...' : 'Save Branding Settings'}
            </motion.button>
        </div>
    );
};
export default BrandingSettingsScreen;

