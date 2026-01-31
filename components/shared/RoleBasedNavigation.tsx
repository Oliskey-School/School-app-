import React from 'react';
import { useProfile } from '../../context/ProfileContext';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    Calendar,
    DollarSign,
    Settings,
    FileText,
    Bell,
    MessageSquare,
    ClipboardCheck,
    UserCheck,
    ShieldCheck,
    Building,
    TrendingUp,
    Award,
    Briefcase,
    FileCheck,
    AlertTriangle
} from 'lucide-react';

interface NavigationItem {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
}

const navigationItems: NavigationItem[] = [
    // Admin Navigation
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { label: 'Students', path: '/admin/students', icon: Users, roles: ['admin'] },
    { label: 'Manage Teachers', path: '/admin/teachers', icon: GraduationCap, roles: ['admin'] },
    { label: 'Parents', path: '/admin/parents', icon: Users, roles: ['admin'] },
    { label: 'Reports', path: '/admin/reports', icon: FileText, roles: ['admin'] },
    { label: 'Settings', path: '/admin/settings', icon: Settings, roles: ['admin'] },

    // Teacher Navigation
    { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard, roles: ['teacher'] },
    { label: 'My Classes', path: '/teacher/classes', icon: BookOpen, roles: ['teacher'] },
    { label: 'Attendance', path: '/teacher/attendance', icon: ClipboardCheck, roles: ['teacher'] },
    { label: 'Assignments', path: '/teacher/assignments', icon: FileText, roles: ['teacher'] },
    { label: 'Gradebook', path: '/teacher/gradebook', icon: Award, roles: ['teacher'] },
    { label: 'Students', path: '/teacher/students', icon: Users, roles: ['teacher'] },

    // Parent Navigation
    { label: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard, roles: ['parent'] },
    { label: 'My Children', path: '/parent/children', icon: Users, roles: ['parent'] },
    { label: 'Attendance', path: '/parent/attendance', icon: ClipboardCheck, roles: ['parent'] },
    { label: 'Fees', path: '/parent/fees', icon: DollarSign, roles: ['parent'] },
    { label: 'Messages', path: '/parent/messages', icon: MessageSquare, roles: ['parent'] },
    { label: 'Calendar', path: '/parent/calendar', icon: Calendar, roles: ['parent'] },

    // Student Navigation
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard, roles: ['student'] },
    { label: 'My Classes', path: '/student/classes', icon: BookOpen, roles: ['student'] },
    { label: 'Assignments', path: '/student/assignments', icon: FileText, roles: ['student'] },
    { label: 'Grades', path: '/student/grades', icon: Award, roles: ['student'] },
    { label: 'Attendance', path: '/student/attendance', icon: ClipboardCheck, roles: ['student'] },
    { label: 'Library', path: '/student/library', icon: BookOpen, roles: ['student'] },

    // Proprietor Navigation
    { label: 'Dashboard', path: '/proprietor/dashboard', icon: LayoutDashboard, roles: ['proprietor'] },
    { label: 'Schools Overview', path: '/proprietor/schools', icon: Building, roles: ['proprietor'] },
    { label: 'Financial Reports', path: '/proprietor/finance', icon: DollarSign, roles: ['proprietor'] },
    { label: 'Staff Analytics', path: '/proprietor/analytics', icon: TrendingUp, roles: ['proprietor'] },
    { label: 'Compliance', path: '/proprietor/compliance', icon: ShieldCheck, roles: ['proprietor'] },

    // Inspector Navigation
    { label: 'Dashboard', path: '/inspector/dashboard', icon: LayoutDashboard, roles: ['inspector'] },
    { label: 'School Visits', path: '/inspector/visits', icon: Building, roles: ['inspector'] },
    { label: 'Compliance Reports', path: '/inspector/reports', icon: FileCheck, roles: ['inspector'] },
    { label: 'Inspection History', path: '/inspector/history', icon: FileText, roles: ['inspector'] },

    // Exam Officer Navigation
    { label: 'Dashboard', path: '/examofficer/dashboard', icon: LayoutDashboard, roles: ['examofficer'] },
    { label: 'Exam Scheduling', path: '/examofficer/schedule', icon: Calendar, roles: ['examofficer'] },
    { label: 'Results Entry', path: '/examofficer/results', icon: FileText, roles: ['examofficer'] },
    { label: 'Analytics', path: '/examofficer/analytics', icon: TrendingUp, roles: ['examofficer'] },
    { label: 'Candidates', path: '/examofficer/candidates', icon: Users, roles: ['examofficer'] },

    // Compliance Officer Navigation  
    { label: 'Dashboard', path: '/compliance/dashboard', icon: LayoutDashboard, roles: ['complianceofficer'] },
    { label: 'Safety Logs', path: '/compliance/safety', icon: ShieldCheck, roles: ['complianceofficer'] },
    { label: 'Policy Management', path: '/compliance/policies', icon: FileCheck, roles: ['complianceofficer'] },
    { label: 'Audit Trail', path: '/compliance/audit', icon: ClipboardCheck, roles: ['complianceofficer'] },
    { label: 'Reports', path: '/compliance/reports', icon: FileText, roles: ['complianceofficer'] },
];

interface RoleBasedNavigationProps {
    className?: string;
    currentPath?: string;
    onNavigate?: (path: string) => void;
}

const RoleBasedNavigation: React.FC<RoleBasedNavigationProps> = ({
    className = '',
    currentPath = '',
    onNavigate
}) => {
    const { profile } = useProfile();

    if (!profile?.role) {
        return null;
    }

    // Filter navigation items based on user role
    const filteredItems = navigationItems.filter(item =>
        item.roles.includes(profile.role)
    );

    const handleClick = (path: string) => {
        if (onNavigate) {
            onNavigate(path);
        }
    };

    return (
        <nav className={`space-y-1 ${className}`}>
            {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.path;

                return (
                    <button
                        key={item.path}
                        onClick={() => handleClick(item.path)}
                        className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
              ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-700 hover:bg-gray-100'
                            }
            `}
                    >
                        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                );
            })}
        </nav>
    );
};

export default RoleBasedNavigation;
