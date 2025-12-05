
import React, { useState } from 'react';
import { Student } from '../../types';
import { mockStudents } from '../../data';
import { BookOpenIcon, ClipboardListIcon, SUBJECT_COLORS, CakeIcon, UserIcon, NotificationIcon, SecurityIcon, LogoutIcon, SettingsIcon, ChevronLeftIcon, ChevronRightIcon, CameraIcon, LockIcon, ExamIcon } from '../../constants';

interface StudentProfileScreenProps {
  studentId: number;
  onLogout: () => void;
  navigateTo: (view: string, title: string, props?: any) => void;
}

// --- INLINE SETTINGS COMPONENTS ---

const StudentEditProfile: React.FC<{ student: Student }> = ({ student }) => {
    const [avatar, setAvatar] = useState(student.avatarUrl);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result as string);
            reader.readAsDataURL(event.target.files[0]);
        }
    };
    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-center">
                <div className="relative">
                    <img src={avatar} alt="Student" className="w-28 h-28 rounded-full object-cover shadow-md flex-shrink-0 aspect-square" />
                    <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-orange-500 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-orange-600">
                        <CameraIcon className="text-white h-4 w-4" />
                        <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                    </label>
                </div>
            </div>
            <div className="text-center">
                <button onClick={() => alert('Profile picture updated!')} className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg">Save</button>
            </div>
        </div>
    );
};

const StudentNotifications: React.FC = () => {
    const [enabled, setEnabled] = useState(true);
    return (
        <div className="p-4">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
                <p className="font-semibold text-gray-800">Enable Push Notifications</p>
                <button role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)} className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-orange-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`}/>
                </button>
            </div>
        </div>
    );
};

const StudentSecurity: React.FC = () => (
    <div className="p-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
            <button className="w-full flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                    <LockIcon className="w-5 h-5 text-gray-500"/>
                    <span className="font-semibold text-gray-700">Change Password</span>
                </div>
                <ChevronRightIcon />
            </button>
        </div>
    </div>
);


type SettingView = 'editProfile' | 'notifications' | 'security' | null;

const SettingsPlaceholder: React.FC = () => (
    <div className="flex-col items-center justify-center h-full text-center text-gray-500 bg-[#F0F2F5] border-l border-gray-300/80 hidden md:flex">
        <SettingsIcon className="w-24 h-24 text-gray-300" />
        <h1 className="text-3xl font-light text-gray-600 mt-4">Profile & Settings</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
            Select an item from the left to view your profile details or change settings.
        </p>
    </div>
);

const StudentProfileScreen: React.FC<StudentProfileScreenProps> = ({ studentId, onLogout, navigateTo }) => {
    const student = mockStudents.find(s => s.id === studentId)!;
    const [activeSetting, setActiveSetting] = useState<SettingView>(null);

    const settingsItems = [
        { id: 'cbtPortal', label: 'CBT & Exams', icon: <ExamIcon />, color: 'bg-indigo-100 text-indigo-500', action: () => navigateTo('cbtPortal', 'CBT Portal', {}) },
        { id: 'editProfile', label: 'Edit Profile', icon: <UserIcon />, color: 'bg-blue-100 text-blue-500' },
        { id: 'notifications', label: 'Notification Settings', icon: <NotificationIcon />, color: 'bg-green-100 text-green-500' },
        { id: 'security', label: 'Security', icon: <SecurityIcon />, color: 'bg-orange-100 text-orange-500' },
    ];

    const handleItemClick = (item: any) => {
        if (item.action) {
            item.action();
        } else {
            setActiveSetting(item.id as SettingView);
        }
    };

    const renderActiveSetting = () => {
        switch (activeSetting) {
            case 'editProfile': return <StudentEditProfile student={student} />;
            case 'notifications': return <StudentNotifications />;
            case 'security': return <StudentSecurity />;
            default: return <SettingsPlaceholder />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full bg-gray-50">
            {/* Left Pane */}
            <div className={`w-full md:w-[400px] md:flex-shrink-0 bg-gray-50 flex flex-col ${activeSetting ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                    <div className="bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                        <img src={student.avatarUrl} alt={student.name} className="w-20 h-20 rounded-full object-cover border-4 border-orange-100 flex-shrink-0 aspect-square"/>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                            <p className="text-gray-500 font-medium">Grade {student.grade}{student.section}</p>
                            {student.birthday && (
                                <div className="flex items-center space-x-2 mt-1 text-sm text-gray-500">
                                    <CakeIcon className="w-4 h-4" />
                                    <span>{new Date(student.birthday.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="bg-white rounded-xl shadow-sm p-2">
                        {settingsItems.map(item => (
                             <button key={item.id} onClick={() => handleItemClick(item)} className={`w-full flex items-center justify-between p-3 text-left rounded-lg transition-colors ${activeSetting === item.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                                <div className="flex items-center space-x-4">
                                    <div className={`p-2 rounded-lg ${item.color}`}>{item.icon}</div>
                                    <span className="font-semibold text-gray-700">{item.label}</span>
                                </div>
                                <ChevronRightIcon />
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 py-3 px-4 font-medium text-red-500 bg-white rounded-lg shadow-sm border hover:bg-red-50">
                        <LogoutIcon className="h-5 w-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>
            
            {/* Right Pane */}
            <div className={`flex-1 flex-col bg-gray-50 ${activeSetting ? 'flex' : 'hidden md:flex'}`}>
                {activeSetting && (
                    <div className="md:hidden p-2 bg-white border-b flex items-center">
                        <button onClick={() => setActiveSetting(null)} className="p-2 rounded-full hover:bg-gray-100">
                            <ChevronLeftIcon className="w-6 h-6 text-gray-600"/>
                        </button>
                        <h2 className="font-bold text-lg text-gray-800 ml-2">
                            {settingsItems.find(i => i.id === activeSetting)?.label}
                        </h2>
                    </div>
                )}
                <div className="flex-grow overflow-y-auto">
                    {renderActiveSetting()}
                </div>
            </div>
        </div>
    );
};

export default StudentProfileScreen;
