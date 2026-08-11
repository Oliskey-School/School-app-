
import React from 'react';
import { motion } from 'framer-motion';
import {
    BusVehicleIcon,
    CalendarIcon,
    MegaphoneIcon,
    CalendarPlusIcon,
    BookOpenIcon,
    ClipboardListIcon,
    HelpingHandIcon,
    ShieldCheckIcon,
    ElearningIcon,
    UserGroupIcon,
    PhotoIcon,
    FileDocIcon,
    ClockIcon,
    ExamIcon
} from '../../constants';

interface UtilityItem {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    view: string;
}

interface SchoolUtilitiesScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    role?: 'parent' | 'student';
    students?: { id: string }[];
}

// Tiles that only make sense for a parent/guardian acting on a child's behalf —
// hidden when this screen is reused for the student's own dashboard.
const PARENT_ONLY_UTILITY_IDS = new Set(['appointments', 'pta', 'volunteering', 'permission', 'pickup']);

const SchoolUtilitiesScreen: React.FC<SchoolUtilitiesScreenProps> = ({ navigateTo, role = 'parent', students = [] }) => {

    const allUtilities: UtilityItem[] = [
        {
            id: 'bus',
            label: 'Transport & Bus Route',
            description: 'Track school bus location and view routes',
            icon: <BusVehicleIcon className="h-8 w-8 text-white" />,
            color: 'bg-orange-500',
            view: 'busRoute'
        },
        {
            id: 'calendar',
            label: 'School Calendar',
            description: 'View academic sessions, holidays, and events',
            icon: <CalendarIcon className="h-8 w-8 text-white" />,
            color: 'bg-blue-500',
            view: 'calendar'
        },
        {
            id: 'noticeboard',
            label: 'Noticeboard',
            description: 'Important announcements and news',
            icon: <MegaphoneIcon className="h-8 w-8 text-white" />,
            color: 'bg-purple-500',
            view: 'noticeboard'
        },
        {
            id: 'appointments',
            label: 'Book Appointment',
            description: 'Schedule meetings with teachers or admin',
            icon: <CalendarPlusIcon className="h-8 w-8 text-white" />,
            color: 'bg-pink-500',
            view: 'appointments'
        },
        {
            id: 'library',
            label: 'Digital Library',
            description: 'Access books, journals, and resources',
            icon: <BookOpenIcon className="h-8 w-8 text-white" />,
            color: 'bg-indigo-500',
            view: 'library'
        },
        {
            id: 'resources',
            label: 'Learning Resources',
            description: 'Study materials and educational content',
            icon: <ElearningIcon className="h-8 w-8 text-white" />,
            color: 'bg-teal-500',
            view: 'learningResources'
        },
        {
            id: 'learningHub',
            label: 'Learning Hub',
            description: 'Track progress on free study resources',
            icon: <ElearningIcon className="h-8 w-8 text-white" />,
            color: 'bg-green-600',
            view: 'learningHub'
        },
        {
            id: 'policies',
            label: 'School Policies',
            description: 'Rules, regulations, and guidelines',
            icon: <ShieldCheckIcon className="h-8 w-8 text-white" />,
            color: 'bg-gray-600',
            view: 'schoolPolicies'
        },
        {
            id: 'pta',
            label: 'PTA Meetings',
            description: 'Minutes, schedules, and PTA info',
            icon: <UserGroupIcon className="h-8 w-8 text-white" />,
            color: 'bg-cyan-600',
            view: 'ptaMeetings'
        },
        {
            id: 'gallery',
            label: 'Photo Gallery',
            description: 'Photos from school events and activities',
            icon: <PhotoIcon className="h-8 w-8 text-white" />,
            color: 'bg-rose-500',
            view: 'photoGallery'
        },
        {
            id: 'volunteering',
            label: 'Volunteering',
            description: 'Sign up for school events and help out',
            icon: <HelpingHandIcon className="h-8 w-8 text-white" />,
            color: 'bg-green-600',
            view: 'volunteering'
        },
        {
            id: 'permission',
            label: 'Permission Slips',
            description: 'Approve trips and activities digitally',
            icon: <FileDocIcon className="h-8 w-8 text-white" />,
            color: 'bg-amber-500',
            view: 'permissionSlips'
        },
        {
            id: 'pickup',
            label: 'Pickup Authorization',
            description: 'Manage who is allowed to collect your child',
            icon: <UserGroupIcon className="h-8 w-8 text-white" />,
            color: 'bg-cyan-700',
            view: 'pickupAuthorization'
        },
    ];

    // Student-only tiles, appended when this screen is reused for a student's dashboard.
    const studentUtilities: UtilityItem[] = [
        {
            id: 'timetable',
            label: 'My Timetable',
            description: 'View your weekly class schedule',
            icon: <ClockIcon className="h-8 w-8 text-white" />,
            color: 'bg-sky-600',
            view: 'timetable'
        },
        {
            id: 'examSchedule',
            label: 'Exam Schedule',
            description: 'Upcoming exams and test dates',
            icon: <ExamIcon className="h-8 w-8 text-white" />,
            color: 'bg-violet-600',
            view: 'examSchedule'
        },
    ];

    const utilities = role === 'student'
        ? [...studentUtilities, ...allUtilities.filter(item => !PARENT_ONLY_UTILITY_IDS.has(item.id))]
        : allUtilities;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 md:p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">School Utilities</h2>
                        <p className="text-gray-600">Access all school tools and resources in one place.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {utilities.map((item, i) => (
                            <motion.button
                                key={item.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: Math.min(i, 12) * 0.04 }}
                                whileHover={{ y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigateTo(item.view, item.label, item.view === 'busRoute' ? { studentId: students[0]?.id } : {})}
                                className="group flex flex-col items-start text-left bg-white rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-transparent hover:border-gray-100"
                            >
                                <div className={`p-6 w-full h-32 flex items-center justify-center ${item.color} relative overflow-hidden`}>
                                    <div className="absolute -right-4 -bottom-4 opacity-20 transform rotate-12 scale-150 transition-transform duration-500 group-hover:scale-125">
                                        {item.icon}
                                    </div>
                                    <div className="z-10 bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                                        {item.icon}
                                    </div>
                                </div>
                                <div className="p-5 w-full">
                                    <h3 className="font-bold text-lg text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">{item.label}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SchoolUtilitiesScreen;
