
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserIcon, MailIcon, PhoneIcon, CameraIcon, ChevronRightIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { LockIcon } from 'lucide-react';

interface EditParentProfileScreenProps {
    parentId?: string | null;
    navigateTo?: (view: string, title: string, props?: any) => void;
    onProfileUpdate?: (data?: { name: string; avatarUrl: string }) => void;
}

const EditParentProfileScreen: React.FC<EditParentProfileScreenProps> = ({ navigateTo, onProfileUpdate }) => {
    // 1. Use centralized Profile Context
    const { profile, updateProfile } = useProfile();
    const { user: authUser } = useAuth();

    // Form State from Context
    const [name, setName] = useState(profile?.full_name || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [avatar, setAvatar] = useState(profile?.avatar_url || 'https://i.pravatar.cc/150?u=parent');

    const [saving, setSaving] = useState(false);

    // Account Security State
    const [username, setUsername] = useState(authUser?.user_metadata?.username || '');
    const [updatingUsername, setUpdatingUsername] = useState(false);

    // Sync with context if it loads late or changes
    useEffect(() => {
        if (profile) {
            setName(profile.full_name || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            if (profile.avatar_url) setAvatar(profile.avatar_url);
        }
    }, [profile]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            // Instant local preview...
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
            // ...then upload to get a persistent URL that is saved (not a huge base64 blob).
            api.uploadAvatar(file).then(({ url }) => { if (url) setAvatar(url); }).catch(() => { });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSaving(true);

        try {
            // 2. Update via Context (Users Table)
            await updateProfile({
                full_name: name,
                email,
                avatar_url: avatar,
                phone
            });

            toast.success('Profile saved successfully!');
            if (onProfileUpdate) onProfileUpdate({ name, avatarUrl: avatar });

        } catch (error: any) {
            console.error('Error updating profile:', error);
            toast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateUsername = async () => {
        if (!username || username === authUser?.user_metadata?.username) return;
        setUpdatingUsername(true);
        try {
            await api.patch('/auth/update-username', { username });
            toast.success('Username updated successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Error updating username');
        } finally {
            setUpdatingUsername(false);
        }
    };

    if (!profile) return <div className="p-8 text-center text-gray-500">Profile not found.</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                    {/* Photo Upload */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <img src={avatar} alt="Parent Avatar" className="w-28 h-28 rounded-full object-cover shadow-md flex-shrink-0 aspect-square" />
                            <motion.label whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-green-500 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-green-600">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" name="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </motion.label>
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
                                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <MailIcon className="w-5 h-5" />
                                </span>
                                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <PhoneIcon className="w-5 h-5" />
                                </span>
                                <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500" />
                            </div>
                        </div>

                        {authUser?.user_metadata?.email_verified && (
                            <div className="mt-6 pt-6 border-t border-gray-200 space-y-6">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Account Security</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Username</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={e => setUsername(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-3 transition-all"
                                                    placeholder="Enter new username"
                                                />
                                            </div>
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                type="button"
                                                onClick={handleUpdateUsername}
                                                disabled={updatingUsername || !username || username === authUser?.user_metadata?.username}
                                                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                            >
                                                {updatingUsername ? '...' : 'Update'}
                                            </motion.button>
                                        </div>
                                    </div>

                                    {navigateTo && (
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="button"
                                            onClick={() => navigateTo('parentChangePassword', 'Change Password')}
                                            className="w-full flex items-center justify-between p-4 bg-green-50/50 rounded-xl border border-green-100 hover:bg-green-50 transition-colors"
                                        >
                                            <span className="flex items-center space-x-2">
                                                <LockIcon className="w-4 h-4 text-green-600" />
                                                <span className="text-xs font-bold text-green-700 uppercase">Change Password</span>
                                            </span>
                                            <ChevronRightIcon className="w-4 h-4 text-green-400" />
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                <div className="p-4 mt-auto bg-gray-50 border-t border-gray-200">
                    <motion.button
                        whileHover={{ scale: saving ? 1 : 1.01 }}
                        whileTap={{ scale: saving ? 1 : 0.97 }}
                        type="submit"
                        disabled={saving}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white transition-colors ${saving ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                </div>
            </form>
        </div>
    );
};

export default EditParentProfileScreen;
