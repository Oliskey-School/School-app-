import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronLeftIcon, CameraIcon, ChartBarIcon, BookOpenIcon, ClockIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';

interface EditProfileScreenProps {
    onBack: () => void;
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
    <div className="flex flex-col items-center p-3 bg-white rounded-2xl shadow-sm border border-gray-50 min-w-[90px]">
        <div className={`p-2 rounded-full mb-1 ${color} bg-opacity-10`}>
            {React.cloneElement(icon, { className: `w-5 h-5 ${color.replace('bg-', 'text-')}` })}
        </div>
        <span className="text-xl font-bold text-gray-800">{value}</span>
        <span className="text-xs text-gray-400 font-medium">{label}</span>
    </div>
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

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ onBack, user, onProfileUpdate }) => {
    const { updateProfile } = useProfile();
    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatarUrl || '');
    const [email, setEmail] = useState(user?.email || '');
    const [saving, setSaving] = useState(false);

    // Derived initials
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'ST';

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setAvatar(user.avatarUrl || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 500;
                    const MAX_HEIGHT = 500;
                    let width = img.width;
                    let height = img.height;
                    if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
                    else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    setAvatar(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateProfile({
                name,
                avatarUrl: avatar,
                // Email is usually not editable directly here without re-auth, so we skip it for now or assume read-only
            });

            toast.success('Profile updated successfully!');
            if (onProfileUpdate) {
                onProfileUpdate({ name, avatarUrl: avatar });
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Error updating profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-orange-400 to-orange-600 rounded-b-[3rem] z-0"></div>
            <div className="absolute top-10 right-0 w-64 h-64 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -left-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            {/* Header */}
            <header className="p-4 pt-6 pb-20 relative z-10">
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
                <div className="bg-white rounded-[2rem] shadow-xl shadow-orange-900/5 border border-white/50 min-h-[600px] flex flex-col items-center pt-12 pb-8 px-6 relative backdrop-blur-sm">

                    {/* Avatar Section */}
                    <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
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
                            <label className="absolute bottom-1 right-1 bg-gray-800 text-white p-2 rounded-full shadow-lg border-[3px] border-white hover:bg-gray-700 transition-transform hover:scale-110 active:scale-95 cursor-pointer">
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
                        <StatCard icon={<ClockIcon />} label="Attendance" value="98%" color="text-green-500 bg-green-500" />
                        <StatCard icon={<BookOpenIcon />} label="Assignments" value="12" color="text-blue-500 bg-blue-500" />
                        <StatCard icon={<ChartBarIcon />} label="Avg Grade" value="A" color="text-purple-500 bg-purple-500" />
                    </div>

                    {/* Form Fields */}
                    <div className="w-full space-y-2">
                        <div className="flex gap-4">
                            <div className="w-1/2">
                                <InputField label="Student ID" value={user?.code || "ST-2024-001"} readOnly />
                            </div>
                            <div className="w-1/2">
                                <InputField label="Class" value={user?.grade ? `${user.grade}${user.section || ''}` : "10-A"} readOnly />
                            </div>
                        </div>
                        <InputField label="Full Name" value={name} onChange={setName} />
                        <InputField label="Email Address" value={email} type="email" readOnly />
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] mt-8 disabled:opacity-70 disabled:cursor-wait">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </main>
        </div>
    );
};

export default EditProfileScreen;
