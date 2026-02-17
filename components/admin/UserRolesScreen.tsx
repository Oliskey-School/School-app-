
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
    ExamIcon, AttendanceIcon, ReportIcon, MegaphoneIcon, BookOpenIcon,
    ViewGridIcon, BusIcon, ReceiptIcon, UsersIcon, AnalyticsIcon, AIIcon
} from '../../constants';
import { RoleName } from '../../types';

// Default roles structure replacing mock data
const DEFAULT_ROLES_PERMISSIONS = [
    {
        id: 'Admin' as RoleName,
        name: 'Administrator',
        description: 'Full access to all system features',
        icon: UsersIcon,
        permissions: [
            { id: 'manage-users', label: 'Manage Users', enabled: true },
            { id: 'manage-finances', label: 'Manage Finances', enabled: true },
            { id: 'view-analytics', label: 'View Analytics', enabled: true },
            { id: 'send-announcements', label: 'Send Announcements', enabled: true },
        ]
    },
    {
        id: 'Teacher' as RoleName,
        name: 'Teacher',
        description: 'Manage classes, students, and academic records',
        icon: BookOpenIcon,
        permissions: [
            { id: 'mark-attendance', label: 'Mark Attendance', enabled: true },
            { id: 'enter-results', label: 'Enter Results', enabled: true },
            { id: 'manage-own-exams', label: 'Manage Exams', enabled: true },
            { id: 'access-library', label: 'Access Library', enabled: true },
        ]
    },
    {
        id: 'Student' as RoleName,
        name: 'Student',
        description: 'View personal records and learning materials',
        icon: ViewGridIcon,
        permissions: [
            { id: 'view-reports', label: 'View Report Cards', enabled: true },
            { id: 'view-attendance', label: 'View Attendance', enabled: true },
            { id: 'view-timetable', label: 'View Timetable', enabled: true },
            { id: 'use-study-buddy', label: 'Use AI Study Buddy', enabled: true },
        ]
    },
    {
        id: 'Parent' as RoleName,
        name: 'Parent',
        description: 'Monitor child performance and payments',
        icon: UsersIcon,
        permissions: [
            { id: 'view-reports', label: 'View Child Reports', enabled: true },
            { id: 'view-fees', label: 'View & Pay Fees', enabled: true },
            { id: 'track-bus', label: 'Track School Bus', enabled: true },
        ]
    }
];

const PermissionToggle = ({ enabled, onToggle, disabled = false }: { enabled: boolean, onToggle: () => void, disabled?: boolean }) => (
    <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        disabled={disabled}
        className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${enabled ? 'bg-sky-600' : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
        />
    </button>
);

const permissionIcons: { [key: string]: React.ReactNode } = {
    'manage-users': <UsersIcon className="w-5 h-5" />,
    'manage-finances': <ReceiptIcon className="w-5 h-5" />,
    'view-analytics': <AnalyticsIcon className="w-5 h-5" />,
    'send-announcements': <MegaphoneIcon className="w-5 h-5" />,
    'manage-own-exams': <ExamIcon className="w-5 h-5" />,
    'mark-attendance': <AttendanceIcon className="w-5 h-5" />,
    'enter-results': <ReportIcon className="w-5 h-5" />,
    'access-library': <BookOpenIcon className="w-5 h-5" />,
    'view-reports': <ReportIcon className="w-5 h-5" />,
    'view-attendance': <AttendanceIcon className="w-5 h-5" />,
    'track-bus': <BusIcon className="w-5 h-5" />,
    'view-fees': <ReceiptIcon className="w-5 h-5" />,
    'view-timetable': <ViewGridIcon className="w-5 h-5" />,
    'view-own-results': <ReportIcon className="w-5 h-5" />,
    'use-study-buddy': <AIIcon className="w-5 h-5" />,
};

const UserRolesScreen: React.FC = () => {
    const { currentSchool } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [permissionsState, setPermissionsState] = useState<{ [key in RoleName]?: { [key: string]: boolean } }>(() => {
        const initialState: { [key in RoleName]?: { [key: string]: boolean } } = {};
        DEFAULT_ROLES_PERMISSIONS.forEach(role => {
            initialState[role.id] = {};
            role.permissions.forEach(perm => {
                initialState[role.id]![perm.id] = perm.enabled;
            });
        });
        return initialState;
    });

    // 1. Fetch Overrides from DB on Load
    useEffect(() => {
        if (!currentSchool?.id) return;

        const fetchPermissions = async () => {
            try {
                const { data, error } = await supabase
                    .from('role_permissions')
                    .select('role, permission_id, enabled')
                    .eq('school_id', currentSchool.id);

                if (error) throw error;

                if (data && data.length > 0) {
                    setPermissionsState(prev => {
                        const newState = { ...prev };
                        data.forEach((p: any) => {
                            if (newState[p.role as RoleName]) {
                                newState[p.role as RoleName]![p.permission_id] = p.enabled;
                            }
                        });
                        return newState;
                    });
                }
            } catch (err) {
                console.error("Failed to load permissions:", err);
            }
        };

        fetchPermissions();
    }, [currentSchool?.id]);

    const handleToggle = (roleId: RoleName, permId: string) => {
        if (roleId === 'Admin') return; 
        setPermissionsState(prev => ({
            ...prev,
            [roleId]: {
                ...prev[roleId],
                [permId]: !prev[roleId]![permId],
            },
        }));
    };

    const handleSave = async () => {
        if (!currentSchool?.id) {
            toast.error("School context missing.");
            return;
        }
        setIsLoading(true);

        try {
            const updates = [];
            // Prepare Upsert Data
            for (const role of DEFAULT_ROLES_PERMISSIONS) {
                if (role.id === 'Admin') continue;
                
                const rolePerms = permissionsState[role.id];
                if (!rolePerms) continue;

                for (const permId of Object.keys(rolePerms)) {
                    updates.push({
                        school_id: currentSchool.id,
                        role: role.id,
                        permission_id: permId,
                        enabled: rolePerms[permId]
                    });
                }
            }

            const { error } = await supabase
                .from('role_permissions')
                .upsert(updates, { onConflict: 'school_id,role,permission_id' });

            if (error) throw error;
            toast.success('Permissions saved successfully!');
        } catch (error: any) {
            console.error('Save failed:', error);
            toast.error('Failed to save: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-20">
                {DEFAULT_ROLES_PERMISSIONS.map(role => {
                    const IconComponent = role.icon;
                    return (
                        <div key={role.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-4 flex items-center space-x-4 bg-gray-50 border-b border-gray-200">
                                <div className="text-sky-500">
                                    <IconComponent className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800">{role.name}</h3>
                                    <p className="text-sm text-gray-500">{role.description}</p>
                                </div>
                            </div>
                            <ul className="divide-y divide-gray-100 p-2">
                                {role.permissions.map(perm => (
                                    <li key={perm.id} className="flex justify-between items-center p-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="text-gray-500">{permissionIcons[perm.id]}</div>
                                            <span className="font-medium text-gray-700">{perm.label}</span>
                                        </div>
                                        <PermissionToggle
                                            enabled={permissionsState[role.id]?.[perm.id] ?? false}
                                            onToggle={() => handleToggle(role.id, perm.id)}
                                            disabled={role.id === 'Admin'}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </main>

            <div className="p-4 bg-white border-t border-gray-200 sticky bottom-0">
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white ${isLoading ? 'bg-sky-400' : 'bg-sky-500 hover:bg-sky-600'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500`}
                >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default UserRolesScreen;