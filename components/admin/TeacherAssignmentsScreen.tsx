import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { toast } from 'react-hot-toast';
import {
    Users, BookOpen, BarChart3, PlusIcon, Trash2, ArrowRightLeft,
    UserCheck, GraduationCap, Settings, ArrowLeft
} from 'lucide-react';

interface Assignment {
    id: string;
    role: 'class_teacher' | 'subject_teacher';
    session: string | null;
    term: number | null;
    periods_per_week: number | null;
    teacher: { id: string; full_name: string; school_generated_id: string | null; avatar_url: string | null };
    class: { id: string; name: string } | null;
    subject: { id: string; name: string } | null;
}

interface WorkloadRow {
    teacher_id: string;
    teacher_name: string;
    teacher_generated_id: string | null;
    class_teacher_of: string[];
    subject_classes: { subject: string; class: string; periods_per_week: number | null }[];
    total_periods: number;
    duties: string[];
    clubs: string[];
    workload_level: 'Low' | 'Balanced' | 'High';
}

const TABS = [
    { key: 'class', label: 'Class Teachers', icon: <UserCheck className="w-4 h-4" /> },
    { key: 'subject', label: 'Subject Teachers', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'workload', label: 'Workload', icon: <BarChart3 className="w-4 h-4" /> },
];

interface TeacherAssignmentsScreenProps {
    /** When opened from a specific teacher's Edit page: scopes the list to
     * just that teacher and pre-fills the assign forms with them locked in. */
    teacherId?: string;
    teacherName?: string;
    handleBack?: () => void;
}

