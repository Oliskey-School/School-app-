
import React, { useState, useEffect, useMemo } from 'react';
import {
    ChevronLeft,
    Sparkles,
    BookOpen,
    ClipboardList,
    FileText,
    CreditCard,
    Edit,
    Trash2,
    CheckCircle2
} from 'lucide-react';
import { Student } from '../../types';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { getAIClient, AI_MODEL_NAME } from '../../lib/ai';
import ConfirmationModal from '../ui/ConfirmationModal';
import DonutChart from '../ui/DonutChart';
import ReactMarkdown from 'react-markdown';

interface StudentProfileDashboardProps {
    student: Student;
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
}

const StudentProfileDashboard: React.FC<StudentProfileDashboardProps> = ({
    student,
    navigateTo,
    forceUpdate,
    handleBack
}) => {
    if (!student) {
        return <div className="p-6 text-center text-sm text-gray-500">No student selected.</div>;
    }
    
    const [summary, setSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState({
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
    });

    const [performance, setPerformance] = useState<any[]>([]);
    const [subjectList, setSubjectList] = useState<string[]>([]);
    const [behaviorNotes, setBehaviorNotes] = useState<any[]>([]);
    const [freshStudent, setFreshStudent] = useState<any>(null);
    const s: any = { ...(student || {}), ...(freshStudent || {}) };

    // One card row per subject the student actually TAKES (the admin's
    // per-student selection, else the class's subjects). Raw performance rows
    // are one-per-term, so the same subject used to repeat 2-3 times; here we
    // average a subject's rows into one figure. Subjects the admin removed
    // disappear; newly added ones show with no score yet.
    const subjectRows = useMemo(() => {
        const scoresBySubject = new Map<string, number[]>();
        (performance || []).forEach((p: any) => {
            if (!p?.subject) return;
            const key = String(p.subject).toLowerCase();
            if (!scoresBySubject.has(key)) scoresBySubject.set(key, []);
            scoresBySubject.get(key)!.push(Number(p.score) || 0);
        });

        const names = subjectList.length
            ? subjectList
            : Array.from(new Set((performance || []).map((p: any) => p?.subject).filter(Boolean)));

        return names.map((name: string) => {
            const scores = scoresBySubject.get(String(name).toLowerCase()) || [];
            return {
                subject: name,
                score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
            };
        });
    }, [performance, subjectList]);

    const scoredRows = subjectRows.filter(r => r.score !== null);
    const averageScore = scoredRows.length > 0
        ? Math.round(scoredRows.reduce((sum, r) => sum + (r.score || 0), 0) / scoredRows.length)
        : 0;

    const loadFullData = async () => {
        if (!student?.id) return;
        setLoading(true);
        try {
            // Fetch latest student record from DB so edits are reflected immediately
            try {
                const fresh = await api.getStudentById(student.id);
                if (fresh) setFreshStudent(fresh);
            } catch (e) {
                console.warn('Could not refresh student record', e);
            }

            // Fetch attendance via backend API
            const attendanceRecords: any[] = await api.getStudentAttendance(student.id).catch(() => []);
            if (attendanceRecords && attendanceRecords.length > 0) {
                const counts = { present: 0, absent: 0, late: 0, leave: 0 };
                attendanceRecords.forEach((record: any) => {
                    const status = (record?.status || '').toLowerCase();
                    if (status === 'present') counts.present++;
                    else if (status === 'absent') counts.absent++;
                    else if (status === 'late') counts.late++;
                    else if (status === 'leave' || status === 'on leave') counts.leave++;
                });
                setAttendanceData(counts);
            }

            // Fetch Performance & Notes + the student's authoritative subject
            // list (admin's per-student selection → class subjects → fallback)
            const { fetchAcademicPerformance, fetchBehaviorNotes } = await import('../../lib/database');
            const [perf, notes, subs] = await Promise.all([
                fetchAcademicPerformance(student.id),
                (fetchBehaviorNotes as any)(student.id),
                api.getStudentSubjects(student.id).catch(() => [])
            ]);
            setPerformance(perf || []);
            setBehaviorNotes(notes || []);
            setSubjectList(
                (Array.isArray(subs) ? subs : [])
                    .map((sub: any) => (typeof sub === 'string' ? sub : sub?.name))
                    .filter(Boolean)
            );

        } catch (err) {
            console.error('Error fetching student details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!student?.id) return;
        loadFullData();
    }, [student?.id]);

    useAutoSync(['students', 'attendance', 'report_cards', 'behavior_notes'], () => {
        console.log('🔄 [StudentProfileDashboard] Real-time auto-sync triggered');
        loadFullData();
    });

    const handleGenerateSummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const academicStr = subjectRows
                .map(p => `${p.subject}: ${p.score !== null ? `${p.score}%` : 'no result yet'}`)
                .join(', ') || 'No data';
            const behaviorStr = behaviorNotes?.map(n => n.note).join('; ') || 'No notes';

            const prompt = `Analyze this student's data and provide a concise summary for school administrators:
            Name: ${student.name}
            Academic: ${academicStr}
            Attendance: ${attendanceData.present} present, ${attendanceData.absent} absent
            Behavior: ${behaviorStr}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt
            });

            setSummary(response.text);
        } catch (error) {
            console.error("AI Error:", error);
            setSummary("Unable to generate summary at this time.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.deleteStudent(student.id);
            toast.success('Student deleted successfully');
            forceUpdate();
            handleBack();
        } catch (error: any) {
            toast.error('Failed to delete: ' + error.message);
        }
    };

    const totalAttendance = attendanceData.present + attendanceData.absent + attendanceData.late + attendanceData.leave;
    const attendancePercentage = totalAttendance > 0
        ? Math.round(((attendanceData.present + attendanceData.late) / totalAttendance) * 100)
        : 0;

    if (!student) {
        return <div className="p-6 text-center text-sm text-gray-500">No student selected. Open this view from a student row in the Student List.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-[#FAFAFE]">
            {/* Top Purple Header */}
            <header className="bg-[#5D5CDE] text-white px-6 py-4 flex items-center gap-4 rounded-b-[2.5rem]">
                <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            </header>

            <main className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Profile Card Overlay */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6 -mt-12 mx-2">
                    <img
                        src={s.avatarUrl || s.avatar_url || student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                        alt={student.name}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                        <p className="text-[#5D5CDE] font-medium">Primary {student.grade}{student.section}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Academic Performance (Left - 2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen className="w-5 h-5 text-[#5D5CDE]" />
                                <h3 className="font-bold text-gray-800">Academic Performance</h3>
                            </div>

                            <div className="bg-[#F8F9FF] rounded-xl p-6 flex justify-between items-center">
                                <span className="font-semibold text-gray-700">Overall Average</span>
                                <span className="text-3xl font-bold text-[#5D5CDE]">{averageScore}%</span>
                            </div>

                            {/* Detailed Subject Breakdown — one row per subject the
                                student takes; '—' until a result is recorded */}
                            <div className="mt-8 space-y-4">
                                {subjectRows.length > 0 ? (
                                    subjectRows.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-24 text-sm font-bold text-gray-500 truncate">{p.subject}</div>
                                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#5D5CDE] rounded-full transition-all duration-1000"
                                                    style={{ width: `${p.score ?? 0}%` }}
                                                ></div>
                                            </div>
                                            <div className="w-10 text-sm font-bold text-[#5D5CDE] text-right">{p.score !== null ? `${p.score}%` : '—'}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-10 text-center text-gray-400 font-medium italic">
                                        No subject records found.
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Right Column (1/3) */}
                    <div className="space-y-6">
                        {/* AI Summary Card */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-[#5956E9]" />
                                <h3 className="font-bold text-gray-800">AI-Generated Summary</h3>
                            </div>

                            {summary ? (
                                <div className="text-sm text-gray-700 leading-relaxed bg-[#F8F9FF] p-4 rounded-xl">
                                    <ReactMarkdown>{summary}</ReactMarkdown>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateSummary}
                                    disabled={isGeneratingSummary}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-[#EEF2FF] text-[#5D5CDE] font-bold rounded-xl hover:bg-[#E0E7FF] transition-all disabled:opacity-50"
                                >
                                    {isGeneratingSummary ? (
                                        <div className="w-5 h-5 border-2 border-[#5D5CDE] border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            <span>Generate Summary</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </section>

                        {/* Personal Information Card */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Edit className="w-3 h-3 text-indigo-600" />
                                </div>
                                <h3 className="font-bold text-gray-800">Personal Profile</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Gender</span>
                                    <span className="text-sm font-bold text-gray-800">{s?.gender || s?.Gender || 'Not Specified'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Date of Birth</span>
                                    <span className="text-sm font-bold text-gray-800">
                                        {s?.dob || s?.birthday || s?.date_of_birth || s?.dateOfBirth
                                            ? new Date(s?.dob || s?.birthday || s?.date_of_birth || s?.dateOfBirth || '').toLocaleDateString()
                                            : 'Not Specified'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Admission #</span>
                                    <span className="text-sm font-bold text-gray-800">{s?.admission_number || s?.admissionNumber || s?.school_generated_id || 'N/A'}</span>
                                </div>
                                <div className="py-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Address</span>
                                    <p className="text-sm text-gray-700 leading-relaxed italic">
                                        {s?.address || s?.Address || s?.studentAddress || 'No address provided'}
                                    </p>
                                </div>
                                {student.parentName && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <span className="text-xs font-bold text-indigo-600 uppercase block mb-2">Guardian Contact</span>
                                        <p className="text-sm font-bold text-gray-800 mb-1">{student.parentName}</p>
                                        <p className="text-xs text-gray-500">{student.parentPhone || student.parentEmail || ''}</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Attendance Summary */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-6">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                <h3 className="font-bold text-gray-800">Attendance Summary</h3>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="relative">
                                    <DonutChart
                                        percentage={attendancePercentage}
                                        color="#5D5CDE"
                                        size={140}
                                        strokeWidth={12}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-bold text-gray-800">{attendancePercentage}%</span>
                                        <span className="text-xs text-gray-500 font-medium">Present</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-8 w-full border-t border-gray-50 pt-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#5D5CDE]"></div>
                                        <span className="text-xs font-semibold text-gray-500">Present</span>
                                        <span className="text-xs font-bold text-gray-800 ml-auto">{attendanceData.present}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <span className="text-xs font-semibold text-gray-500">Absent</span>
                                        <span className="text-xs font-bold text-gray-800 ml-auto">{attendanceData.absent}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                        <span className="text-xs font-semibold text-gray-500">Late</span>
                                        <span className="text-xs font-bold text-gray-800 ml-auto">{attendanceData.late}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#8E8DFF]"></div>
                                        <span className="text-xs font-semibold text-gray-500">On Leave</span>
                                        <span className="text-xs font-bold text-gray-800 ml-auto">{attendanceData.leave}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Behavioral Notes */}
                        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardList className="w-5 h-5 text-purple-500" />
                                <h3 className="font-bold text-gray-800">Behavioral Notes</h3>
                            </div>

                            <div className="space-y-4">
                                {behaviorNotes && behaviorNotes.length > 0 ? (
                                    behaviorNotes.map((note, idx) => (
                                        <div key={idx} className="bg-[#F8F9FF] p-4 rounded-xl border border-[#FAFAFF]">
                                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{note.note}</p>
                                            {(note.by || note.date) && (
                                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    <span>{note.by || 'Staff'}</span>
                                                    <span>{note.date ? new Date(note.date).toLocaleDateString() : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 text-center py-6 font-medium">No behavioral notes recorded.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Admin Action Bar (Docked Bottom) */}
            <div className="bg-white/80 backdrop-blur-md border-t border-gray-100 p-4 sticky bottom-0 z-10">
                <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-widest mb-3">Admin Actions</p>
                <div className="grid grid-cols-4 gap-3">
                    <button
                        onClick={() => navigateTo('addStudent', `Edit ${student.name}`, { studentToEdit: student })}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 bg-[#EEF2FF] text-[#5D5CDE] rounded-2xl hover:bg-[#E0E7FF] transition-all"
                    >
                        <Edit className="w-5 h-5" />
                        <span className="text-xs font-bold">Edit</span>
                    </button>
                    <button
                        onClick={() => navigateTo('adminSelectTermForReport', `Select Term`, { student })}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 bg-[#EEF2FF] text-[#5D5CDE] rounded-2xl hover:bg-[#E0E7FF] transition-all"
                    >
                        <FileText className="w-5 h-5" />
                        <span className="text-xs font-bold">Reports</span>
                    </button>
                    <button
                        onClick={() => navigateTo('idCardManagement', 'Student ID Card', { initialUser: student, initialView: 'students' })}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 bg-[#EEF2FF] text-[#5D5CDE] rounded-2xl hover:bg-[#E0E7FF] transition-all"
                    >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-xs font-bold">ID Card</span>
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex flex-col items-center justify-center gap-1.5 py-4 bg-[#FFE5E5] text-red-600 rounded-2xl hover:bg-[#FFD9D9] transition-all"
                    >
                        <Trash2 className="w-5 h-5" />
                        <span className="text-xs font-bold">Delete</span>
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Student"
                message={`Are you sure you want to delete ${student.name}? This cannot be undone.`}
                confirmText="Yes, Delete"
                isDanger
            />
        </div>
    );
};

export default StudentProfileDashboard;

