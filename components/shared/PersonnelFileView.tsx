import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    User,
    CalendarDays,
    TrendingUp,
    FolderOpen,
    Mail,
    Award,
    AlertTriangle,
    ThumbsUp,
    FileText,
    Paperclip,
    PlusIcon,
    Clock,
    CheckCircle2,
    XCircle,
    Send,
    BookOpen,
    UserCheck
} from 'lucide-react';

interface PersonnelFileViewProps {
    /** Teacher row id — required in admin mode; ignored in teacher mode. */
    teacherId?: string;
    mode: 'admin' | 'teacher';
}

const RECORD_META: Record<string, { label: string; icon: React.ReactNode; classes: string }> = {
    promotion: { label: 'Promotion', icon: <TrendingUp className="w-4 h-4" />, classes: 'bg-green-50 text-green-700' },
    commendation: { label: 'Commendation', icon: <ThumbsUp className="w-4 h-4" />, classes: 'bg-indigo-50 text-indigo-700' },
    warning: { label: 'Warning', icon: <AlertTriangle className="w-4 h-4" />, classes: 'bg-amber-50 text-amber-700' },
    disciplinary: { label: 'Disciplinary', icon: <XCircle className="w-4 h-4" />, classes: 'bg-red-50 text-red-700' },
    note: { label: 'Note', icon: <FileText className="w-4 h-4" />, classes: 'bg-gray-100 text-gray-600' },
};

const QUERY_STATUS: Record<string, { label: string; classes: string }> = {
    pending: { label: 'Awaiting Response', classes: 'bg-amber-50 text-amber-700' },
    responded: { label: 'Response Received', classes: 'bg-blue-50 text-blue-700' },
    resolved: { label: 'Resolved', classes: 'bg-green-50 text-green-700' },
    warning_issued: { label: 'Warning Issued', classes: 'bg-red-50 text-red-700' },
    escalated: { label: 'Escalated', classes: 'bg-purple-50 text-purple-700' },
};

const TABS = [
    { key: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { key: 'teaching', label: 'Teaching', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'attendance', label: 'Attendance', icon: <CalendarDays className="w-4 h-4" /> },
    { key: 'performance', label: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'records', label: 'Records', icon: <FolderOpen className="w-4 h-4" /> },
    { key: 'queries', label: 'Query Letters', icon: <Mail className="w-4 h-4" /> },
];

function fmtDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Shared multi-file attach control: uploads immediately, returns URLs. */
const AttachmentInput: React.FC<{ urls: string[]; onChange: (urls: string[]) => void }> = ({ urls, onChange }) => {
    const [uploading, setUploading] = useState(false);
    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const uploaded: string[] = [];
            for (const f of files) {
                const res = await api.uploadFile(f);
                const url = (res as any).publicUrl || (res as any).url;
                if (url) uploaded.push(url);
            }
            onChange([...urls, ...uploaded]);
            if (uploaded.length) toast.success(`${uploaded.length} document(s) attached`);
        } catch (err) {
            console.error('Attachment upload failed:', err);
            toast.error('Failed to upload document');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };
    return (
        <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-indigo-600 cursor-pointer hover:text-indigo-800">
                <Paperclip className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Attach supporting documents'}
                <input type="file" multiple className="hidden" onChange={handleFiles} disabled={uploading} />
            </label>
            {urls.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{urls.length} document(s) attached</p>
            )}
        </div>
    );
};

const AttachmentLinks: React.FC<{ urls?: string[] }> = ({ urls }) => {
    if (!urls || urls.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2 mt-2">
            {urls.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100">
                    <Paperclip className="w-3 h-3" /> Document {i + 1}
                </a>
            ))}
        </div>
    );
};

