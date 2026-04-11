import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckCircle2, BookOpen, Wallet, Bell, BarChart3, 
    ChevronRight, ChevronDown, UserCircle2,
    Bus, Calendar, Megaphone, CalendarPlus
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Student } from '../../types';

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

export const UnifiedParentHome: React.FC<UnifiedParentHomeProps> = ({ students, schoolId, navigateTo }) => {
    const { user, currentSchool } = useAuth();
    const [children, setChildren] = useState<ChildOverview[]>([]);
    const [activeChildIndex, setActiveChildIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    useEffect(() => {
        const load = async () => {
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
        };
        load();
    }, [user, currentSchool, schoolId, students]);

    if (loading) return <div>Loading portal...</div>;
    if (children.length === 0) return (
        <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
            <UserCircle2 className="w-20 h-20 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700">No Children Linked</h2>
            <p className="text-gray-500 mt-2">We couldn't find any students linked to your parent account.<br/>If this is a mistake, please contact the school administration.</p>
        </div>
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
                                            }}
                                            className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between ${idx === activeChildIndex ? 'bg-indigo-50/50' : ''}`}
                                        >
                                            <div>
                                                <p className={`font-bold text-sm ${idx === activeChildIndex ? 'text-indigo-600' : 'text-gray-700'}`}>{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.grade}</p>
                                            </div>
                                            {idx === activeChildIndex && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                            {child.grade} · {child.school_name || 'Demo School'}
                        </p>
                    </div>
                    <div className="bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserCircle2 className="w-8 h-8 text-gray-400" />
                        )}
                    </div>
                </div>
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
                            <button 
                                key={i} 
                                onClick={() => navigateTo(item.view, item.title)}
                                className="flex flex-col items-center gap-2 group p-2 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <div className={`${item.bg} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <item.icon className={`w-5 h-5 ${item.color}`} />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Scrollable Card Feed */}
            <div className="p-4 space-y-4">
                {/* Attendance Card */}
                <motion.div 
                    whileTap={{ scale: 0.98 }} 
                    onClick={() => navigateTo('childDetail', child.name, { student: students[activeChildIndex], initialTab: 'attendance' })}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance</p>
                            <p className="text-gray-900 font-bold">
                                {child.attendance.status === 'present' ? '✅ Attended today' : '🔴 Marked Absent'}
                            </p>
                            <p className="text-xs text-gray-500">Arrived {child.attendance.time || 'N/A'}</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                </motion.div>

                {/* Assignments Card */}
                <motion.div 
                    whileTap={{ scale: 0.98 }} 
                    onClick={() => navigateTo('childDetail', child.name, { student: students[activeChildIndex], initialTab: 'academics' })}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
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

                {/* Fees Card */}
                <motion.div 
                    whileTap={{ scale: 0.98 }} 
                    onClick={() => navigateTo('feeStatus', 'Fee Status')}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-50 p-3 rounded-xl">
                            <Wallet className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Finances</p>
                            <p className="text-gray-900 font-bold">₦{child.fee_balance.toLocaleString()} outstanding</p>
                            {child.fee_balance > 0 && <div className="mt-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">PAY NOW</span>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                </motion.div>

                {/* Latest Result Card */}
                {child.latest_result && (
                    <motion.div whileTap={{ scale: 0.98 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-purple-50 p-3 rounded-xl">
                                <BarChart3 className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Latest Performance</p>
                                <p className="text-gray-900 font-bold">
                                    {child.latest_result.subject}: {child.latest_result.score}% 
                                    <span className="ml-2 text-emerald-600 text-sm">↑</span>
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                    </motion.div>
                )}

                {/* Announcement Placeholder */}
                <motion.div whileTap={{ scale: 0.98 }} className="bg-gradient-to-r from-indigo-600 to-purple-700 p-5 rounded-2xl shadow-lg text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold opacity-80 uppercase tracking-wider">New Announcement</p>
                            <p className="font-bold">Inter-house Sports Day 2026</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-50" />
                </motion.div>
            </div>
        </div>
    );
};
