import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
    BookOpen,
    CircleCheck,
    Clock,
    CreditCard,
    Bus,
    Calendar,
    Bell,
    MessageSquare,
    ChevronRight,
    Star,
    TrendingUp,
    AlertTriangle,
    Eye,
    FileText,
    Utensils
} from 'lucide-react';

interface ChildSummary {
    id: string;
    name: string;
    class_name: string;
    avatar_url: string;
    attendance_status: 'present' | 'absent' | 'late' | 'not_marked';
    homework_pending: number;
    fee_due: number;
    bus_status: string;
    behavior_points: number;
    upcoming_events: number;
}

interface FeedItem {
    id: string;
    type: 'attendance' | 'homework' | 'fee' | 'event' | 'behavior' | 'message';
    child_name: string;
    description: string;
    time: string;
    icon_color: string;
}

const ParentTodayWidget = ({ navigateTo }: { navigateTo: (view: string, title: string, props?: any) => void }) => {
    const { user } = useAuth();
    const [selectedChild, setSelectedChild] = useState(0);

    const [children, setChildren] = useState<ChildSummary[]>([]);
    const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTodayUpdate = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getParentTodayUpdate(user?.id || '');
            setChildren(data?.children || []);
            setFeedItems(data?.feedItems || []);
        } catch (err: any) {
            console.error('Failed to fetch today update:', err);
            setError(err.message);
            // Fallback to empty states if API fails
            setChildren([]);
            setFeedItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time synchronization
    useAutoSync(['students', 'attendance', 'assignments', 'finances'], fetchTodayUpdate);

    useEffect(() => {
        fetchTodayUpdate();
    }, [fetchTodayUpdate]);

    if (loading) {
        return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-32"></div>
            </div>
        </div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl shadow-sm border border-red-100">
            <p>Error loading data: {error}</p>
            <p>Please try again later.</p>
        </div>;
    }

    // If no children data, display a message
    if (children.length === 0) {
        return <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-100">
            <p className="text-gray-600">No children data available. Please contact support if this persists.</p>
        </div>;
    }

    const child = children[selectedChild];
    const attendanceIcon = child.attendance_status === 'present' ? '✅' : child.attendance_status === 'late' ? '⏰' : child.attendance_status === 'absent' ? '❌' : '⏳';
    const greetingHour = new Date().getHours();
    const greeting = greetingHour < 12 ? 'Good Morning' : greetingHour < 17 ? 'Good Afternoon' : 'Good Evening';

    const getFeedIcon = (type: string) => {
        switch (type) {
            case 'attendance': return CircleCheck;
            case 'homework': return BookOpen;
            case 'fee': return CreditCard;
            case 'event': return Calendar;
            case 'behavior': return Star;
            case 'message': return MessageSquare;
            default: return Bell;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white"
            >
                <h1 className="text-2xl font-bold font-outfit">{greeting}, Parent! 👋</h1>
                <p className="text-white/70 mt-1">Here's everything happening today</p>
                {/* Child Selector */}
                {children.length > 1 && (
                    <div className="flex space-x-3 mt-4">
                        {children.map((c, i) => (
                            <motion.button key={c.id} whileTap={{ scale: 0.95 }} onClick={() => setSelectedChild(i)}
                                className={`px-4 py-2 rounded-2xl font-bold text-sm transition-all ${selectedChild === i ? 'bg-white text-indigo-700 shadow-lg' : 'bg-white/20 text-white/90 hover:bg-white/30'}`}>
                                {c.name.split(' ')[0]} • {c.class_name}
                            </motion.button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { onClick: () => navigateTo('attendanceOverview', 'Attendance'), iconBg: 'bg-emerald-50', icon: <CircleCheck className="w-5 h-5 text-emerald-600" />, corner: <span className="text-2xl">{attendanceIcon}</span>, value: <span className="capitalize">{child.attendance_status.replace('_', ' ')}</span>, label: 'Attendance' },
                    { onClick: () => navigateTo('assignments', 'Homework'), iconBg: 'bg-indigo-50', icon: <BookOpen className="w-5 h-5 text-indigo-600" />, corner: child.homework_pending > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{child.homework_pending}</span>, value: `${child.homework_pending} Pending`, label: 'Homework' },
                    { onClick: () => navigateTo('feeStatus', 'Fees'), iconBg: 'bg-amber-50', icon: <CreditCard className="w-5 h-5 text-amber-600" />, corner: child.fee_due > 0 && <AlertTriangle className="w-4 h-4 text-red-400" />, value: child.fee_due > 0 ? `₦${child.fee_due.toLocaleString()}` : '✅ Paid', label: 'Fee Balance' },
                    { onClick: () => navigateTo('busRoute', 'Bus Tracker', { studentId: child.id }), iconBg: 'bg-blue-50', icon: <Bus className="w-5 h-5 text-blue-600" />, corner: null, value: <span className="text-sm">{child.bus_status}</span>, label: 'Bus Status' },
                ].map((card, i) => (
                    <motion.button
                        key={card.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.06 }}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={card.onClick}
                        className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-2xl ${card.iconBg}`}>{card.icon}</div>
                            {card.corner}
                        </div>
                        <p className="font-bold text-gray-800 mt-3">{card.value}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{card.label}</p>
                    </motion.button>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-3 overflow-x-auto pb-2">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigateTo('feeStatus', 'Pay Fees')} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap hover:bg-indigo-700 transition-colors">
                    <CreditCard className="w-4 h-4" /><span>Pay Fees</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigateTo('parentMessages', 'Messages')} className="flex items-center space-x-2 bg-white text-gray-700 px-5 py-2.5 rounded-2xl font-bold text-sm border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition-colors">
                    <MessageSquare className="w-4 h-4" /><span>Message Teacher</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigateTo('reportCard', 'Report Card')} className="flex items-center space-x-2 bg-white text-gray-700 px-5 py-2.5 rounded-2xl font-bold text-sm border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition-colors">
                    <FileText className="w-4 h-4" /><span>View Report Card</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => navigateTo('schoolCalendar', 'Calendar')} className="flex items-center space-x-2 bg-white text-gray-700 px-5 py-2.5 rounded-2xl font-bold text-sm border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition-colors">
                    <Calendar className="w-4 h-4" /><span>School Calendar</span>
                </motion.button>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Activity Feed</h2>
                <div className="space-y-4">
                    {feedItems.map((item, i) => {
                        const Icon = getFeedIcon(item.type);
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.04 }}
                                whileHover={{ x: 2 }}
                                className="flex items-start space-x-4 py-3 border-b border-gray-50 last:border-b-0"
                            >
                                <div className={`p-2 rounded-xl bg-gray-50 ${item.icon_color}`}><Icon className="w-4 h-4" /></div>
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-800"><span className="font-bold text-indigo-600">{item.child_name}</span> — {item.description}</p>
                                    <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 mt-1" />
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ParentTodayWidget;
