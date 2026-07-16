import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { UserCheck, Clock, CheckCircle2, XCircle, History, Star, Users } from 'lucide-react';

interface Suggestion {
    teacher_id: string;
    name: string;
    avatar_url: string | null;
    match_reason: string;
    score: number;
}

interface CoveragePeriod {
    timetable_id: string;
    date: string;
    subject: string;
    class_name: string | null;
    start_time: string;
    end_time: string;
    room: string | null;
    original_teacher_name: string;
    suggestions: Suggestion[];
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_STYLES: Record<string, string> = {
    Assigned: 'bg-amber-50 text-amber-700',
    Accepted: 'bg-green-50 text-green-700',
    Declined: 'bg-red-50 text-red-700',
    Completed: 'bg-gray-100 text-gray-600',
};

const SubstituteCoverageScreen = () => {
    const [date, setDate] = useState(todayStr());
    const [coverage, setCoverage] = useState<CoveragePeriod[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigningId, setAssigningId] = useState<string | null>(null);
    const [tab, setTab] = useState<'needed' | 'history'>('needed');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [cov, hist] = await Promise.all([
                api.getSubstituteCoverage(date),
                api.getSubstituteHistory(date),
            ]);
            setCoverage(Array.isArray(cov) ? cov : []);
            setHistory(Array.isArray(hist) ? hist : []);
        } catch (err) {
            console.error('Error loading substitute coverage:', err);
            toast.error('Failed to load coverage data');
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAssign = async (period: CoveragePeriod, teacherId: string) => {
        setAssigningId(`${period.timetable_id}-${teacherId}`);
        try {
            await api.assignSubstitute({ timetable_id: period.timetable_id, date: period.date, substitute_teacher_id: teacherId });
            toast.success('Substitute assigned — everyone has been notified');
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to assign substitute');
        } finally {
            setAssigningId(null);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">Substitute Coverage</h1>
                    <p className="text-gray-500">Absent teachers today, and who's free to cover their classes.</p>
                </div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-600" />
            </div>

            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1 w-fit">
                <button onClick={() => setTab('needed')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'needed' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <UserCheck className="w-4 h-4" /> Coverage Needed {coverage.length > 0 && `(${coverage.length})`}
                </button>
                <button onClick={() => setTab('history')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'history' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <History className="w-4 h-4" /> History
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : tab === 'needed' ? (
                coverage.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                        <h3 className="font-bold text-lg text-gray-900">All covered</h3>
                        <p className="text-gray-500 mt-1">No absent teachers with uncovered periods for this date.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {coverage.map(period => (
                            <div key={period.timetable_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div>
                                        <p className="font-bold text-gray-900">{period.subject} — {period.class_name || 'Unassigned Class'}</p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> {period.start_time}–{period.end_time} · Absent: {period.original_teacher_name}
                                            {period.room ? ` · ${period.room}` : ''}
                                        </p>
                                    </div>
                                </div>
                                {period.suggestions.length === 0 ? (
                                    <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-3 py-2">No free teachers found for this period.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                        {period.suggestions.map(s => (
                                            <button key={s.teacher_id}
                                                onClick={() => handleAssign(period, s.teacher_id)}
                                                disabled={assigningId === `${period.timetable_id}-${s.teacher_id}`}
                                                className="flex flex-col items-start p-3 border border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors text-left disabled:opacity-60">
                                                <div className="flex items-center gap-1.5 w-full">
                                                    {s.score === 2 && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                                                    <span className="font-semibold text-gray-900 text-sm truncate">{s.name}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">{s.match_reason}</span>
                                                <span className="text-xs font-bold text-indigo-600 mt-1">
                                                    {assigningId === `${period.timetable_id}-${s.teacher_id}` ? 'Assigning...' : 'Assign →'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {history.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-semibold">No substitute assignments for this date.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {history.map((h: any) => (
                                <div key={h.id} className="px-5 py-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{h.substitute_teacher_name} covering for {h.original_teacher_name}</p>
                                        <p className="text-xs text-gray-400">{h.class_name} · {h.start_time}–{h.end_time}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[h.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {h.status === 'Accepted' ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : h.status === 'Declined' ? <XCircle className="w-3.5 h-3.5 inline mr-1" /> : null}
                                        {h.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubstituteCoverageScreen;
