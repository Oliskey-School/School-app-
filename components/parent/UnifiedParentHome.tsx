import React, { useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CircleCheck, BookOpen, Bell, BarChart3,
    ChevronRight, ChevronDown, CircleUser,
    Bus, Calendar, Megaphone, CalendarPlus
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { Student } from '../../types';
import SuspensionNoticeBanner from '../shared/SuspensionNoticeBanner';
import ChildRiskBanner from '../shared/ChildRiskBanner';
import AIInsightsPanel from '../shared/AIInsightsPanel';

export interface ChildOverview {
    id: string;
    name: string;
    grade: string;
    school_name: string;
    attendance: { status: string; date?: string; time?: string };
    assignments_due: number;
    fee_balance: number;
    latest_result?: { subject: string; score: number; trend: 'up' | 'down' };
}

interface UnifiedParentHomeProps {
    students: Student[];
    schoolId?: string;
    navigateTo: (view: string, title: string, props?: any) => void;
}

// Attendance status → label, keyed by the lowercase status the backend stores
// (present/absent/late/excused) plus 'not_marked' for "teacher hasn't marked
// today's register yet" — distinct from an actual absence.
const ATTENDANCE_LABEL: Record<string, string> = {
    present: '✅ Attended today',
    late: '⏰ Arrived late',
    absent: '🔴 Marked Absent',
    excused: '🟡 On Leave',
    not_marked: '⏳ Not marked yet',
};

export const UnifiedParentHome: React.FC<UnifiedParentHomeProps> = ({ students, schoolId, navigateTo }) => {
    const { user, currentSchool } = useAuth();
    const { switchBranch, currentBranch } = useBranch();
    const [children, setChildren] = useState<ChildOverview[]>([]);
    const [activeChildIndex, setActiveChildIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [latestNotice, setLatestNotice] = useState<any | null>(null);

    const load = useCallback(async () => {
        if (!user || (!currentSchool && !schoolId) || students.length === 0) {
            if (students.length === 0) setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch data for ALL children to allow quick switching
            const overviewPromises = students.map(s =>
                api.getChildOverview(s.id)
            );
            const results = await Promise.all(overviewPromises);
            setChildren(results);
        } catch (err) {
            console.error("Error loading unified overview:", err);
        } finally {
            setLoading(false);
        }

        try {
            const effectiveSchoolId = currentSchool?.id || schoolId;
            if (effectiveSchoolId) {
                const notices = await api.getNotices(effectiveSchoolId, currentBranch?.id);
                setLatestNotice((notices || [])[0] || null);
            }
        } catch (err) {
            console.error("Error loading latest notice:", err);
        }
    }, [user, currentSchool, schoolId, students, currentBranch?.id]);

    // Real-time synchronization
    // Note: We sync on 'students' because child overview depends on a variety of data (attendance, grades, etc)
    // but the unified home specifically manages the "child context"
    useAutoSync(['students', 'attendance', 'assignments', 'grades', 'notices'], load);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return (
        <div className="p-4 space-y-4 animate-pulse">
            <div className="h-32 bg-gray-200 rounded-2xl" />
            <div className="grid grid-cols-2 gap-3">
                <div className="h-24 bg-gray-200 rounded-2xl" />
                <div className="h-24 bg-gray-200 rounded-2xl" />
            </div>
            <div className="h-40 bg-gray-200 rounded-2xl" />
        </div>
    );
    if (children.length === 0) return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center h-[60vh] p-6 text-center"
        >
            <CircleUser className="w-20 h-20 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700">No Children Linked</h2>
            <p className="text-gray-500 mt-2">We couldn't find any students linked to your parent account.<br/>If this is a mistake, please contact the school administration.</p>
        </motion.div>
    );

    const child = children[activeChildIndex];

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header with Child Switcher */}
            <div className="bg-white p-6 border-b sticky top-0 z-20">
                <div className="flex justify-between items-start mb-4">
                    <div className="relative">
                        <h1 className="text-gray-500 text-sm">Good morning, {user?.user_metadata?.full_name || 'Parent'}</h1>
                        <button 
                            onClick={() => children.length > 1 && setIsSwitcherOpen(!isSwitcherOpen)}
                            className="flex items-center gap-2 mt-1 hover:bg-gray-50 px-2 py-1 -ml-2 rounded-lg transition-colors"
                        >
                            <h2 className="text-xl font-bold text-gray-900">{child.name}</h2>
                            {children.length > 1 && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />}
                        </button>
                        
                        <AnimatePresence>
                            {isSwitcherOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl z-30 overflow-hidden"
                                >
                                    {children.map((c, idx) => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setActiveChildIndex(idx);
                                                setIsSwitcherOpen(false);

                                                // Switch Branch Context only when the selected child is
                                                // actually in a different branch. switchBranch() does a
                                                // full page reload (to re-init under the new branch),
                                                // which was firing on every click regardless — wiping
                                                // activeChildIndex back to its default on remount, so
                                                // switching always appeared to "just reload" back to the
                                                // first child. Same-branch siblings (the common case)
                                                // now switch instantly with no reload.
                                                const selectedStudent = students.find(s => s.id === c.id);
                                                if (selectedStudent?.branchId && selectedStudent.branchId !== currentBranch?.id) {
                                                    switchBranch(selectedStudent.branchId);
                                                }
                                            }}
                                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${idx === activeChildIndex ? 'bg-indigo-50/50' : ''}`}
                                        >
                                            <div>
                                                <p className={`font-bold text-sm ${idx === activeChildIndex ? 'text-indigo-600' : 'text-gray-700'}`}>{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.grade}</p>
                                            </div>
                                            {idx === activeChildIndex && <CircleCheck className="w-4 h-4 text-indigo-600" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                            {child.grade} {child.school_name ? `· ${child.school_name}` : ''}
                        </p>
                    </div>
                    <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <CircleUser className="w-8 h-8 text-gray-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Suspension Notices */}
            <div className="px-4 pt-4">
                <SuspensionNoticeBanner mode="parent" />
            </div>

            {/* Early Warning Notices */}
            <div className="px-4 pt-4">
                <ChildRiskBanner />
            </div>

            {/* AI Insights */}
            <div className="px-4 pt-4">
                <AIInsightsPanel />
            </div>

            {/* School Utilities Quick Grid */}
            <div className="px-4 pt-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider underline">School Utilities</h3>
                        <button onClick={() => navigateTo('schoolUtilities', 'School Utilities')} className="text-xs text-indigo-600 font-bold hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: 'Bus', icon: Bus, color: 'text-amber-600', bg: 'bg-amber-50', view: 'busRoute', title: 'Bus Route' },
                            { label: 'Calendar', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50', view: 'calendar', title: 'School Calendar' },
                            { label: 'Notices', icon: Megaphone, color: 'text-purple-600', bg: 'bg-purple-50', view: 'noticeboard', title: 'Noticeboard' },
                            { label: 'Meet', icon: CalendarPlus, color: 'text-pink-600', bg: 'bg-pink-50', view: 'appointments', title: 'Book Appointment' }
                        ].map((item, i) => (
                            <motion.button
                                key={i}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => navigateTo(item.view, item.title, item.view === 'busRoute' ? { studentId: child.id } : {})}
                                className="flex flex-col items-center gap-2 group p-2 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <div className={`${item.bg} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <item.icon className={`w-5 h-5 ${item.color}`} />
                                </div>
                                <span className="text-xs font-bold text-gray-500">{item.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scrollable Card Feed */}
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Daily Report</h3>
                </div>
                {/* Attendance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigateTo('attendance', 'Attendance', { student: students[activeChildIndex], studentId: child.id })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('attendance', 'Attendance', { student: students[activeChildIndex], studentId: child.id }); } }}
                    className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl">
                            <CircleCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance</p>
                            <p className="text-gray-900 font-bold">
                                {ATTENDANCE_LABEL[child.attendance.status] || ATTENDANCE_LABEL.not_marked}
                            </p>
                            {child.attendance.status !== 'not_marked' && (
                                <p className="text-xs text-gray-500">Arrived {child.attendance.time || 'N/A'}</p>
                            )}
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </motion.div>

                {/* Assignments Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigateTo('childDetail', child.name, { student: students[activeChildIndex], initialTab: 'academic' })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('childDetail', child.name, { student: students[activeChildIndex], initialTab: 'academic' }); } }}
                    className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-3 rounded-xl">
                            <BookOpen className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Academics</p>
                            <p className="text-gray-900 font-bold">{child.assignments_due} assignments due this week</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </motion.div>

                {/* Fees Card removed: "Fee Status" is already a direct nav item on
                    both desktop (sidebar) and mobile (bottom nav), so this repeated
                    the same destination a second time on the same screen. */}

                {/* Latest Result Card */}
                {child.latest_result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.2 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-50 p-3 rounded-xl">
                                <BarChart3 className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Latest Performance</p>
                                <p className="text-gray-900 font-bold">
                                    {child.latest_result.subject}: {child.latest_result.score}%
                                    <span className={`ml-2 text-sm ${child.latest_result.trend === 'down' ? 'text-red-500' : 'text-emerald-600'}`}>
                                        {child.latest_result.trend === 'down' ? '↓' : '↑'}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                    </motion.div>
                )}

                {latestNotice && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.25 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigateTo('noticeboard', 'Noticeboard', {})}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('noticeboard', 'Noticeboard', {}); } }}
                        className="bg-gradient-to-r from-indigo-600 to-purple-700 p-5 rounded-2xl shadow-lg hover:shadow-xl transition-shadow text-white flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/60"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-3 rounded-xl">
                                <Bell className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-wider">New Announcement</p>
                                <p className="font-bold">{latestNotice.title}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 opacity-50" />
                    </motion.div>
                )}
            </div>
        </div>
    );
};
