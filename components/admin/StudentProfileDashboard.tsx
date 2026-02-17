
import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../lib/supabase';
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
    const [behaviorNotes, setBehaviorNotes] = useState<any[]>([]);

    const averageScore = performance && performance.length > 0
        ? Math.round(performance.reduce((sum, record) => sum + record.score, 0) / performance.length)
        : 0;

    useEffect(() => {
        const loadFullData = async () => {
            setLoading(true);
            try {
                const { data: attendanceRecords, error: attError } = await supabase
                    .from('student_attendance')
                    .select('status')
                    .eq('student_id', student.id);

                if (attError) throw attError;

                if (attendanceRecords) {
                    const counts = { present: 0, absent: 0, late: 0, leave: 0 };
                    attendanceRecords.forEach((record: any) => {
                        const status = record.status.toLowerCase();
                        if (status === 'present') counts.present++;
                        else if (status === 'absent') counts.absent++;
                        else if (status === 'late') counts.late++;
                        else if (status === 'leave' || status === 'on leave') counts.leave++;
                    });
                    setAttendanceData(counts);
                }

                // Fetch Performance & Notes
                const { fetchAcademicPerformance, fetchBehaviorNotes } = await import('../../lib/database');
                const [perf, notes] = await Promise.all([
                    fetchAcademicPerformance(student.id),
                    fetchBehaviorNotes(student.id)
                ]);
                setPerformance(perf);
                setBehaviorNotes(notes);

            } catch (err) {
                console.error('Error fetching student details:', err);
            } finally {
                setLoading(false);
            }
        };

        loadFullData();
    }, [student.id]);

    const handleGenerateSummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const academicStr = performance?.map(p => `${p.subject}: ${p.score}%`).join(', ') || 'No data';
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
            const { error } = await supabase.from('students').delete().eq('id', student.id);
            if (error) throw error;
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
                        src={student.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
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

                            {/* Detailed Subject Breakdown */}
                            <div className="mt-8 space-y-4">
                                {performance && performance.length > 0 ? (
                                    performance.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-24 text-sm font-bold text-gray-500 truncate">{p.subject}</div>
                                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#5D5CDE] rounded-full transition-all duration-1000"
                                                    style={{ width: `${p.score}%` }}
                                                ></div>
                                            </div>
                                            <div className="w-10 text-sm font-bold text-[#5D5CDE] text-right">{p.score}%</div>
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
                                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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
                <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest mb-3">Admin Actions</p>
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
