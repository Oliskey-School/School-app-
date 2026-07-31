import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ChevronLeftIcon, CameraIcon, ChartBarIcon, BookOpenIcon, ClockIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { LockIcon, UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useUserIdentity } from '../../lib/hooks/useUserIdentity';

interface EditProfileScreenProps {
    onBack: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
    user?: {
        id?: string;
        name: string;
        avatarUrl?: string;
        email?: string;
        grade?: string | number;
        section?: string;
        code?: string; // Student ID code
    };
    onProfileUpdate?: (data: { name: string; avatarUrl: string }) => void;
}

const StatCard: React.FC<{ icon: any, label: string, value: string, color: string }> = ({ icon, label, value, color }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-50 min-w-[90px]"
    >
        <div className={`p-2 rounded-full mb-1 ${color} bg-opacity-10`}>
            {React.cloneElement(icon, { className: `w-5 h-5 ${color.replace('bg-', 'text-')}` })}
        </div>
        <span className="text-xl font-bold text-gray-800">{value}</span>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
    </motion.div>
);

const InputField: React.FC<{ label: string, value: string, onChange?: (val: string) => void, type?: string, readOnly?: boolean }> = ({ label, value, onChange, type = "text", readOnly = false }) => (
    <div className="w-full mb-4">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">{label}</label>
        <div className="relative">
            <input
                type={type}
                value={value}
                onChange={e => onChange && onChange(e.target.value)}
                readOnly={readOnly}
                className={`w-full bg-gray-50 border border-gray-100 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent block p-3 transition-all ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
            />
            {!readOnly && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
            )}
        </div>
    </div>
);

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onBack, navigateTo, user, onProfileUpdate }) => {
    const { updateProfile } = useProfile();
    const { user: authUser } = useAuth();
    const { customId, formatId } = useUserIdentity();
    const { t } = useTranslation();
    const [name, setName] = useState(user?.name || '');
    const [displayName, setDisplayName] = useState('');
    const [avatar, setAvatar] = useState(user?.avatarUrl || '');
    const [email, setEmail] = useState(user?.email || '');
    const [username, setUsername] = useState(authUser?.user_metadata?.username || '');
    const [saving, setSaving] = useState(false);
    const [updatingUsername, setUpdatingUsername] = useState(false);
    const [stats, setStats] = useState({
        attendanceRate: 0,
        assignmentsSubmitted: 0,
        averageScore: 0
    });

    // Load the student's OWN real profile + stats so the form shows current data
    // (name/email/photo) even when the navigation didn't pass them, and so the
    // stat cards reflect the student's real attendance/assignments/average — not a
    // school-wide figure. This also prevents saving a blank name over a real one.
    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [profile, statData] = await Promise.all([
                    api.getMyStudentProfile().catch(() => null),
                    api.getMyStudentStats().catch(() => null),
                ]);
                if (!active) return;
                if (profile) {
                    setName(prev => prev || profile.full_name || profile.name || '');
                    setDisplayName(prev => prev || profile.display_name || '');
                    setEmail(prev => prev || profile.email || profile.user?.email || '');
                    setAvatar(prev => prev || profile.avatar_url || profile.avatarUrl || '');
                }
                if (statData) {
                    setStats({
                        attendanceRate: Number(statData.attendanceRate ?? 0),
                        assignmentsSubmitted: Number(statData.assignmentsSubmitted ?? 0),
                        averageScore: Number(statData.averageScore ?? 0),
                    });
                }
            } catch (err) {
                console.error('Error loading profile/stats for edit profile:', err);
            }
        };
        load();
        return () => { active = false; };
    }, []);

    // Derived initials
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ST';

    useEffect(() => {
        // Seed from the passed user, but never overwrite with blanks — the profile
        // fetch above fills anything missing, so an empty prop can't wipe the name.
        if (user) {
            if (user.name) setName(user.name);
            if (user.avatarUrl) setAvatar(user.avatarUrl);
            if (user.email) setEmail(user.email);
        }
    }, [user]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Preview locally immediately
            const objectUrl = URL.createObjectURL(file);
            setAvatar(objectUrl);

            // Store file for upload on save
            // We can't easily store the file in the state if we strictly follow the current pattern, 
            // but we can modify the state or just upload immediately? 
            // Better to upload on "Save" to avoid orphan files? 
            // Or upload immediately and get URL?
            // Let's upload immediately as it's a smoother UX for "preview" effectively becoming "remote"

            const toastId = toast.loading('Uploading image...');
            try {
                const result = await api.uploadAvatar(file);
                setAvatar(result.url);
                toast.success('Image uploaded ready to save', { id: toastId });
            } catch (error: any) {
                toast.error('Error uploading image: ' + error.message, { id: toastId });
                console.error('Upload error:', error);
            }
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Please enter your full name before saving.');
            return;
        }
        setSaving(true);
        try {
            await updateProfile({
                full_name: name,
                avatar_url: avatar,
                display_name: displayName.trim() || undefined,
            } as any);

            toast.success('Profile updated successfully!');
            if (onProfileUpdate) {
                onProfileUpdate({ name, avatarUrl: avatar });
            }
            onBack?.(); // Go back after successful save
        } catch (err: any) {
            console.error(err);
            toast.error('Error updating profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateUsername = async () => {
        if (!username || username === authUser?.user_metadata?.username) return;
        setUpdatingUsername(true);
        try {
            await api.updateStudent(authUser?.id || '', { school_generated_id: username });
            toast.success('Username updated successfully!');
            // Updated metadata will be synced on next session or manual refresh
        } catch (err: any) {
            toast.error(err.message || 'Error updating username');
        } finally {
            setUpdatingUsername(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-orange-400 to-orange-600 rounded-b-[3rem] z-0"></div>
            <div className="absolute top-10 right-0 w-64 h-64 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -left-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            {/* Header */}
            <header className="p-4 pt-6 pb-24 relative z-10">
                <div className="flex justify-between items-center mb-6 px-2 text-white">
                    <div className="flex items-center">
                        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                            <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <h1 className="text-2xl font-bold tracking-tight ml-2">My Profile</h1>
                    </div>
                </div>
            </header>

            {/* Main Content Card */}
            <main className="flex-grow px-4 -mt-16 relative z-10 pb-6 overflow-y-auto hide-scrollbar">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="bg-white rounded-[2rem] shadow-xl shadow-orange-900/5 border border-white/50 min-h-[600px] flex flex-col items-center pt-20 pb-8 px-6 relative backdrop-blur-sm">

                    {/* Avatar Section */}
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full p-1 bg-white shadow-xl ring-4 ring-orange-50 ring-offset-2 overflow-hidden">
                                {avatar ? (
                                    <img src={avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-orange-100 flex items-center justify-center text-orange-400">
                                        <span className="text-4xl font-bold">{initials}</span>
                                    </div>
                                )}
                            </div>
                            {/* Pro Badge */}
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border-2 border-white transform translate-x-1/4 -translate-y-1/4">
                                PRO
                            </div>
                            {/* Camera Button */}
                            <label className="absolute bottom-1 right-1 bg-gray-800 text-white p-2 rounded-full shadow-lg border-[3px] border-white hover:bg-gray-700 transition-transform hover:scale-110 active:scale-95 cursor-pointer" aria-label="Change profile photo">
                                <CameraIcon className="w-4 h-4" />
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    {/* Name & Role */}
                    <div className="text-center mt-2 mb-8">
                        <h2 className="text-2xl font-bold text-gray-800">{name}</h2>
                        <p className="text-sm text-gray-500 font-medium">Student</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="flex justify-between w-full gap-3 mb-8">
                        <StatCard icon={<ClockIcon />} label="Attendance" value={`${stats.attendanceRate}%`} color="text-green-500 bg-green-500" />
                        <StatCard icon={<BookOpenIcon />} label="Assignments" value={stats.assignmentsSubmitted.toString()} color="text-blue-500 bg-blue-500" />
                        <StatCard icon={<ChartBarIcon />} label="Avg Grade" value={stats.averageScore >= 80 ? 'A' : stats.averageScore >= 70 ? 'B' : stats.averageScore >= 60 ? 'C' : 'D'} color="text-purple-500 bg-purple-500" />
                    </div>

                    {/* Form Fields */}
                    <div className="w-full space-y-2">
                        <div className="flex gap-4">
                            <div className="w-full">
                                <InputField
                                    label="Student ID"
                                    value={formatId(customId, 'student') || 'Pending Generation'}
                                    readOnly
                                />
                            </div>
                        </div>
                        <InputField label="Full Name" value={name} onChange={setName} />
                        <div className="w-full mb-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Chat Display Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="How others see you in chat (optional)"
                                    maxLength={40}
                                    className="w-full bg-gray-50 border border-gray-100 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent block p-3 transition-all"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1 ml-1">This name shows in chats instead of your full name</p>
                        </div>
                        <InputField label="Email Address" value={email} type="email" readOnly />

                        {/* Language preference — saved to the account, follows the user across devices */}
                        <div className="w-full mb-4">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">{t('common.language')}</label>
                            <LanguageSwitcher variant="inline" persistToAccount />
                        </div>

                        {authUser?.user_metadata?.email_verified && (
                            <div className="mt-8 pt-8 border-t border-gray-100 space-y-6 w-full">
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Account Security</h3>

                                <div className="space-y-4">
                                    <div className="w-full">
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 ml-1">Username</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={e => setUsername(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-100 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent block p-3 transition-all"
                                                    placeholder="Enter new username"
                                                />
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={handleUpdateUsername}
                                                disabled={updatingUsername || !username || username === authUser?.user_metadata?.username}
                                                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                            >
                                                {updatingUsername ? '...' : 'Update'}
                                            </motion.button>
                                        </div>
                                    </div>

                                    {navigateTo && (
                                        <motion.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => navigateTo('changePassword', 'Change Password')}
                                            className="w-full flex items-center justify-between p-4 bg-orange-50/50 rounded-2xl border border-orange-100 hover:bg-orange-50 transition-colors"
                                        >
                                            <span className="flex items-center space-x-2">
                                                <LockIcon className="w-4 h-4 text-orange-500" />
                                                <span className="text-xs font-bold text-orange-700 uppercase">Change Password</span>
                                            </span>
                                            <ChevronLeftIcon className="w-4 h-4 text-orange-400 rotate-180" />
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <motion.button
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-shadow mt-8 disabled:opacity-70 disabled:cursor-wait">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </motion.button>
                </motion.div>
            </main>
        </div>
    );
};

export default EditProfileScreen;
