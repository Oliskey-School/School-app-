import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import CenteredLoader from '../ui/CenteredLoader';
import { toast } from 'react-hot-toast';
import {
    User, CalendarDays, TrendingUp, FolderOpen, Wallet, Award,
    ShieldAlert, HeartPulse, FileText, Paperclip, Users2, Activity
} from 'lucide-react';

interface AlumniHistoryScreenProps {
    studentId: string;
}

const TABS = [
    { key: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { key: 'academics', label: 'Academics', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'attendance', label: 'Attendance', icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'fees', label: 'Fees', icon: <Wallet className="w-4 h-4" /> },
    { key: 'discipline', label: 'Discipline', icon: <ShieldAlert className="w-4 h-4" /> },
    { key: 'health', label: 'Medical', icon: <HeartPulse className="w-4 h-4" /> },
    { key: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
];

function fmtDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

const AlumniHistoryScreen: React.FC<AlumniHistoryScreenProps> = ({ studentId }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<any>(`/alumni/${studentId}/history`);
            setData(res);
        } catch (err: any) {
            console.error('Error loading alumni history:', err);
            toast.error(err?.message || 'Failed to load student record');
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    if (loading) return <CenteredLoader message="Loading student record..." className="py-12" />;
    if (!data) return <div className="text-center py-12 text-gray-500">Record unavailable.</div>;

    const s = data.student;
    const infoRow = (label: string, value: React.ReactNode) => (
        <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500 font-semibold">{label}</span>
            <span className="text-sm text-gray-900 font-semibold text-right">{value || '—'}</span>
        </div>
    );

    return (
        <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 pb-24">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                {s.avatar_url
                    ? <img src={s.avatar_url} alt={s.full_name} className="w-16 h-16 rounded-full object-cover" />
                    : <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center"><User className="w-8 h-8 text-indigo-600" /></div>}
                <div>
                    <h1 className="text-xl font-bold text-gray-900 font-outfit">{s.full_name}</h1>
                    <p className="text-sm text-gray-500 font-mono">{s.school_generated_id || s.admission_number || ''}</p>
                    <p className="text-xs text-gray-400">{s.exit_class || ''} · {s.status} {s.exit_year ? `· ${s.exit_year}` : ''}</p>
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex overflow-x-auto gap-1">
                {TABS.map(tb => (
                    <motion.button key={tb.key} whileTap={{ scale: 0.96 }} onClick={() => setTab(tb.key)}
                        className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${
                            tab === tb.key ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {tab === tb.key && (
                            <motion.div layoutId="alumniHistoryTab" transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="absolute inset-0 bg-indigo-600 rounded-xl" />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">{tb.icon} {tb.label}</span>
                    </motion.button>
                ))}
            </motion.div>

            <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-2">Personal Profile</h3>
                        {infoRow('Full Name', s.full_name)}
                        {infoRow('Admission No.', s.admission_number)}
                        {infoRow('Gender', s.gender)}
                        {infoRow('Date of Birth', fmtDate(s.dob))}
                        {infoRow('Address', s.address)}
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-2">Exit Details</h3>
                        {infoRow('Status', s.status)}
                        {infoRow('Class Graduated From', s.exit_class)}
                        {infoRow('Exit Year', s.exit_year)}
                        {infoRow('Exit Date', fmtDate(s.exit_date || s.withdrawal_date))}
                        {infoRow('Reason', s.withdrawal_reason)}
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Users2 className="w-4 h-4" /> Parent / Guardian Information</h3>
                        {(data.parents || []).length === 0
                            ? <p className="text-sm text-gray-400">No parent/guardian on record.</p>
                            : (data.parents || []).map((p: any, i: number) => (
                                <div key={i} className="py-2 border-b border-gray-50 last:border-0">
                                    <p className="font-semibold text-gray-800 text-sm">{p.full_name} {p.relationship ? `(${p.relationship})` : ''}</p>
                                    <p className="text-xs text-gray-400">{p.email || ''} {p.phone ? `· ${p.phone}` : ''}</p>
                                </div>
                            ))}
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> Activities</h3>
                        {(data.activities || []).length === 0
                            ? <p className="text-sm text-gray-400">No extracurricular activities on record.</p>
                            : <div className="flex flex-wrap gap-2">
                                {(data.activities || []).map((a: any) => (
                                    <span key={a.id} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold">{a.activity?.name || 'Activity'}</span>
                                ))}
                            </div>}
                    </div>
                </div>
            )}

            {tab === 'academics' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Report Cards</h3></div>
                        {(data.report_cards || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No report cards on file.</p>
                            : <div className="divide-y divide-gray-50">
                                {(data.report_cards || []).map((r: any) => (
                                    <div key={r.id} className="px-5 py-3 flex justify-between items-center">
                                        <span className="text-sm text-gray-700 font-semibold">{r.term} · {r.session}</span>
                                        <span className="text-sm text-gray-500">Avg {r.average_score ?? '—'}</span>
                                    </div>
                                ))}
                            </div>}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Continuous Assessments</h3></div>
                        {(data.academic_performance || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No CA records on file.</p>
                            : <div className="divide-y divide-gray-50">
                                {(data.academic_performance || []).map((a: any) => (
                                    <div key={a.id} className="px-5 py-3 flex justify-between items-center">
                                        <span className="text-sm text-gray-700">{a.subject} · {a.term} {a.session}</span>
                                        <span className="text-sm font-semibold text-gray-900">{a.score}</span>
                                    </div>
                                ))}
                            </div>}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /><h3 className="font-bold text-gray-900">Awards</h3></div>
                        {(data.achievements || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No awards on record.</p>
                            : <div className="divide-y divide-gray-50">
                                {(data.achievements || []).map((a: any) => (
                                    <div key={a.id} className="px-5 py-3">
                                        <p className="font-semibold text-gray-900 text-sm">{a.title || a.name}</p>
                                        {a.description && <p className="text-xs text-gray-400">{a.description}</p>}
                                    </div>
                                ))}
                            </div>}
                    </div>
                </div>
            )}

            {tab === 'attendance' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Attendance Record</h3></div>
                    {(data.attendance || []).length === 0
                        ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No attendance records on file.</p>
                        : <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                            {(data.attendance || []).map((a: any) => (
                                <div key={a.id} className="px-5 py-2.5 flex justify-between items-center">
                                    <span className="text-sm text-gray-600">{fmtDate(a.date)}</span>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                        (a.status || '').toLowerCase() === 'present' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{a.status}</span>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {tab === 'fees' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Fee Payment History</h3></div>
                    {(data.fees || []).length === 0
                        ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No fee records on file.</p>
                        : <div className="divide-y divide-gray-50">
                            {(data.fees || []).map((f: any) => (
                                <div key={f.id} className="px-5 py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">{f.name || f.type || 'Fee'}</p>
                                        <p className="text-xs text-gray-400">{fmtDate(f.created_at)}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                        f.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{f.status || 'Pending'}</span>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {tab === 'discipline' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Suspension Letters</h3></div>
                        {(data.suspensions || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No suspensions on record.</p>
                            : <div className="divide-y divide-gray-50">
                                {(data.suspensions || []).map((sp: any) => (
                                    <div key={sp.id} className="px-5 py-4">
                                        <div className="flex justify-between items-center">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sp.status === 'active' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {sp.status === 'active' ? 'Active' : 'Returned'}
                                            </span>
                                            <span className="text-xs text-gray-400">{fmtDate(sp.start_date)} – {fmtDate(sp.return_date)}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 mt-2">{sp.reason}</p>
                                        {sp.return_conditions && <p className="text-xs text-gray-500 mt-1">Conditions: {sp.return_conditions}</p>}
                                    </div>
                                ))}
                            </div>}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Behavior Notes</h3></div>
                        {(data.behavior_notes || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No behavior notes on record.</p>
                            : <div className="divide-y divide-gray-50">
                                {(data.behavior_notes || []).map((n: any) => (
                                    <div key={n.id} className="px-5 py-3">
                                        <p className="text-sm text-gray-700 italic">"{n.note}"</p>
                                        <p className="text-xs text-gray-400 mt-1">{n.category} · {fmtDate(n.date)}</p>
                                    </div>
                                ))}
                            </div>}
                    </div>
                </div>
            )}

            {tab === 'health' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Health Logs</h3></div>
                        {(data.health_logs || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No health logs on file.</p>
                            : <div className="divide-y divide-gray-50">
                                {(data.health_logs || []).map((h: any) => (
                                    <div key={h.id} className="px-5 py-3">
                                        <p className="text-sm text-gray-700">{h.notes || h.description}</p>
                                        <p className="text-xs text-gray-400 mt-1">{fmtDate(h.created_at)}</p>
                                    </div>
                                ))}
                            </div>}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Health Incidents</h3></div>
                        {(data.health_incidents || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No incidents on record.</p>
                            : <div className="divide-y divide-gray-50">
                                {(data.health_incidents || []).map((h: any) => (
                                    <div key={h.id} className="px-5 py-3">
                                        <p className="text-sm font-semibold text-gray-800">{h.incident_type}</p>
                                        <p className="text-sm text-gray-600">{h.description}</p>
                                        <p className="text-xs text-gray-400 mt-1">{fmtDate(h.incident_date)}</p>
                                    </div>
                                ))}
                            </div>}
                    </div>
                </div>
            )}

            {tab === 'documents' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Uploaded Documents</h3></div>
                    {(data.documents || []).length === 0 && (data.id_cards || []).length === 0
                        ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No documents on file.</p>
                        : <div className="divide-y divide-gray-50">
                            {(data.documents || []).map((d: any) => (
                                <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                                    className="px-5 py-3 flex items-center gap-2 hover:bg-gray-50">
                                    <Paperclip className="w-4 h-4 text-indigo-500" />
                                    <span className="text-sm text-indigo-600 font-semibold">{d.name}</span>
                                </a>
                            ))}
                            {(data.id_cards || []).map((c: any) => (
                                <div key={c.id} className="px-5 py-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">ID Card {c.card_number ? `#${c.card_number}` : ''}</span>
                                </div>
                            ))}
                        </div>}
                </div>
            )}
            </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AlumniHistoryScreen;
