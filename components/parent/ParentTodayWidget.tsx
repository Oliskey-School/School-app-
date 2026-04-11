import React, { useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
    BookOpen,
    CheckCircle2,
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
            const data = await api.getParentTodayUpdate();
            setChildren(data.children);
            setFeedItems(data.feedItems);
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
            case 'attendance': return CheckCircle2;
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
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white">
                <h1 className="text-2xl font-bold font-outfit">{greeting}, Parent! 👋</h1>
                <p className="text-white/70 mt-1">Here's everything happening today</p>
                {/* Child Selector */}
                {children.length > 1 && (
                    <div className="flex space-x-3 mt-4">
                        {children.map((c, i) => (
                            <button key={c.id} onClick={() => setSelectedChild(i)}
                                className={`px-4 py-2 rounded-2xl font-bold text-sm transition-all ${selectedChild === i ? 'bg-white text-indigo-700 shadow-lg' : 'bg-white/20 text-white/90 hover:bg-white/30'}`}>
                                {c.name.split(' ')[0]} • {c.class_name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => navigateTo('attendanceOverview', 'Attendance')} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 text-left hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-2xl bg-emerald-50"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                        <span className="text-2xl">{attendanceIcon}</span>
                    </div>
                    <p className="font-bold text-gray-800 mt-3 capitalize">{child.attendance_status.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Attendance</p>
                </button>

                <button onClick={() => navigateTo('assignments', 'Homework')} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 text-left hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-2xl bg-indigo-50"><BookOpen className="w-5 h-5 text-indigo-600" /></div>
                        {child.homework_pending > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{child.homework_pending}</span>}
                    </div>
                    <p className="font-bold text-gray-800 mt-3">{child.homework_pending} Pending</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Homework</p>
                </button>

                <button onClick={() => navigateTo('feeStatus', 'Fees')} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 text-left hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-2xl bg-amber-50"><CreditCard className="w-5 h-5 text-amber-600" /></div>
                        {child.fee_due > 0 && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    </div>
                    <p className="font-bold text-gray-800 mt-3">{child.fee_due > 0 ? `₦${child.fee_due.toLocaleString()}` : '✅ Paid'}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fee Balance</p>
                </button>

                <button onClick={() => navigateTo('busRoute', 'Bus Tracker')} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 text-left hover:shadow-md transition-all">
                    <div className="flex justify-between items-start">
                        <div className="p-2 rounded-2xl bg-blue-50"><Bus className="w-5 h-5 text-blue-600" /></div>
                    </div>
                    <p className="font-bold text-gray-800 mt-3 text-sm">{child.bus_status}</p>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Bus Status</p>
                </button>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-3 overflow-x-auto pb-2">
                <button onClick={() => navigateTo('feeStatus', 'Pay Fees')} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap hover:bg-indigo-700 transition-all">
                    <CreditCard className="w-4 h-4" /><span>Pay Fees</span>
                </button>
                <button onClick={() => navigateTo('parentMessages', 'Messages')} className="flex items-center space-x-2 bg-white text-gray-700 px-5 py-2.5 rounded-2xl font-bold text-sm border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition-all">
                    <MessageSquare className="w-4 h-4" /><span>Message Teacher</span>
                </button>
                <button onClick={() => navigateTo('reportCard', 'Report Card')} className="flex items-center space-x-2 bg-white text-gray-700 px-5 py-2.5 rounded-2xl font-bold text-sm border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition-all">
                    <FileText className="w-4 h-4" /><span>View Report Card</span>
                </button>
                <button onClick={() => navigateTo('schoolCalendar', 'Calendar')} className="flex items-center space-x-2 bg-white text-gray-700 px-5 py-2.5 rounded-2xl font-bold text-sm border border-gray-100 whitespace-nowrap hover:bg-gray-50 transition-all">
                    <Calendar className="w-4 h-4" /><span>School Calendar</span>
                </button>
            </div>

            {/* Activity Feed */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Today's Activity Feed</h2>
                <div className="space-y-4">
                    {feedItems.map(item => {
                        const Icon = getFeedIcon(item.type);
                        return (
                            <div key={item.id} className="flex items-start space-x-4 py-3 border-b border-gray-50 last:border-b-0">
                                <div className={`p-2 rounded-xl bg-gray-50 ${item.icon_color}`}><Icon className="w-4 h-4" /></div>
                                <div className="flex-grow">
                                    <p className="text-sm text-gray-800"><span className="font-bold text-indigo-600">{item.child_name}</span> — {item.description}</p>
                                    <p className="text-xs text-gray-400 mt-1">{item.time}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 mt-1" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ParentTodayWidget;