const PersonnelFileView: React.FC<PersonnelFileViewProps> = ({ teacherId, mode }) => {
    const [file, setFile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    // Admin modals
    const [showAddRecord, setShowAddRecord] = useState(false);
    const [showIssueQuery, setShowIssueQuery] = useState(false);
    const [closingQuery, setClosingQuery] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [recordForm, setRecordForm] = useState({ type: 'commendation', title: '', details: '', effective_date: todayStr(), attachment_urls: [] as string[] });
    const [queryForm, setQueryForm] = useState({ subject: '', reason: '', issue_date: todayStr(), response_deadline: '', attachment_urls: [] as string[] });
    const [closeForm, setCloseForm] = useState({ outcome: 'resolved', outcome_note: '' });

    // Teacher respond form
    const [respondingTo, setRespondingTo] = useState<any>(null);
    const [responseForm, setResponseForm] = useState({ response_text: '', attachment_urls: [] as string[] });

    const [teachingHistory, setTeachingHistory] = useState<any[]>([]);

    const fetchFile = useCallback(async () => {
        setLoading(true);
        try {
            const data = mode === 'admin'
                ? await api.get<any>(`/personnel/teachers/${teacherId}/file`)
                : await api.get<any>('/personnel/my-file');
            setFile(data);
            if (mode === 'admin' && data?.teacher?.id) {
                api.get<any[]>(`/teacher-assignments/teacher/${data.teacher.id}/history`)
                    .then(setTeachingHistory)
                    .catch(() => setTeachingHistory([]));
            }
        } catch (err: any) {
            console.error('Error loading personnel file:', err);
            toast.error(err?.message || 'Failed to load personnel file');
        } finally {
            setLoading(false);
        }
    }, [teacherId, mode]);

    useEffect(() => {
        if (mode === 'teacher' || teacherId) fetchFile();
    }, [fetchFile, mode, teacherId]);

    const handleAddRecord = async () => {
        if (!recordForm.title.trim()) { toast.error('Please enter a title'); return; }
        setSaving(true);
        try {
            await api.post('/personnel/records', { ...recordForm, teacher_id: file.teacher.id });
            toast.success('Record added to personnel file');
            setShowAddRecord(false);
            setRecordForm({ type: 'commendation', title: '', details: '', effective_date: todayStr(), attachment_urls: [] });
            fetchFile();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add record');
        } finally { setSaving(false); }
    };

    const handleIssueQuery = async () => {
        if (!queryForm.subject.trim()) { toast.error('Please enter a subject'); return; }
        if (!queryForm.reason.trim()) { toast.error('Please state the reason for the query'); return; }
        if (!queryForm.response_deadline) { toast.error('Please set a response deadline'); return; }
        setSaving(true);
        try {
            await api.post('/personnel/query-letters', { ...queryForm, teacher_id: file.teacher.id });
            toast.success('Query letter issued — the teacher has been notified');
            setShowIssueQuery(false);
            setQueryForm({ subject: '', reason: '', issue_date: todayStr(), response_deadline: '', attachment_urls: [] });
            fetchFile();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to issue query letter');
        } finally { setSaving(false); }
    };

    const handleCloseQuery = async () => {
        setSaving(true);
        try {
            await api.post(`/personnel/query-letters/${closingQuery.id}/close`, closeForm);
            toast.success('Query letter closed');
            setClosingQuery(null);
            setCloseForm({ outcome: 'resolved', outcome_note: '' });
            fetchFile();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to close query letter');
        } finally { setSaving(false); }
    };

    const handleRespond = async () => {
        if (!responseForm.response_text.trim()) { toast.error('Please write your response'); return; }
        setSaving(true);
        try {
            await api.post(`/personnel/query-letters/${respondingTo.id}/respond`, responseForm);
            toast.success('Your response has been submitted');
            setRespondingTo(null);
            setResponseForm({ response_text: '', attachment_urls: [] });
            fetchFile();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to submit response');
        } finally { setSaving(false); }
    };

    if (loading) {
        return <div className="text-center py-12 text-gray-500">Loading personnel file...</div>;
    }
    if (!file) {
        return <div className="text-center py-12 text-gray-500">Personnel file unavailable.</div>;
    }

    const t = file.teacher;
    const records: any[] = file.records || [];
    const queries: any[] = file.query_letters || [];
    const evaluations: any[] = file.evaluations || [];
    const att = file.attendance || {};

    const infoRow = (label: string, value: React.ReactNode) => (
        <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm text-gray-500 font-semibold">{label}</span>
            <span className="text-sm text-gray-900 font-semibold text-right">{value || '—'}</span>
        </div>
    );

    return (
        <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 pb-24">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                {t.avatar_url
                    ? <img src={t.avatar_url} alt={t.full_name} className="w-16 h-16 rounded-full object-cover" />
                    : <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="w-8 h-8 text-indigo-600" />
                    </div>}
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-gray-900 font-outfit truncate">{t.full_name}</h1>
                    <p className="text-sm text-gray-500 font-mono">{t.school_generated_id || ''}</p>
                    <p className="text-xs text-gray-400">{t.branch_name || ''}{t.status ? ` · ${t.status}` : ''}</p>
                </div>
                {mode === 'admin' && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={() => setShowAddRecord(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-semibold text-sm hover:bg-indigo-100 transition-colors">
                            <PlusIcon className="w-4 h-4" /> Add Record
                        </button>
                        <button onClick={() => setShowIssueQuery(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl font-semibold text-sm hover:bg-amber-100 transition-colors">
                            <Mail className="w-4 h-4" /> Issue Query Letter
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex overflow-x-auto gap-1">
                {TABS.map(tb => (
                    <button key={tb.key} onClick={() => setTab(tb.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
                            tab === tb.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {tb.icon} {tb.label}
                        {tb.key === 'queries' && queries.some(q => q.status === 'pending') && (
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                    </button>
                ))}
            </div>

            {/* ---- Overview ---- */}
            {tab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-2">Personal Information</h3>
                        {infoRow('Full Name', t.full_name)}
                        {infoRow('Staff ID', t.school_generated_id)}
                        {infoRow('Email', t.email)}
                        {infoRow('Phone', t.phone)}
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-2">Employment Details</h3>
                        {infoRow('Branch', t.branch_name)}
                        {infoRow('Status', t.status)}
                        {infoRow('Employed Since', fmtDate(t.employed_since))}
                        {infoRow('Curriculum', t.curriculum_type)}
                    </div>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 md:col-span-2">
                        <h3 className="font-bold text-gray-900 mb-2">Qualifications</h3>
                        {infoRow('Subject Specialty', (t.subject_specialty || []).join(', '))}
                        {infoRow('Curriculum Eligibility', (t.curriculum_eligibility || []).join(', '))}
                        {infoRow('Degree Certificate', t.degree_certificate ? <a className="text-indigo-600 underline" href={t.degree_certificate} target="_blank" rel="noopener noreferrer">View</a> : '—')}
                        {infoRow('TRCN Certificate', t.trcn_certificate ? <a className="text-indigo-600 underline" href={t.trcn_certificate} target="_blank" rel="noopener noreferrer">View</a> : '—')}
                        {infoRow('British Qualification', t.british_qualification)}
                    </div>
                </div>
            )}

            {/* ---- Teaching (roles + history) ---- */}
            {tab === 'teaching' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Teaching History</h3></div>
                    {mode !== 'admin' ? (
                        <p className="px-5 py-6 text-sm text-gray-400 text-center">Only admins can view teaching history here.</p>
                    ) : teachingHistory.length === 0 ? (
                        <p className="px-5 py-6 text-sm text-gray-400 text-center">No class or subject assignments on record.</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {teachingHistory.map((h: any) => (
                                <div key={h.id} className="px-5 py-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${h.role === 'class_teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {h.role === 'class_teacher' ? <UserCheck className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {h.role === 'class_teacher' ? `Class Teacher — ${h.class?.name}` : `${h.subject?.name} — ${h.class?.name}`}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {h.session ? `${h.session} Term ${h.term}` : ''}
                                                {h.effective_date ? ` · from ${fmtDate(h.effective_date)}` : ''}
                                                {h.ended_at ? ` · ended ${fmtDate(h.ended_at)}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${h.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {h.status === 'active' ? 'Active' : 'Ended'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ---- Attendance ---- */}
            {tab === 'attendance' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Days Present', value: att.present ?? 0, classes: 'text-green-600' },
                            { label: 'Days Absent', value: att.absent ?? 0, classes: 'text-red-600' },
                            { label: 'Days Late', value: att.late ?? 0, classes: 'text-amber-600' },
                            { label: 'Lessons Completed', value: att.lessons?.completed ?? 0, classes: 'text-indigo-600' },
                        ].map((c, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <p className={`text-2xl font-bold ${c.classes}`}>{c.value}</p>
                                <p className="text-xs text-gray-500 font-semibold">{c.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Recent Daily Attendance (last 30)</h3></div>
                        {(att.recent || []).length === 0
                            ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No attendance records yet.</p>
                            : <div className="divide-y divide-gray-50">
                                {(att.recent || []).map((a: any) => (
                                    <div key={a.id} className="px-5 py-2.5 flex justify-between items-center">
                                        <span className="text-sm text-gray-600">{fmtDate(a.date)}</span>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                            (a.status || '').toLowerCase() === 'present' ? 'bg-green-50 text-green-700'
                                                : (a.status || '').toLowerCase() === 'late' ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-red-50 text-red-700'}`}>{a.status}</span>
                                    </div>
                                ))}
                            </div>}
                    </div>
                </div>
            )}

            {/* ---- Performance ---- */}
            {tab === 'performance' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-bold text-gray-900">Performance History</h3></div>
                    {evaluations.length === 0
                        ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No performance evaluations yet.</p>
                        : <div className="divide-y divide-gray-50">
                            {evaluations.map((e: any) => (
                                <div key={e.id} className="px-5 py-4">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <span key={n} className={`text-lg ${n <= (e.rating || 0) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
                                            ))}
                                        </span>
                                        <span className="text-xs text-gray-400">{fmtDate(e.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{e.feedback}</p>
                                </div>
                            ))}
                        </div>}
                </div>
            )}

            {/* ---- Records ---- */}
            {tab === 'records' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Permanent Records</h3>
                        {mode === 'admin' && (
                            <button onClick={() => setShowAddRecord(true)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Add Record</button>
                        )}
                    </div>
                    {records.length === 0
                        ? <p className="px-5 py-6 text-sm text-gray-400 text-center">No records in the file yet.</p>
                        : <div className="divide-y divide-gray-50">
                            {records.map((r: any) => {
                                const meta = RECORD_META[r.type] || RECORD_META.note;
                                return (
                                    <div key={r.id} className="px-5 py-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${meta.classes}`}>
                                                {meta.icon} {meta.label}
                                            </span>
                                            <span className="text-xs text-gray-400">{fmtDate(r.effective_date || r.created_at)}</span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 mt-2">{r.title}</h4>
                                        {r.details && <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{r.details}</p>}
                                        <AttachmentLinks urls={r.attachment_urls} />
                                    </div>
                                );
                            })}
                        </div>}
                </div>
            )}

            {/* ---- Query Letters ---- */}
            {tab === 'queries' && (
                <div className="space-y-4">
                    {queries.length === 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                            <Mail className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-semibold">No query letters on file.</p>
                        </div>
                    )}
                    {queries.map((q: any) => {
                        const st = QUERY_STATUS[q.status] || QUERY_STATUS.pending;
                        const canRespond = mode === 'teacher' && q.status === 'pending';
                        const canClose = mode === 'admin' && ['pending', 'responded'].includes(q.status);
                        return (
                            <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-50">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h4 className="font-bold text-gray-900">{q.subject}</h4>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${st.classes}`}>{st.label}</span>
                                            {q.is_overdue && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700">Overdue</span>}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Issued {fmtDate(q.issue_date)}{q.issued_by_name ? ` by ${q.issued_by_name}` : ''} · Respond by {fmtDate(q.response_deadline)}
                                    </p>
                                </div>
                                <div className="px-5 py-4 space-y-4">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Query</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.reason}</p>
                                        <AttachmentLinks urls={q.attachment_urls} />
                                    </div>

                                    {q.response_text ? (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                                                Teacher's Response
                                                {q.is_late_response && (
                                                    <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full normal-case flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Submitted after deadline
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.response_text}</p>
                                            <p className="text-xs text-gray-400 mt-1">Submitted {fmtDate(q.responded_at)}</p>
                                            <AttachmentLinks urls={q.response_attachment_urls} />
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No response submitted yet.</p>
                                    )}

                                    {q.closed_at && (
                                        <div className="flex items-start gap-2 bg-indigo-50/60 rounded-xl p-3">
                                            <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-indigo-900">Outcome: {st.label}</p>
                                                {q.outcome_note && <p className="text-sm text-indigo-800/80">{q.outcome_note}</p>}
                                                <p className="text-xs text-indigo-400 mt-0.5">Closed {fmtDate(q.closed_at)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {canRespond && (
                                        respondingTo?.id === q.id ? (
                                            <div className="border border-indigo-100 rounded-xl p-4 space-y-3">
                                                {todayStr() > q.response_deadline && (
                                                    <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        The deadline has passed — your response will be marked as submitted late.
                                                    </p>
                                                )}
                                                <textarea
                                                    rows={5}
                                                    placeholder="Write your formal response to this query..."
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                    value={responseForm.response_text}
                                                    onChange={e => setResponseForm({ ...responseForm, response_text: e.target.value })}
                                                />
                                                <AttachmentInput
                                                    urls={responseForm.attachment_urls}
                                                    onChange={urls => setResponseForm({ ...responseForm, attachment_urls: urls })}
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setRespondingTo(null)}
                                                        className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm">
                                                        Cancel
                                                    </button>
                                                    <button onClick={handleRespond} disabled={saving}
                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm disabled:opacity-60">
                                                        <Send className="w-4 h-4" /> {saving ? 'Submitting...' : 'Submit Response'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={() => setRespondingTo(q)}
                                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors text-sm">
                                                Respond to this Query
                                            </button>
                                        )
                                    )}

                                    {canClose && (
                                        <button onClick={() => setClosingQuery(q)}
                                            className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors text-sm">
                                            Close with Outcome
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ---- Add Record modal (admin) ---- */}
            {showAddRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Add Record to File</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Record Type</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={recordForm.type}
                                    onChange={e => setRecordForm({ ...recordForm, type: e.target.value })}>
                                    <option value="commendation">Commendation</option>
                                    <option value="promotion">Promotion</option>
                                    <option value="warning">Warning</option>
                                    <option value="disciplinary">Disciplinary Record</option>
                                    <option value="note">General Note</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                                <input type="text" placeholder="e.g. Promoted to Head of Department"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={recordForm.title}
                                    onChange={e => setRecordForm({ ...recordForm, title: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Details (optional)</label>
                                <textarea rows={3}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={recordForm.details}
                                    onChange={e => setRecordForm({ ...recordForm, details: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Effective Date</label>
                                <input type="date"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={recordForm.effective_date}
                                    onChange={e => setRecordForm({ ...recordForm, effective_date: e.target.value })} />
                            </div>
                            <AttachmentInput urls={recordForm.attachment_urls}
                                onChange={urls => setRecordForm({ ...recordForm, attachment_urls: urls })} />
                            <p className="text-xs text-gray-400">Records are permanent. They can be corrected only on the day they are written.</p>
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={() => setShowAddRecord(false)}
                                className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleAddRecord} disabled={saving}
                                className="flex-grow py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60">
                                {saving ? 'Saving...' : 'Add to File'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Issue Query modal (admin) ---- */}
            {showIssueQuery && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Issue Query Letter</h2>
                        <p className="text-sm text-gray-500 -mt-3">To: <span className="font-semibold text-gray-800">{t.full_name}</span></p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                                <input type="text" placeholder="e.g. Unauthorized absence on 10 July"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={queryForm.subject}
                                    onChange={e => setQueryForm({ ...queryForm, subject: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Query</label>
                                <textarea rows={5} placeholder="State the full reason for this query..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={queryForm.reason}
                                    onChange={e => setQueryForm({ ...queryForm, reason: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Issue Date</label>
                                    <input type="date"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={queryForm.issue_date}
                                        onChange={e => setQueryForm({ ...queryForm, issue_date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Response Deadline</label>
                                    <input type="date"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={queryForm.response_deadline}
                                        onChange={e => setQueryForm({ ...queryForm, response_deadline: e.target.value })} />
                                </div>
                            </div>
                            <AttachmentInput urls={queryForm.attachment_urls}
                                onChange={urls => setQueryForm({ ...queryForm, attachment_urls: urls })} />
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={() => setShowIssueQuery(false)}
                                className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleIssueQuery} disabled={saving}
                                className="flex-grow py-3 px-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200 disabled:opacity-60">
                                {saving ? 'Sending...' : 'Send Query Letter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- Close Query modal (admin) ---- */}
            {closingQuery && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Close Query Letter</h2>
                        <p className="text-sm text-gray-500 -mt-3">"{closingQuery.subject}"</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Outcome</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={closeForm.outcome}
                                    onChange={e => setCloseForm({ ...closeForm, outcome: e.target.value })}>
                                    <option value="resolved">Resolved — no further action</option>
                                    <option value="warning_issued">Warning Issued (added to file)</option>
                                    <option value="escalated">Escalated</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Note (optional)</label>
                                <textarea rows={3}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={closeForm.outcome_note}
                                    onChange={e => setCloseForm({ ...closeForm, outcome_note: e.target.value })} />
                            </div>
                            {closeForm.outcome === 'warning_issued' && (
                                <p className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    A permanent warning record will be added to the teacher's file.
                                </p>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={() => setClosingQuery(null)}
                                className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={handleCloseQuery} disabled={saving}
                                className="flex-grow py-3 px-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-60">
                                {saving ? 'Closing...' : 'Close Query'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelFileView;
