
import React from 'react';
import {
    Edit,
    FileText,
    CreditCard,
    Trash2,
    UserPlus,
    Users,
    Calendar,
    Bell,
    Settings,
    Shield
} from 'lucide-react';

interface AdminActionsScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AdminActionsScreen: React.FC<AdminActionsScreenProps> = ({ navigateTo }) => {

    const actions = [
        {
            title: "Manage Students",
            items: [
                { label: "Add Student", icon: <UserPlus className="w-5 h-5 text-indigo-600" />, onClick: () => navigateTo('addStudent', 'Add Student'), bg: "bg-indigo-50" },
                { label: "Student List", icon: <Users className="w-5 h-5 text-indigo-600" />, onClick: () => navigateTo('studentList', 'Students'), bg: "bg-indigo-50" },
                { label: "ID Cards", icon: <CreditCard className="w-5 h-5 text-indigo-600" />, onClick: () => navigateTo('idCardManagement', 'ID Cards'), bg: "bg-indigo-50" },
            ]
        },
        {
            title: "Manage Staff",
            items: [
                { label: "Add Teacher", icon: <UserPlus className="w-5 h-5 text-purple-600" />, onClick: () => navigateTo('addTeacher', 'Add Teacher'), bg: "bg-purple-50" },
                { label: "Teacher List", icon: <Users className="w-5 h-5 text-purple-600" />, onClick: () => navigateTo('teacherList', 'Teachers'), bg: "bg-purple-50" },
            ]
        },
        {
            title: "Academic",
            items: [
                { label: "Reports", icon: <FileText className="w-5 h-5 text-blue-600" />, onClick: () => navigateTo('reports', 'Reports'), bg: "bg-blue-50" },
                { label: "Timetable", icon: <Calendar className="w-5 h-5 text-blue-600" />, onClick: () => navigateTo('timetable', 'Timetable'), bg: "bg-blue-50" },
            ]
        },
        {
            title: "System",
            items: [
                { label: "Announcements", icon: <Bell className="w-5 h-5 text-amber-600" />, onClick: () => navigateTo('communicationHub', 'Communication'), bg: "bg-amber-50" },
                { label: "Roles", icon: <Shield className="w-5 h-5 text-emerald-600" />, onClick: () => navigateTo('userRoles', 'User Roles'), bg: "bg-emerald-50" },
                { label: "Settings", icon: <Settings className="w-5 h-5 text-gray-600" />, onClick: () => navigateTo('systemSettings', 'Settings'), bg: "bg-gray-50" },
            ]
        }
    ];

    return (
        <div className="p-4 space-y-6 pb-24">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <h1 className="text-2xl font-bold mb-2">Quick Actions</h1>
                <p className="opacity-90">Manage your school efficiently.</p>
            </div>

            <div className="space-y-6">
                {actions.map((section, idx) => (
                    <div key={idx}>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">{section.title}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {section.items.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={item.onClick}
                                    className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
                                >
                                    <div className={`p-3 rounded-full ${item.bg}`}>
                                        {item.icon}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminActionsScreen;