const TeacherAssignmentsScreen: React.FC<TeacherAssignmentsScreenProps> = ({ teacherId, teacherName, handleBack }) => {
    const { currentSchool } = useAuth();
    const { currentBranch } = useBranch();
    const [tab, setTab] = useState<'class' | 'subject' | 'workload'>('class');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [workload, setWorkload] = useState<WorkloadRow[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAssignClass, setShowAssignClass] = useState(false);
    const [showAssignSubject, setShowAssignSubject] = useState(false);
    const [allowCoTeachers, setAllowCoTeachers] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [saving, setSaving] = useState(false);

    const [classForm, setClassForm] = useState({ teacher_id: teacherId || '', class_id: '', effective_date: '' });
    const [subjectForm, setSubjectForm] = useState({ teacher_id: teacherId || '', subject_id: '', class_ids: [] as string[], periods_per_week: '' });
    const [dutyFormFor, setDutyFormFor] = useState<string | null>(null);
    const [dutyName, setDutyName] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const roleParam = tab === 'workload' ? '' : tab === 'class' ? 'class_teacher' : 'subject_teacher';
            const teacherParam = teacherId ? `&teacherId=${teacherId}` : '';
            const [assignRes, teachersRes, classesRes, subjectsRes, coSetting] = await Promise.all([
                api.get<Assignment[]>(`/teacher-assignments?role=${roleParam}${teacherParam}`),
                api.getTeachers(currentSchool?.id, currentBranch?.id),
                api.getClasses(currentSchool?.id, currentBranch?.id),
                api.getSubjects(currentSchool?.id, currentBranch?.id),
                api.get<{ allow_co_class_teachers: boolean }>('/teacher-assignments/settings/co-class-teachers'),
            ]);
            setAssignments(Array.isArray(assignRes) ? assignRes : []);
            setTeachers(Array.isArray(teachersRes) ? teachersRes : []);
            setClasses(Array.isArray(classesRes) ? classesRes : []);
            setSubjects(Array.isArray(subjectsRes) ? subjectsRes : []);
            setAllowCoTeachers(!!coSetting?.allow_co_class_teachers);

            if (tab === 'workload') {
                const w = await api.get<WorkloadRow[]>('/teacher-assignments/workload');
                setWorkload(Array.isArray(w) ? w.filter(row => !teacherId || row.teacher_id === teacherId) : []);
            }
        } catch (err) {
            console.error('Error loading teacher assignments:', err);
            toast.error('Failed to load teacher assignments');
        } finally {
            setLoading(false);
        }
    }, [tab, currentSchool?.id, currentBranch?.id, teacherId]);

    useEffect(() => { if (currentSchool) fetchAll(); }, [currentSchool, fetchAll]);

    const handleAddDuty = async (targetTeacherId: string) => {
        if (!dutyName.trim()) { toast.error('Enter a duty name'); return; }
        try {
            await api.addTeacherDuty({ teacher_id: targetTeacherId, name: dutyName.trim() });
            toast.success('Duty added');
            setDutyName('');
            setDutyFormFor(null);
            fetchAll();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add duty');
        }
    };

    const handleAssignClass = async (force = false) => {
        if (!classForm.teacher_id || !classForm.class_id) { toast.error('Please select a teacher and a class'); return; }
        setSaving(true);
        try {
            await api.post('/teacher-assignments/class-teacher', { ...classForm, force });
            toast.success('Class Teacher assigned');
            setShowAssignClass(false);
            setClassForm({ teacher_id: '', class_id: '', effective_date: '' });
            fetchAll();
        } catch (err: any) {
            // The backend asks "Replace them?" in the message when a different
            // teacher is already the active Class Teacher and co-teachers are
            // off — the API client only surfaces the message text, not the
            // structured 409 body, so we match on that phrasing to re-confirm.
            if (/Replace them\?$/.test(err?.message || '')) {
                if (window.confirm(err.message)) {
                    await handleAssignClass(true);
                    return;
                }
            } else {
                toast.error(err?.message || 'Failed to assign class teacher');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAssignSubject = async (force = false) => {
        if (!subjectForm.teacher_id || !subjectForm.subject_id || subjectForm.class_ids.length === 0) {
            toast.error('Please select a teacher, subject, and at least one class'); return;
        }
        setSaving(true);
        try {
            const res: any = await api.post('/teacher-assignments/subject-teacher', {
                ...subjectForm,
                periods_per_week: subjectForm.periods_per_week ? Number(subjectForm.periods_per_week) : undefined,
                force,
            });
            toast.success(`Subject Teacher assigned to ${res.created?.length || 0} class(es)`);
            setShowAssignSubject(false);
            setSubjectForm({ teacher_id: '', subject_id: '', class_ids: [], periods_per_week: '' });
            fetchAll();
        } catch (err: any) {
            if (/conflicts with the teacher's existing timetable/.test(err?.message || '')) {
                if (window.confirm(`${err.message}. Assign anyway?`)) {
                    await handleAssignSubject(true);
                    return;
                }
            } else {
                toast.error(err?.message || 'Failed to assign subject teacher');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (!window.confirm('End this assignment? It stays on record as teaching history.')) return;
        try {
            await api.delete(`/teacher-assignments/${id}`);
            toast.success('Assignment ended');
            fetchAll();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to end assignment');
        }
    };

    const handleToggleCoTeachers = async () => {
        setSaving(true);
        try {
            await api.put('/teacher-assignments/settings/co-class-teachers', { allow_co_class_teachers: !allowCoTeachers });
            setAllowCoTeachers(!allowCoTeachers);
            toast.success(`Co-class teachers ${!allowCoTeachers ? 'enabled' : 'disabled'}`);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update setting');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    {teacherId && handleBack && (
                        <button onClick={handleBack} className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 mb-1">
                            <ArrowLeft className="w-4 h-4" /> Back to {teacherName || 'Teacher'}
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">
                        {teacherId ? `${teacherName || 'Teacher'}'s Assignments` : 'Teacher Assignments'}
                    </h1>
                    <p className="text-gray-500">
                        {teacherId
                            ? 'Class Teacher and Subject Teacher roles for this teacher, with full teaching history.'
                            : 'Assign Class Teachers and Subject Teachers, and track workload.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSettings(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">
                        <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button onClick={() => setShowAssignClass(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
                        <UserCheck className="w-4 h-4" /> Assign Class Teacher
                    </button>
                    <button onClick={() => setShowAssignSubject(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">
                        <BookOpen className="w-4 h-4" /> Assign Subject Teacher
                    </button>
                </div>
            </div>

            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1 w-fit">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key as any)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading assignments...</div>
            ) : tab === 'workload' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                                    <th className="px-5 py-3 font-semibold">Teacher</th>
                                    <th className="px-5 py-3 font-semibold">Class Teacher Of</th>
                                    <th className="px-5 py-3 font-semibold">Subjects Taught</th>
                                    <th className="px-5 py-3 font-semibold">Duties & Clubs</th>
                                    <th className="px-5 py-3 font-semibold text-center">Periods/Week</th>
                                    <th className="px-5 py-3 font-semibold text-center">Workload</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workload.map(w => (
                                    <tr key={w.teacher_id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-5 py-3">
                                            <p className="font-semibold text-gray-900">{w.teacher_name}</p>
                                            {w.teacher_generated_id && <p className="text-xs text-gray-400 font-mono">{w.teacher_generated_id}</p>}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">{w.class_teacher_of.join(', ') || '—'}</td>
                                        <td className="px-5 py-3 text-gray-600">
                                            {w.subject_classes.length === 0 ? '—' : w.subject_classes.map((s, i) => (
                                                <span key={i} className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full mr-1 mb-1">
                                                    {s.subject} · {s.class}
                                                </span>
                                            ))}
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">
                                            {w.duties.map((d, i) => (
                                                <span key={`d-${i}`} className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full mr-1 mb-1">{d}</span>
                                            ))}
                                            {w.clubs.map((c, i) => (
                                                <span key={`c-${i}`} className="inline-block bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full mr-1 mb-1">{c}</span>
                                            ))}
                                            {dutyFormFor === w.teacher_id ? (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <input value={dutyName} onChange={e => setDutyName(e.target.value)} placeholder="Duty name"
                                                        className="border border-gray-200 rounded px-2 py-1 text-xs w-28 outline-none focus:ring-1 focus:ring-indigo-400" />
                                                    <button onClick={() => handleAddDuty(w.teacher_id)} className="text-xs font-semibold text-indigo-600">Add</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDutyFormFor(w.teacher_id)} className="text-xs font-semibold text-gray-400 hover:text-indigo-600">+ Duty</button>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center font-bold text-gray-900">{w.total_periods || '—'}</td>
                                        <td className="px-5 py-3 text-center">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${w.workload_level === 'High' ? 'bg-red-50 text-red-700' : w.workload_level === 'Low' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                                {w.workload_level}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {workload.length === 0 && (
                                    <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">No active assignments yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {assignments.length === 0 ? (
                        <div className="p-12 text-center">
                            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-semibold">No {tab === 'class' ? 'Class' : 'Subject'} Teacher assignments yet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {assignments.map(a => (
                                <div key={a.id} className="px-5 py-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {a.teacher.avatar_url
                                            ? <img src={a.teacher.avatar_url} alt={a.teacher.full_name} className="w-9 h-9 rounded-full object-cover" />
                                            : <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center"><Users className="w-4 h-4 text-indigo-600" /></div>}
                                        <div>
                                            <p className="font-semibold text-gray-900">{a.teacher.full_name}</p>
                                            <p className="text-xs text-gray-400">
                                                {a.role === 'class_teacher'
                                                    ? `Class Teacher · ${a.class?.name}`
                                                    : `${a.subject?.name} · ${a.class?.name}${a.periods_per_week ? ` · ${a.periods_per_week} periods/week` : ''}`}
                                                {a.session ? ` · ${a.session} Term ${a.term}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemove(a.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors" title="End assignment">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Assign Class Teacher modal */}
            {showAssignClass && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Assign Class Teacher</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Teacher</label>
                                {teacherId ? (
                                    <div className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-semibold">{teacherName}</div>
                                ) : (
                                    <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={classForm.teacher_id} onChange={e => setClassForm({ ...classForm, teacher_id: e.target.value })}>
                                        <option value="">Select teacher...</option>
                                        {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name || t.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Class</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={classForm.class_id} onChange={e => setClassForm({ ...classForm, class_id: e.target.value })}>
                                    <option value="">Select class...</option>
                                    {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Effective Date</label>
                                <input type="date" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={classForm.effective_date} onChange={e => setClassForm({ ...classForm, effective_date: e.target.value })} />
                            </div>
                            {allowCoTeachers && (
                                <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl">Co-class teachers are enabled — this class may have more than one active Class Teacher.</p>
                            )}
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={() => setShowAssignClass(false)} className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => handleAssignClass(false)} disabled={saving}
                                className="flex-grow py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60">
                                {saving ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Subject Teacher modal */}
            {showAssignSubject && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Assign Subject Teacher</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Teacher</label>
                                {teacherId ? (
                                    <div className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-semibold">{teacherName}</div>
                                ) : (
                                    <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={subjectForm.teacher_id} onChange={e => setSubjectForm({ ...subjectForm, teacher_id: e.target.value })}>
                                        <option value="">Select teacher...</option>
                                        {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name || t.name}</option>)}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                                <select className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={subjectForm.subject_id} onChange={e => setSubjectForm({ ...subjectForm, subject_id: e.target.value })}>
                                    <option value="">Select subject...</option>
                                    {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Classes (select all that apply)</label>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                                    {classes.map((c: any) => (
                                        <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                                            <input type="checkbox"
                                                checked={subjectForm.class_ids.includes(c.id)}
                                                onChange={e => setSubjectForm({
                                                    ...subjectForm,
                                                    class_ids: e.target.checked
                                                        ? [...subjectForm.class_ids, c.id]
                                                        : subjectForm.class_ids.filter(id => id !== c.id),
                                                })} />
                                            <span className="text-sm text-gray-700">{c.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Periods per Week (optional)</label>
                                <input type="number" min="1" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={subjectForm.periods_per_week} onChange={e => setSubjectForm({ ...subjectForm, periods_per_week: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex space-x-3">
                            <button onClick={() => setShowAssignSubject(false)} className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => handleAssignSubject(false)} disabled={saving}
                                className="flex-grow py-3 px-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-60">
                                {saving ? 'Assigning...' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">Assignment Settings</h2>
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">Allow Co-Class Teachers</p>
                                <p className="text-xs text-gray-500 mt-0.5">Let a class have more than one active Class Teacher.</p>
                            </div>
                            <button onClick={handleToggleCoTeachers} disabled={saving}
                                className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${allowCoTeachers ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${allowCoTeachers ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherAssignmentsScreen;
