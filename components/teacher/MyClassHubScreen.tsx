import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    Users, ClipboardList, HeartPulse, TrendingUp, Phone, Calendar,
    QrCode, Bell, Mail, User, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';

interface MyClassHubScreenProps {
    teacherId?: string | null;
    schoolId: string;
    currentBranchId?: string | null;
    classId?: string;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const TABS = [
    { key: 'roster', label: 'Roster', icon: <Users className="w-4 h-4" /> },
    { key: 'behavior', label: 'Behavior', icon: <ClipboardList className="w-4 h-4" /> },
    { key: 'academics', label: 'Academics', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'medical', label: 'Medical', icon: <HeartPulse className="w-4 h-4" /> },
    { key: 'timetable', label: 'Timetable', icon: <Calendar className="w-4 h-4" /> },
    { key: 'monitoring', label: 'Lesson Monitoring', icon: <QrCode className="w-4 h-4" /> },
];

const DAY_NAMES: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

function fmtDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

const MyClassHubScreen: React.FC<MyClassHubScreenProps> = ({ classId, navigateTo, teacherId, schoolId }) => {
    const [tab, setTab] = useState('roster');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

    const fetchHub = useCallback(async () => {
        if (!classId) { setLoading(false); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<any>(`/teacher-assignments/mine/class/${classId}`);
            setData(res);
        } catch (err: any) {
            console.error('Error loading My Class hub:', err);
            setError(err?.message || 'Failed to load your class');
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => { fetchHub(); }, [fetchHub]);

    if (!classId) {
        return (
            <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-gray-100 m-4">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">You are not currently assigned as a Class Teacher.</p>
            </div>
        );
    }
    if (loading) return <div className="text-center py-12 text-gray-500">Loading your class...</div>;
    if (error) return <div className="p-8 text-center text-red-600 bg-red-50 rounded-2xl shadow-sm border border-red-100 m-4">{error}</div>;
    if (!data) return null;

    return (
        <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 pb-24">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-3xl text-white shadow-lg">
                <h1 className="text-2xl font-bold font-outfit">{data.class.name}</h1>
                <p className="text-white/70 mt-1">{data.roster.length} students · You are the Class Teacher</p>
            </div>

            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex overflow-x-auto gap-1">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                            tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {t.icon} {t.label}
                        {t.key === 'medical' && data.medical_alerts.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                        )}
                    </button>
                ))}
            </div>

            {tab === 'roster' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-50">
                        {data.roster.map((s: any) => (
                            <div key={s.id}>
                                <button onClick={() => setExpandedStudent(expandedStudent === s.id ? null : s.id)}
                                    className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 text-left">
                                    <div className="flex items-center gap-3">
                                        {s.avatar_url
                                            ? <img src={s.avatar_url} alt={s.full_name} className="w-9 h-9 rounded-full object-cover" />
                                            : <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center"><User className="w-4 h-4 text-indigo-600" /></div>}
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{s.school_generated_id || s.admission_number || ''}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigateTo('studentProfile', s.full_name, { studentId: s.id, student: { ...s, name: s.full_name, avatarUrl: s.avatar_url, schoolGeneratedId: s.school_generated_id } }); }}
                                        className="text-xs font-bold text-indigo-600 hover:underline">View Profile</button>
                                </button>
                                {expandedStudent === s.id && (
                                    <div className="px-5 pb-4 bg-gray-50/50">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Phone className="w-3 h-3" /> Parent / Guardian</p>
                                        {s.parents.length === 0 ? (
                                            <p className="text-sm text-gray-400">No parent/guardian on record.</p>
                                        ) : s.parents.map((p: any, i: number) => (
                                            <div key={i} className="text-sm text-gray-700 mb-1">
                                                {p.full_name} {p.relationship ? `(${p.relationship})` : ''}
                                                {p.phone ? ` · ${p.phone}` : ''} {p.email ? ` · ${p.email}` : ''}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {data.roster.length === 0 && <p className="px-5 py-10 text-center text-gray-400">No students enrolled yet.</p>}
                    </div>
                </div>
            )}

            {tab === 'behavior' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Behavior & Discipline Records</h3>
                        <button onClick={() => navigateTo('classDetail', data.class.name, { classInfo: { ...data.class, schoolId } })}
                            className="text-xs font-bold text-indigo-600 hover:underline">Add Note</button>
                    </div>
                    {data.behavior_notes.length === 0
                        ? <p className="px-5 py-10 text-center text-gray-400">No behavior notes recorded yet.</p>
                        : <div className="divide-y divide-gray-50">
                            {data.behavior_notes.map((n: any) => (
                                <div key={n.id} className="px-5 py-3">
                                    <p className="text-sm font-semibold text-gray-800">{n.student?.full_name}</p>
                                    <p className="text-sm text-gray-600 italic">"{n.note}"</p>
                                    <p className="text-xs text-gray-400 mt-1">{n.category} · {fmtDate(n.date)}</p>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {tab === 'academics' && (
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <p className="text-4xl font-bold text-indigo-600">{data.academic_summary.average ?? '—'}%</p>
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mt-1">Class Average ({data.academic_summary.records} records)</p>
                        <p className="text-xs text-gray-400 mt-3">Read-only overview — score entry belongs to each subject's assigned Subject Teacher.</p>
                    </div>
                </div>
            )}

            {tab === 'medical' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Open Medical Alerts</h3></div>
                    {data.medical_alerts.length === 0
                        ? <p className="px-5 py-10 text-center text-gray-400">No open medical alerts for this class.</p>
                        : <div className="divide-y divide-gray-50">
                            {data.medical_alerts.map((h: any) => (
                                <div key={h.id} className="px-5 py-3 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{h.student?.full_name} — {h.incident_type}</p>
                                        <p className="text-sm text-gray-600">{h.description}</p>
                                        <p className="text-xs text-gray-400 mt-1">{fmtDate(h.incident_date)} · {h.severity}</p>
                                    </div>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {tab === 'timetable' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">Class Timetable</h3>
                        <p className="text-xs text-gray-400">Every subject and period for {data.class.name} — not just the ones you teach.</p>
                    </div>
                    {data.timetable.length === 0
                        ? <p className="px-5 py-10 text-center text-gray-400">No published timetable yet.</p>
                        : <div className="divide-y divide-gray-50">
                            {data.timetable.map((t: any) => (
                                <div key={t.id} className="px-5 py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{t.subject}</p>
                                        <p className="text-xs text-gray-400">{t.teacher?.full_name || 'Unassigned'}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 font-semibold">{DAY_NAMES[t.day_of_week] || ''} · {t.start_time}–{t.end_time}</p>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {tab === 'monitoring' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">Subject Teachers' Lesson Attendance (QR)</h3>
                        <p className="text-xs text-gray-400">Recent QR scan-in/out records for lessons held in this class.</p>
                    </div>
                    {data.lesson_monitoring.length === 0
                        ? <p className="px-5 py-10 text-center text-gray-400">No QR lesson records for this class yet.</p>
                        : <div className="divide-y divide-gray-50">
                            {data.lesson_monitoring.map((l: any) => (
                                <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{l.subject}</p>
                                        <p className="text-xs text-gray-400">{fmtDate(l.date)} · {l.scheduled_start}–{l.scheduled_end}</p>
                                    </div>
                                    {l.status === 'completed' ? (
                                        <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                        </span>
                                    ) : l.status === 'no_scan_out' ? (
                                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">No Scan-Out</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                                            <XCircle className="w-3.5 h-3.5" /> {l.status}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>}
                </div>
            )}
        </div>
    );
};

export default MyClassHubScreen;
