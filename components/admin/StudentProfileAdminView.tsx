import React, { useState, useEffect } from 'react';
import { Student, ClassInfo } from '../../types';
import { toast } from 'react-hot-toast';
import {
    DocumentTextIcon,
    BookOpenIcon,
    ClipboardListIcon,
    CheckCircleIcon,
    SUBJECT_COLORS,
    EditIcon,
    getFormattedClassName,
    CakeIcon,
    TrashIcon,
    SparklesIcon,
    AIIcon,
    XIcon,
    PlusIcon
} from '../../constants';
import DonutChart from '../ui/DonutChart';
import { getAIClient, AI_MODEL_NAME } from '../../lib/ai';
import ReactMarkdown from 'react-markdown';
import ConfirmationModal from '../ui/ConfirmationModal';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';

interface StudentProfileAdminViewProps {
    student: Student;
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
}

const ClassSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (classId: string) => void;
    schoolId: string;
    currentBranchId?: string | null;
}> = ({ isOpen, onClose, onSelect, schoolId, currentBranchId }) => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const loadClasses = async () => {
                try {
                    const data = await api.getClasses(schoolId, currentBranchId || undefined);
                    setClasses(data);
                } catch (err) {
                    toast.error('Failed to load classes');
                } finally {
                    setLoading(false);
                }
            };
            loadClasses();
        }
    }, [isOpen, schoolId, currentBranchId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
                    <h3 className="text-xl font-bold text-gray-800">Select New Class</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        classes.map((cls) => (
                            <button
                                key={cls.id}
                                onClick={() => onSelect(cls.id)}
                                className="w-full text-left p-4 rounded-2xl hover:bg-indigo-50 border border-gray-100 transition-all flex justify-between items-center group"
                            >
                                <div>
                                    <p className="font-bold text-gray-800 group-hover:text-indigo-700">{cls.name}</p>
                                    <p className="text-xs text-gray-500">{cls.level || 'General'}</p>
                                </div>
                                <PlusIcon className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" />
                            </button>
                        ))
                    )}
                </div>
                <div className="p-6 bg-gray-50 border-t mt-auto">
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const SimpleBarChart = ({ data }: { data: { subject: string, score: number }[] }) => {
    const maxValue = 100;
    return (
        <div className="space-y-3 pt-2">
            {data.map(item => {
                const colorClass = SUBJECT_COLORS[item.subject] || 'bg-gray-200 text-gray-800';
                return (
                    <div key={item.subject} className="flex items-center space-x-2">
                        <span className="w-28 text-sm font-medium text-gray-600 truncate">{item.subject}</span>
                        <div className="flex-grow bg-gray-200 rounded-full h-5">
                            <div className={`${colorClass} h-5 rounded-full flex items-center justify-end pr-2 text-xs font-bold`} style={{ width: `${item.score}%` }}>
                                {item.score}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const StudentProfileAdminView: React.FC<StudentProfileAdminViewProps> = ({ student: initialStudent, navigateTo, forceUpdate, handleBack }) => {
    const [student, setStudent] = useState(initialStudent);
    const [summary, setSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showClassModal, setShowClassModal] = useState(false);
    const [attendanceData, setAttendanceData] = useState({
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
    });
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const academicPerformance = student.academicPerformance || [];
    const averageScore = academicPerformance.length > 0
        ? Math.round(academicPerformance.reduce((sum, record) => sum + record.score, 0) / academicPerformance.length)
        : 0;

    // Fetch enrollments and attendance
    useEffect(() => {
        loadProfileData();
    }, [student.id]);

    const loadProfileData = async () => {
        if (!student.schoolId) return;
        setLoading(true);
        try {
            // Fetch current student profile again to get latest data
            const profiles = await api.getStudents(student.schoolId, undefined, { classId: student.id });
            if (profiles && profiles.length > 0) {
                setStudent(profiles[0]);
            }

            // Fetch enrollments with strict tenant isolation
            const enrollmentResults = await supabase
                .from('student_enrollments')
                .select('classes(name, section)')
                .eq('student_id', student.id)
                .eq('school_id', student.schoolId);

            if (enrollmentResults.data) {
                setEnrollments(enrollmentResults.data.map((e: any) => `${e.classes.name}${e.classes.section ? ` (${e.classes.section})` : ''}`));
            }

            // Fetch attendance with strict tenant isolation
            const { data: attendanceRecords, error: attendanceError } = await supabase
                .from('student_attendance')
                .select('status')
                .eq('student_id', student.id)
                .eq('school_id', student.schoolId);

            if (attendanceError) {
                console.error('Error fetching attendance:', attendanceError);
                return;
            }

            if (attendanceRecords && attendanceRecords.length > 0) {
                const counts = {
                    present: 0,
                    absent: 0,
                    late: 0,
                    leave: 0,
                };

                attendanceRecords.forEach((record: any) => {
                    const status = record.status.toLowerCase();
                    if (status === 'present') counts.present++;
                    else if (status === 'absent') counts.absent++;
                    else if (status === 'late') counts.late++;
                    else if (status === 'leave' || status === 'on leave') counts.leave++;
                });

                setAttendanceData(counts);
            }
        } catch (err) {
            console.error('Error loading profile data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            // Use api.deleteStudent which should handle all related deletions and backend cleanup
            await api.deleteStudent(student.id);
            toast.success(`${student.name} has been successfully deleted.`);
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error deleting student:', error);
            toast.error('Failed to delete student: ' + (error.message || 'Unknown error'));
        }
    };

    const handleChangeClass = async (newClassId: string) => {
        try {
            // First remove student from current class if they have one
            if (student.classId) {
                await api.removeStudentFromClass(student.id, student.classId);
            }

            // Assign to new class
            await api.assignStudentToClass(student.id, newClassId);

            toast.success(`${student.name} has been assigned to the new class.`);
            setShowClassModal(false);
            loadProfileData(); // Reload to show updated class
            forceUpdate();
        } catch (err: any) {
            console.error('Error changing class:', err);
            toast.error('Failed to change class: ' + (err.message || 'Unknown error'));
        }
    };

    const generateSummary = async () => {
        setIsGeneratingSummary(true);
        setSummary(''); // Clear previous summary
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const academicSummary = student.academicPerformance?.map(p => `${p.subject}: ${p.score}% `).join(', ') || 'N/A';
            const behaviorSummary = student.behaviorNotes?.map(n => `${n.type} - ${n.title}: ${n.note} `).join('; ') || 'No notes';

            const prompt = `Generate a concise, professional summary for a school administrator about the student ${student.name}. Highlight key academic strengths, areas needing attention, and any notable behavioral patterns. Keep it to 2 - 3 short paragraphs. Base this summary on the following data: \n - Academic Performance: ${academicSummary} \n - Behavioral Notes: ${behaviorSummary} `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt
            });

            setSummary(response.text);

        } catch (error) {
            console.error("Error generating student summary:", error);
            setSummary("Could not generate summary at this time.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Student Header */}
                    <div className="lg:col-span-3 bg-white p-4 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center sm:justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
                            <img src={student.avatarUrl} alt={student.name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-8 border-indigo-50 shadow-inner" />
                            <div>
                                <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">{student.name}</h3>
                                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                                    <button
                                        onClick={() => setShowClassModal(true)}
                                        className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center space-x-1"
                                    >
                                        <span>{getFormattedClassName(student.grade, student.section)}</span>
                                        <EditIcon className="w-3 h-3 text-white/70" />
                                    </button>
                                    {student.department && (
                                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 uppercase">
                                            {student.department}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row items-center sm:space-x-4 mt-3 text-sm text-gray-500 font-medium">
                                    <p>{student.schoolGeneratedId}</p>
                                    {student.birthday && (
                                        <div className="flex items-center space-x-1.5 mt-1 sm:mt-0">
                                            <CakeIcon className="w-4 h-4 text-pink-400" />
                                            <span>{new Date(student.birthday.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => navigateTo('addStudent', `Edit ${student.name}`, { studentToEdit: student })}
                                className="flex-grow sm:w-full px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all text-sm"
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    {/* Academic Performance */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <BookOpenIcon className="h-6 w-6 text-indigo-600" />
                                </div>
                                <h4 className="font-bold text-gray-800 text-lg">Academic Performance</h4>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Average Score</p>
                                <p className="text-3xl font-black text-indigo-600">{averageScore}%</p>
                            </div>
                        </div>
                        <SimpleBarChart data={academicPerformance} />
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* AI Summary */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl shadow-lg relative overflow-hidden group">
                            <SparklesIcon className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
                            <div className="relative z-10">
                                <div className="flex items-center space-x-2 mb-4 text-white">
                                    <SparklesIcon className="h-5 w-5" />
                                    <h4 className="font-bold">AI Insight</h4>
                                </div>
                                {summary && !isGeneratingSummary ? (
                                    <div className="text-sm text-white/90 leading-relaxed font-medium bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                                        <ReactMarkdown>{summary}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <button
                                        onClick={generateSummary}
                                        disabled={isGeneratingSummary}
                                        className="w-full flex items-center justify-center space-x-2 py-4 bg-white text-indigo-700 font-bold rounded-2xl shadow-xl hover:bg-gray-50 transition-all disabled:opacity-70 group"
                                    >
                                        {isGeneratingSummary ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <span>Analyzing Data...</span>
                                            </>
                                        ) : (
                                            <>
                                                <AIIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                                <span>Generate Admin Summary</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Attendance Summary */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h4 className="font-bold text-gray-800">Attendance Status</h4>
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            </div>
                            {loading ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-8 h-8 border-4 border-gray-100 border-t-green-500 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-6">
                                        <DonutChart
                                            percentage={(Object.values(attendanceData) as number[]).reduce((a, b) => a + b, 0) > 0 ? Math.round(((attendanceData.present + attendanceData.late) / (Object.values(attendanceData) as number[]).reduce((a, b) => a + b, 0)) * 100) : 0}
                                            color="#10b981"
                                            size={120}
                                            strokeWidth={12}
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-3xl font-black text-gray-800">{(Object.values(attendanceData) as number[]).reduce((a, b) => a + b, 0) > 0 ? Math.round(((attendanceData.present + attendanceData.late) / (Object.values(attendanceData) as number[]).reduce((a, b) => a + b, 0)) * 100) : 0}%</span>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">Present</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                        {[
                                            { label: 'Present', val: attendanceData.present, color: 'text-green-600 bg-green-50' },
                                            { label: 'Absent', val: attendanceData.absent, color: 'text-red-600 bg-red-50' },
                                            { label: 'Late', val: attendanceData.late, color: 'text-blue-600 bg-blue-50' },
                                            { label: 'Leave', val: attendanceData.leave, color: 'text-amber-600 bg-amber-50' },
                                        ].map(item => (
                                            <div key={item.label} className={`${item.color} p-3 rounded-2xl text-center`}>
                                                <p className="text-lg font-black">{item.val}</p>
                                                <p className="text-[10px] uppercase font-bold opacity-70">{item.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Behavioral Notes */}
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-gray-800">Behavioral Insights</h4>
                                <div className="p-1.5 bg-purple-50 rounded-lg">
                                    <ClipboardListIcon className="h-4 h-4 text-purple-600" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                {(student.behaviorNotes && student.behaviorNotes.length > 0) ? student.behaviorNotes.map(note => (
                                    <div key={note.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-sm text-gray-700 font-medium italic">"{note.note}"</p>
                                        <div className="flex items-center justify-between mt-3">
                                            <span className="text-[10px] font-black text-purple-600 uppercase bg-purple-100 px-2 py-0.5 rounded-full">{note.type}</span>
                                            <p className="text-[10px] text-gray-400 font-bold">{new Date(note.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-sm text-gray-400 text-center py-6 font-medium italic">Perfect conduct record.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-4 sm:px-6 bg-white/80 backdrop-blur-lg border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 z-40 lg:relative lg:bg-transparent lg:border-none lg:p-4 lg:grid-cols-4">
                <button
                    onClick={() => setShowClassModal(true)}
                    className="flex flex-col items-center justify-center space-y-1 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100 active:scale-95 shadow-sm"
                >
                    <UserGroupIcon className="w-5 h-5" />
                    <span className="text-[10px] uppercase">Assign Class</span>
                </button>
                <button
                    onClick={() => navigateTo('adminSelectTermForReport', `Select Term for ${student.name}`, { student })}
                    className="flex flex-col items-center justify-center space-y-1 py-3 bg-white text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all border border-gray-100 active:scale-95 shadow-sm"
                >
                    <DocumentTextIcon className="w-5 h-5" />
                    <span className="text-[10px] uppercase">Reports</span>
                </button>
                <button
                    onClick={() => toast('ID Card module coming soon!', { icon: '🆔' })}
                    className="flex flex-col items-center justify-center space-y-1 py-3 bg-white text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all border border-gray-100 active:scale-95 shadow-sm"
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="text-[10px] uppercase">ID Card</span>
                </button>
                <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex flex-col items-center justify-center space-y-1 py-3 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all border border-red-100 active:scale-95 shadow-sm"
                >
                    <TrashIcon className="w-5 h-5" />
                    <span className="text-[10px] uppercase text-red-500">Delete</span>
                </button>
            </div>

            <ClassSelectionModal
                isOpen={showClassModal}
                onClose={() => setShowClassModal(false)}
                onSelect={handleChangeClass}
                schoolId={student.schoolId}
                currentBranchId={student.branchId}
            />

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Student"
                message={"Permanently remove " + student.name + " from all records? This cannot be undone."}
                confirmText="Delete Permanently"
                isDanger
            />
        </div>
    );
};

// Internal icon for class selection modal
const UserGroupIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);


export default StudentProfileAdminView;
