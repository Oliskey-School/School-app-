
import React, { useState } from 'react';
import {
  EditIcon,
  NotificationIcon,
  SecurityIcon,
  HelpIcon,
  LogoutIcon,
  ChevronRightIcon,
  MegaphoneIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  UsersIcon,
  CameraIcon,
  HelpingHandIcon,
  ClipboardListIcon,
  SettingsIcon,
  ChevronLeftIcon
} from '../../constants';
import { mockParents } from '../../data';
import EditParentProfileScreen from './EditParentProfileScreen';
import LearningResourcesScreen from './LearningResourcesScreen';
import SchoolPoliciesScreen from './SchoolPoliciesScreen';
import PTAMeetingScreen from './PTAMeetingScreen';
import ParentPhotoGalleryScreen from './ParentPhotoGalleryScreen';
import VolunteeringScreen from './VolunteeringScreen';
import PermissionSlipScreen from './PermissionSlipScreen';
import FeedbackScreen from './FeedbackScreen';
import ParentNotificationSettingsScreen from './ParentNotificationSettingsScreen';
import ParentSecurityScreen from './ParentSecurityScreen';
import { useProfile } from '../../context/ProfileContext';

interface ParentProfileScreenProps {
  onLogout: () => void;
  navigateTo: (view: string, title: string, props?: any) => void;
  forceUpdate: () => void;
  parentId?: number;
}

type SettingView = 'editParentProfile' | 'learningResources' | 'schoolPolicies' | 'ptaMeetings' | 'photoGallery' | 'volunteering' | 'permissionSlips' | 'feedback' | 'notificationSettings' | 'securitySettings' | null;

const SettingsPlaceholder: React.FC = () => (
  <div className="flex-col items-center justify-center h-full text-center text-gray-500 bg-[#F0F2F5] border-l border-gray-300/80 hidden md:flex">
    <SettingsIcon className="w-24 h-24 text-gray-300" />
    <h1 className="text-3xl font-light text-gray-600 mt-4">More Options</h1>
    <p className="mt-2 text-sm text-gray-500 max-w-sm">
      Select an item from the left to view more information and settings.
    </p>
  </div>
);

const ParentProfileScreen: React.FC<ParentProfileScreenProps> = ({ onLogout, navigateTo, forceUpdate, parentId }) => {
  const { profile } = useProfile();
  const [activeSetting, setActiveSetting] = useState<SettingView>(null);

  const menuItems = [
    { id: 'editParentProfile', icon: <EditIcon />, label: 'Edit Profile' },
    { id: 'learningResources', icon: <BookOpenIcon />, label: 'Learning Resources' },
    { id: 'schoolPolicies', icon: <ShieldCheckIcon />, label: 'School Policies' },
    { id: 'ptaMeetings', icon: <UsersIcon />, label: 'PTA Meetings' },
    { id: 'photoGallery', icon: <CameraIcon />, label: 'Photo Gallery' },
    { id: 'volunteering', icon: <HelpingHandIcon />, label: 'Volunteer' },
    { id: 'permissionSlips', icon: <ClipboardListIcon />, label: 'Permission Slips' },
    { id: 'feedback', icon: <MegaphoneIcon />, label: 'Feedback & Support' },
    { id: 'notificationSettings', icon: <NotificationIcon />, label: 'Notification Settings' },
    { id: 'securitySettings', icon: <SecurityIcon />, label: 'Security & Password' },
    { id: 'help', icon: <HelpIcon />, label: 'Help Center' },
  ];

  const theme = {
    iconColors: ['bg-blue-100 text-blue-500', 'bg-orange-100 text-orange-500', 'bg-indigo-100 text-indigo-500', 'bg-teal-100 text-teal-500', 'bg-pink-100 text-pink-500', 'bg-sky-100 text-sky-500', 'bg-lime-100 text-lime-500', 'bg-green-100 text-green-500', 'bg-amber-100 text-amber-500', 'bg-red-100 text-red-500', 'bg-purple-100 text-purple-500']
  };

  const handleItemClick = (id: string) => {
    if (id === 'help') {
      toast('Help Center coming soon!', { icon: 'ℹ️' });
    } else {
      setActiveSetting(id as SettingView);
    }
  };

  const renderActiveSetting = () => {
    switch (activeSetting) {
      case 'editParentProfile': return <EditParentProfileScreen parentId={parentId} />;
      case 'learningResources': return <LearningResourcesScreen />;
      case 'schoolPolicies': return <SchoolPoliciesScreen />;
      case 'ptaMeetings': return <PTAMeetingScreen />;
      case 'photoGallery': return <ParentPhotoGalleryScreen />;
      case 'volunteering': return <VolunteeringScreen />;
      case 'permissionSlips': return <PermissionSlipScreen />;
      case 'feedback': return <FeedbackScreen forceUpdate={forceUpdate} />;
      case 'notificationSettings': return <ParentNotificationSettingsScreen />;
      case 'securitySettings': return <ParentSecurityScreen />;
      default: return <SettingsPlaceholder />;
    }
  };


  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50">
      {/* Left Pane */}
      <div className={`w-full md:w-[400px] md:flex-shrink-0 bg-gray-50 flex flex-col ${activeSetting ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center p-4 space-x-4 bg-white rounded-xl shadow-sm">
            <img src={profile.avatarUrl} alt="Parent Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0 aspect-square" />
            <div>
              <h3 className="text-xl font-bold text-gray-800">{profile.name}</h3>
              <p className="text-sm text-gray-500">{profile.email}</p>
              {profile.schoolId && (
                <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                  ID: {profile.schoolId}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-2">
            {menuItems.map((item, index) => (
              <button key={item.label} onClick={() => handleItemClick(item.id)} className={`w-full flex items-center justify-between p-3 text-left rounded-lg transition-colors ${activeSetting === item.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${theme.iconColors[index % theme.iconColors.length]}`}>
                    {React.cloneElement(item.icon, { className: 'h-5 w-5' })}
                  </div>
                  <span className="font-semibold text-gray-700">{item.label}</span>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
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
              <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="font-bold text-lg text-gray-800 ml-2">
              {menuItems.find(i => i.id === activeSetting)?.label}
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

export default ParentProfileScreen;
