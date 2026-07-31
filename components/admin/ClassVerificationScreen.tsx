import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { toast } from 'react-hot-toast';
import {
    CalendarIcon,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangle,
    LogOut,
    RefreshCw,
    QrCode
} from 'lucide-react';

interface LessonRow {
    timetable_id: string;
    teacher_id: string | null;
    teacher_name: string;
    teacher_generated_id: string | null;
    subject: string;
    class_name: string | null;
    classroom_name: string | null;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
    scan_in_at: string | null;
    scan_out_at: string | null;
    duration_minutes: number | null;
    is_late: boolean;
    is_early_departure: boolean;
}

interface TeacherSummary {
    teacher_id: string | null;
    teacher_name: string;
    teacher_generated_id: string | null;
    assigned: number;
    completed: number;
    missed: number;
    in_progress: number;
    no_scan_out: number;
    late: number;
    early_departure: number;
    upcoming: number;
    pending: number;
}

interface DailyReport {
    date: string;
    lessons: LessonRow[];
    summary: TeacherSummary[];
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
    completed: { label: 'Completed', classes: 'bg-green-50 text-green-700' },
    in_progress: { label: 'In Progress', classes: 'bg-blue-50 text-blue-700' },
    no_scan_out: { label: 'No Scan-Out', classes: 'bg-amber-50 text-amber-700' },
    missed: { label: 'Missed', classes: 'bg-red-50 text-red-700' },
    pending: { label: 'Awaiting Scan', classes: 'bg-indigo-50 text-indigo-700' },
    upcoming: { label: 'Upcoming', classes: 'bg-gray-100 text-gray-600' },
};

function formatTime(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ClassVerificationScreen = () => {
    const { currentSchool } = useAuth();
    const { currentBranch } = useBranch();
    const [report, setReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(todayStr());

    const fetchReport = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.get<DailyReport>(`/classrooms/lesson-attendance/report?date=${date}`);
            setReport(data);
        } catch (err) {
            console.error('Error fetching lesson attendance report:', err);
            toast.error('Failed to load class verification report');
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        if (currentSchool) fetchReport();
    }, [currentSchool, currentBranch?.id, fetchReport]);

    const lessons = report?.lessons ?? [];
    const totals = {
        total: lessons.length,
        completed: lessons.filter(l => l.status === 'completed').length,
        missed: lessons.filter(l => l.status === 'missed').length,
        late: lessons.filter(l => l.is_late).length,
        early: lessons.filter(l => l.is_early_departure).length,
        noScanOut: lessons.filter(l => l.status === 'no_scan_out').length,
    };

    const statCards = [
        { label: 'Classes Today', value: totals.total, icon: <CalendarIcon className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
        { label: 'Completed', value: totals.completed, icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bg: 'bg-green-50' },
        { label: 'Missed', value: totals.missed, icon: <XCircle className="w-5 h-5 text-red-600" />, bg: 'bg-red-50' },
        { label: 'Late Arrivals', value: totals.late, icon: <Clock className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50' },
        { label: 'Early Departures', value: totals.early, icon: <LogOut className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
        { label: 'No Scan-Out', value: totals.noScanOut, icon: <AlertTriangle className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">Class Verification</h1>
                    <p className="text-gray-500">QR scan records compared against the timetable — who taught, who was late, who missed.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-600"
                    />
                    <motion.button
                        whileHover={{ rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => fetchReport(true)}
                        className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </motion.button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {statCards.map((card, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.05 }} whileHover={{ y: -2 }} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                        <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-2`}>
                            {card.icon}
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{loading ? '—' : card.value}</p>
                        <p className="text-xs text-gray-500 font-semibold">{card.label}</p>
                    </motion.div>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading verification report...</div>
            ) : lessons.length === 0 ? (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No verifiable lessons for this day</h3>
                    <p className="text-gray-500 mt-1 max-w-md mx-auto">
                        Lessons appear here when a published timetable entry is linked to a classroom with a QR code.
                    </p>
                </motion.div>
            ) : (
                <>
                    {/* Lessons table */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">All Scheduled Lessons</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                                        <th className="px-5 py-3 font-semibold">Teacher</th>
                                        <th className="px-5 py-3 font-semibold">Subject / Class</th>
                                        <th className="px-5 py-3 font-semibold">Classroom</th>
                                        <th className="px-5 py-3 font-semibold">Scheduled</th>
                                        <th className="px-5 py-3 font-semibold">Scan In / Out</th>
                                        <th className="px-5 py-3 font-semibold">Duration</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lessons.map(l => {
                                        const style = STATUS_STYLES[l.status] || STATUS_STYLES.upcoming;
                                        return (
                                            <tr key={`${l.timetable_id}-${l.scheduled_start}`} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-gray-900">{l.teacher_name}</p>
                                                    {l.teacher_generated_id && (
                                                        <p className="text-xs text-gray-400">{l.teacher_generated_id}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-gray-700">{l.subject}</p>
                                                    <p className="text-xs text-gray-400">{l.class_name || '—'}</p>
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">{l.classroom_name || '—'}</td>
                                                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{l.scheduled_start} – {l.scheduled_end}</td>
                                                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                                                    {formatTime(l.scan_in_at)} / {formatTime(l.scan_out_at)}
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">
                                                    {l.duration_minutes != null ? `${l.duration_minutes} min` : '—'}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${style.classes}`}>
                                                            {style.label}
                                                        </span>
                                                        {l.is_late && (
                                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">Late</span>
                                                        )}
                                                        {l.is_early_departure && (
                                                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700">Left Early</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>

                    {/* Per-teacher summary */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">Teacher Daily Summary</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                                        <th className="px-5 py-3 font-semibold">Teacher</th>
                                        <th className="px-5 py-3 font-semibold text-center">Assigned</th>
                                        <th className="px-5 py-3 font-semibold text-center">Completed</th>
                                        <th className="px-5 py-3 font-semibold text-center">Missed</th>
                                        <th className="px-5 py-3 font-semibold text-center">Late</th>
                                        <th className="px-5 py-3 font-semibold text-center">Left Early</th>
                                        <th className="px-5 py-3 font-semibold text-center">No Scan-Out</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(report?.summary ?? []).map(s => (
                                        <tr key={s.teacher_id || s.teacher_name} className="border-b border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-5 py-3">
                                                <p className="font-semibold text-gray-900">{s.teacher_name}</p>
                                                {s.teacher_generated_id && (
                                                    <p className="text-xs text-gray-400">{s.teacher_generated_id}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-center font-bold text-gray-900">{s.assigned}</td>
                                            <td className="px-5 py-3 text-center font-bold text-green-600">{s.completed}</td>
                                            <td className="px-5 py-3 text-center font-bold text-red-600">{s.missed}</td>
                                            <td className="px-5 py-3 text-center font-bold text-amber-600">{s.late}</td>
                                            <td className="px-5 py-3 text-center font-bold text-orange-600">{s.early_departure}</td>
                                            <td className="px-5 py-3 text-center font-bold text-purple-600">{s.no_scan_out}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </>
            )}
        </div>
    );
};

export default ClassVerificationScreen;
