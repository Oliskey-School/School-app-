
import React, { useState, useEffect } from 'react';
import { UserIcon, MailIcon, PhoneIcon, CameraIcon, BookOpenIcon } from '../../constants';
// Removed direct supabase import as we use context now
// import { supabase } from '../../lib/supabase';

import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';

interface EditTeacherProfileScreenProps {
    onProfileUpdate?: (data?: { name: string; avatarUrl: string }) => void;
    teacherId?: string | null;
    currentUser?: any;
}

const EditTeacherProfileScreen: React.FC<EditTeacherProfileScreenProps> = ({ onProfileUpdate }) => {
    // 1. Use centralized Profile Context
    const { profile, updateProfile } = useProfile();
    const [loading, setLoading] = useState(false); // Context is already loaded usually
    const [saving, setSaving] = useState(false);

    // Form State initialized from Context
    const [name, setName] = useState(profile.name || '');
    const [email, setEmail] = useState(profile.email || '');
    const [phone, setPhone] = useState(profile.phone || '');
    const [avatar, setAvatar] = useState(profile.avatarUrl || 'https://i.pravatar.cc/150?u=teacher');

    // 'Subject' is not in the base User profile, so we might keep it static or remove it.
    // For now, we'll keep the UI but make it non-editable or just generic since it's not in Users table.
    const [subject] = useState('General');

    // Update local state when context profile changes (e.g. initial load)
    useEffect(() => {
        setName(profile.name || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
        setAvatar(profile.avatarUrl || 'https://i.pravatar.cc/150?u=teacher');
    }, [profile]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Compress Image
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Convert to base64 JPEG with compression
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    setAvatar(dataUrl);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // 2. Use updateProfile from Context
            // This updates the central 'users' table and local state
            await updateProfile({
                name,
                email,
                avatarUrl: avatar,
                // Phone is kept in local state/context but might not persist to DB 
                // if 'users' table lacks the column (as per Admin structure).
                phone
            });

            toast.success('Profile updated successfully!');

            if (onProfileUpdate) {
                onProfileUpdate({ name, avatarUrl: avatar });
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(`Failed to update profile: ${error.message || error}`);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <form onSubmit={handleSave} className="flex-grow flex flex-col">
                <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                    {/* Photo Upload */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <img src={avatar} alt="Teacher" className="w-28 h-28 rounded-full object-cover shadow-md flex-shrink-0 aspect-square" />
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-purple-700">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" name="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <UserIcon className="w-5 h-5" />
                                </span>
                                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" required />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <MailIcon className="w-5 h-5" />
                                </span>
                                <input type="email" id="email" value={email} disabled className="w-full pl-10 pr-3 py-3 text-gray-500 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed" />
                                <p className="text-xs text-gray-400 mt-1">Email cannot be changed directly.</p>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <PhoneIcon className="w-5 h-5" />
                                </span>
                                <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500" />
                            </div>
                        </div>
                        {/* Subject field kept for UI consistency but read-only as it's not in standard profile */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <BookOpenIcon className="w-5 h-5" />
                                </span>
                                <input type="text" id="subject" value={subject} disabled className="w-full pl-10 pr-3 py-3 text-gray-500 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed" />
                            </div>
                        </div>
                    </div>
                </main>

                {/* Action Button */}
                <div className="p-4 mt-auto bg-gray-50 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-70 disabled:cursor-wait"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditTeacherProfileScreen;
