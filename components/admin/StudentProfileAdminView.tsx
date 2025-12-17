
import React, { useState } from 'react';
import { Student } from '../../types';
import { DocumentTextIcon, BookOpenIcon, ClipboardListIcon, CheckCircleIcon, SUBJECT_COLORS, EditIcon, getFormattedClassName, CakeIcon, TrashIcon, SparklesIcon, AIIcon } from '../../constants';
import DonutChart from '../ui/DonutChart';
import { mockStudents } from '../../data';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import ConfirmationModal from '../ui/ConfirmationModal';
import { supabase } from '../../lib/supabase';

interface StudentProfileAdminViewProps {
    student: Student;
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
}

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

const StudentProfileAdminView: React.FC<StudentProfileAdminViewProps> = ({ student, navigateTo, forceUpdate, handleBack }) => {
    const [summary, setSummary] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [attendanceData, setAttendanceData] = useState({
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
    });
    const [loading, setLoading] = useState(true);

    const academicPerformance = student.academicPerformance || [];
    const averageScore = academicPerformance.length > 0
        ? Math.round(academicPerformance.reduce((sum, record) => sum + record.score, 0) / academicPerformance.length)
        : 0;

    const formattedClassName = getFormattedClassName(student.grade, student.section);

    // Fetch attendance data from database
    React.useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const { data: attendanceRecords, error } = await supabase
                    .from('student_attendance')
                    .select('status')
                    .eq('student_id', student.id);

                if (error) {
                    console.error('Error fetching attendance:', error);
                    setLoading(false);
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
                console.error('Error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [student.id]);

    const handleDelete = async () => {
        try {
            // 1. Fetch user email (needed for Auth deletion)
            let userEmail = '';
            if (student.user_id) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('email')
                    .eq('id', student.user_id)
                    .single();
                if (userData) userEmail = userData.email;
            }

            // 2. Delete from database first (Students)
            const { error: deleteStudentError } = await supabase
                .from('students')
                .delete()
                .eq('id', student.id);

            if (deleteStudentError) throw deleteStudentError;

            // 3. Delete associated user account if exists
            if (student.user_id) {
                const { error: deleteUserError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', student.user_id);

                if (deleteUserError) console.warn('Warning: Could not delete user account:', deleteUserError);
            }

            // 4. Delete login credentials (local table)
            const { error: deleteAuthError } = await supabase
                .from('auth_accounts')
                .delete()
                .eq('user_id', student.user_id);

            if (deleteAuthError) console.warn('Warning: Could not delete auth account:', deleteAuthError);

            // 5. Delete from Supabase Auth (RPC) - requires 'delete_auth_user_by_email' function
            if (userEmail) {
                const { error: rpcError } = await supabase.rpc('delete_auth_user_by_email', { email_input: userEmail });
                if (rpcError) {
                    // Don't throw here, as it might just be that the function isn't set up yet
                    console.warn('Note: Could not delete from Supabase Auth (likely missing RPC function):', rpcError.message);
                }
            }

            // Also update mock data for consistency
            const index = mockStudents.findIndex(s => s.id === student.id);
            if (index > -1) {
                mockStudents.splice(index, 1);
            }

            alert(`${student.name} has been successfully deleted from the database.`);
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error deleting student:', error);
            alert('Failed to delete student: ' + (error.message || 'Unknown error'));
        }
    };

    const generateSummary = async () => {
        setIsGeneratingSummary(true);
        setSummary(''); // Clear previous summary
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const academicSummary = student.academicPerformance?.map(p => `${p.subject}: ${p.score}%`).join(', ') || 'N/A';
            const behaviorSummary = student.behaviorNotes?.map(n => `${n.type} - ${n.title}: ${n.note}`).join('; ') || 'No notes';

            const prompt = `Generate a concise, professional summary for a school administrator about the student ${student.name}. Highlight key academic strengths, areas needing attention, and any notable behavioral patterns. Keep it to 2-3 short paragraphs. Base this summary on the following data:\n- Academic Performance: ${academicSummary}\n- Behavioral Notes: ${behaviorSummary}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
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
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Student Header */}
                    <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <img src={student.avatarUrl} alt={student.name} className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100" />
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">{student.name}</h3>
                                <p className="text-gray-500 font-medium">{formattedClassName}{student.department && `, ${student.department}`}</p>
                                {student.birthday && (
                                    <div className="flex items-center space-x-2 mt-1 text-sm text-gray-500">
                                        <CakeIcon className="w-4 h-4" />
                                        <span>{new Date(student.birthday.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Academic Performance */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center space-x-2 mb-2">
                            <BookOpenIcon className="h-5 w-5 text-indigo-600" />
                            <h4 className="font-bold text-gray-800">Academic Performance</h4>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                            <span className="font-semibold text-indigo-800">Overall Average</span>
                            <span className="text-2xl font-bold text-indigo-800">{averageScore}%</span>
                        </div>
                        <SimpleBarChart data={academicPerformance} />
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* AI Summary */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <SparklesIcon className="h-5 w-5 text-indigo-600" />
                                <h4 className="font-bold text-gray-800">AI-Generated Summary</h4>
                            </div>
                            {summary && !isGeneratingSummary ? (
                                <div className="prose prose-sm max-w-none text-gray-700">
                                    <ReactMarkdown>{summary}</ReactMarkdown>
                                </div>
                            ) : (
                                <button onClick={generateSummary} disabled={isGeneratingSummary} className="w-full flex items-center justify-center space-x-2 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 disabled:opacity-70">
                                    {isGeneratingSummary ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <AIIcon className="w-4 h-4" />
                                            <span>Generate Summary</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Attendance Summary */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                    <h4 className="font-bold text-gray-800">Attendance Summary</h4>
                                </div>
                            </div>
                            {loading ? (
                                <div className="flex justify-center py-4">
                                    <div className="w-6 h-6 border-3 border-gray-300 border-t-green-600 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between px-2">
                                    <div className="relative">
                                        <DonutChart
                                            percentage={Object.values(attendanceData).reduce((a, b) => a + b, 0) > 0 ? Math.round(((attendanceData.present + attendanceData.late) / Object.values(attendanceData).reduce((a, b) => a + b, 0)) * 100) : 0}
                                            color="#16a34a"
                                            size={100}
                                            strokeWidth={10}
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-bold text-gray-800">{Object.values(attendanceData).reduce((a, b) => a + b, 0) > 0 ? Math.round(((attendanceData.present + attendanceData.late) / Object.values(attendanceData).reduce((a, b) => a + b, 0)) * 100) : 0}%</span>
                                            <span className="text-xs text-gray-500">Present</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm font-medium border-l pl-6 border-gray-100 min-w-[140px]">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Present</span>
                                            <span className="font-bold text-green-600">{attendanceData.present}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Absent</span>
                                            <span className="font-bold text-red-600">{attendanceData.absent}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Late</span>
                                            <span className="font-bold text-blue-600">{attendanceData.late}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">On Leave</span>
                                            <span className="font-bold text-amber-600">{attendanceData.leave}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Behavioral Notes */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <ClipboardListIcon className="h-5 w-5 text-purple-600" />
                                <h4 className="font-bold text-gray-800">Behavioral Notes</h4>
                            </div>
                            <div className="space-y-3">
                                {(student.behaviorNotes && student.behaviorNotes.length > 0) ? student.behaviorNotes.map(note => (
                                    <div key={note.id} className="bg-purple-50 p-3 rounded-lg">
                                        <p className="text-sm text-gray-700">{note.note}</p>
                                        <p className="text-xs text-gray-500 text-right mt-1">- {note.by} on {new Date(note.date).toLocaleDateString()}</p>
                                    </div>
                                )) : <p className="text-sm text-gray-400 text-center py-4">No behavioral notes recorded.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <div className="p-4 mt-auto bg-white border-t space-y-2 print:hidden">
                <h3 className="text-sm font-bold text-gray-500 text-center uppercase tracking-wider">Admin Actions</h3>
                <div className="grid grid-cols-4 gap-4">
                    <button onClick={() => navigateTo('addStudent', `Edit ${student.name}`, { studentToEdit: student })} className="flex flex-col items-center justify-center space-y-1 py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-200"><EditIcon className="w-5 h-5" /><span>Edit</span></button>
                    <button onClick={() => navigateTo('adminSelectTermForReport', `Select Term for ${student.name}`, { student })} className="flex flex-col items-center justify-center space-y-1 py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-200"><DocumentTextIcon className="w-5 h-5" /><span>Reports</span></button>
                    <button onClick={() => alert('ID Card Generation module would open.')} className="flex flex-col items-center justify-center space-y-1 py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-200"><DocumentTextIcon className="w-5 h-5" /><span>ID Card</span></button>
                    <button onClick={() => setShowDeleteModal(true)} className="flex flex-col items-center justify-center space-y-1 py-3 bg-red-100 text-red-700 font-semibold rounded-xl hover:bg-red-200"><TrashIcon className="w-5 h-5" /><span>Delete</span></button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Student Account"
                message={`Are you sure you want to delete ${student.name}? This action cannot be undone.`}
                confirmText="Delete"
                isDanger
            />
        </div>
    );
};

export default StudentProfileAdminView;
