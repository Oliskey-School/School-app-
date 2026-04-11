import React, { useState, useEffect } from 'react';
import { UserIcon, MailIcon, PhoneIcon, CameraIcon, BookOpenIcon } from '../../constants';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

import { toast } from 'react-hot-toast';
import { LockIcon, EyeIcon, EyeOffIcon } from 'lucide-react';

interface EditTeacherProfileScreenProps {
    onProfileUpdate?: (data?: { name: string; avatarUrl: string }) => void;
    teacherId?: string | null;
    currentUser?: any;
}

const EditTeacherProfileScreen: React.FC<EditTeacherProfileScreenProps> = ({ onProfileUpdate }) => {
    // 1. Use centralized Profile Context
    const { profile, updateProfile } = useProfile();
    const { user: authUser } = useAuth();
    const [saving, setSaving] = useState(false);

    // Form State initialized from Context
    const [name, setName] = useState(profile?.full_name || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [avatar, setAvatar] = useState(profile?.avatar_url || 'https://i.pravatar.cc/150?u=teacher');
    const [subjects, setSubjects] = useState<string[]>([]);

    // Account Security State
    const [username, setUsername] = useState(authUser?.user_metadata?.username || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [updatingUsername, setUpdatingUsername] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Fetch Teacher specific data (subjects)
    useEffect(() => {
        const fetchTeacherData = async () => {
            if (!profile?.id) return;
            try {
                // Use unified API client
                const teacher = await api.getTeacherById(profile.id);
                if (teacher?.subjects) {
                    setSubjects(Array.isArray(teacher.subjects) ? teacher.subjects : [teacher.subjects]);
                }
            } catch (err) {
                console.error('Error fetching teacher data:', err);
            }
        };
        fetchTeacherData();
    }, [profile?.id]);

    // Update local state when context profile changes (e.g. initial load)
    useEffect(() => {
        if (profile) {
            setName(profile.full_name || '');
            setEmail(profile.email || '');
            setPhone(profile.phone || '');
            setAvatar(profile.avatar_url || 'https://i.pravatar.cc/150?u=teacher');
        }
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
        if (!profile) return;
        setSaving(true);

        try {
            // 2. Use updateProfile from Context
            await updateProfile({
                full_name: name,
                avatar_url: avatar,
                phone
            });

            // 3. Update subjects in the 'teachers' table specifically
            if (profile.id) {
                await api.updateTeacher(profile.id, {
                    name: name, // Sync name back to teachers table too
                    subjects
                });
            }

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

    const handleUpdatePassword = async () => {
        if (!newPassword) return;
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setUpdatingPassword(true);
        try {
            await api.patch('/auth/update-password', { password: newPassword });
            toast.success('Password updated successfully!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.message || 'Error updating password');
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (!profile) return <div className="p-8 text-center text-gray-500">Profile not found.</div>;

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
                        {/* Subject field */}
                        <div>
                            <label htmlFor="subjects" className="block text-sm font-medium text-gray-700 mb-1">Subject Specialization (comma separated)</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                    <BookOpenIcon className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    id="subjects"
                                    value={subjects.join(', ')}
                                    onChange={(e) => setSubjects(e.target.value.split(',').map(s => s.trim()).filter(s => s !== ''))}
                                    className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Mathematics, English, etc."
                                />
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
                                                    className="w-full bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 transition-all"
                                                    placeholder="Enter new username"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleUpdateUsername}
                                                disabled={updatingUsername || !username || username === authUser?.user_metadata?.username}
                                                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                            >
                                                {updatingUsername ? '...' : 'Update'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <LockIcon className="w-4 h-4 text-purple-600" />
                                            <span className="text-xs font-bold text-purple-700 uppercase">Change Password</span>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                className="w-full bg-white border border-purple-200 text-gray-800 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 transition-all"
                                                placeholder="New Password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full bg-white border border-purple-200 text-gray-800 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-3 transition-all"
                                            placeholder="Confirm New Password"
                                        />

                                        <button
                                            type="button"
                                            onClick={handleUpdatePassword}
                                            disabled={updatingPassword || !newPassword}
                                            className="w-full py-3 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all"
                                        >
                                            {updatingPassword ? 'Updating...' : 'Change Password'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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
