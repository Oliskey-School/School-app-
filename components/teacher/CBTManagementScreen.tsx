import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import readXlsxFile from 'read-excel-file';
import { supabase } from '../../lib/supabase';
import { CloudUploadIcon, EyeIcon, ExamIcon, TrashIcon, XCircleIcon, WifiIcon, getFormattedClassName } from '../../constants';
import { CBTExam, Subject } from '../../types';
import ConfirmationModal from '../ui/ConfirmationModal';
import { fetchSubjects, fetchCBTExams, deleteCBTExam } from '../../lib/database';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { useProfile } from '../../context/ProfileContext';

interface CBTManagementScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: string | null;
}

const CBTManagementScreen: React.FC<CBTManagementScreenProps> = ({ navigateTo, teacherId }) => {
    const [exams, setExams] = useState<CBTExam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const { profile } = useProfile();

    // Use the comprehensive hook for classes
    const { classes: teacherClasses, loading: loadingClasses } = useTeacherClasses(teacherId);

    // Configuration State
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [duration, setDuration] = useState(60);
    const [totalMarks, setTotalMarks] = useState(60);
    const [uploadType, setUploadType] = useState<'Test' | 'Exam'>('Test');

    const [isUploading, setIsUploading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadInitialData();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Subjects and Exams
            const [fetchedSubjects, backendExams] = await Promise.all([
                fetchSubjects(),
                fetchCBTExams(teacherId || undefined)
            ]);

            setSubjects(fetchedSubjects);
            setExams(backendExams);

        } catch (err: any) {
            console.error("Error loading data:", err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!selectedClassId || !selectedSubjectId) {
            toast.error("Please select a valid Class and Subject first.");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setErrorMsg(null);

        try {
            const rows = await readXlsxFile(file);

            // Debug log
            console.log("Uploaded rows raw:", rows);

            // Filter out completely empty rows or rows where the Question (index 1) is empty
            const validRows = rows.filter((row, index) => {
                // Keep header (index 0) if it looks like a header, but primarily filter data
                if (index === 0) return true; // Skip header validation for now
                const questionText = row[1];
                return questionText && questionText.toString().trim().length > 0;
            });

            if (validRows.length <= 1) {
                // Only header remains or empty
                throw new Error("The Excel file appears to contain no valid questions. Please ensure Column B has question text.");
            }

            // Slice(1) to skip header
            const dataRows = validRows.slice(1);

            const questionCount = dataRows.length;
            const markPerQuestion = totalMarks > 0 ? (totalMarks / questionCount) : 1;

            const parsedQuestions = dataRows.map((row) => ({
                question_text: row[1]?.toString().trim() || 'Question',
                option_a: row[2]?.toString().trim() || 'Option A',
                option_b: row[3]?.toString().trim() || 'Option B',
                option_c: row[4]?.toString().trim() || 'Option C',
                option_d: row[5]?.toString().trim() || 'Option D',
                correct_option: (row[6]?.toString().trim() || 'A').charAt(0).toUpperCase(),
                marks: parseFloat(markPerQuestion.toFixed(2))
            }));

            console.log("Parsed questions:", parsedQuestions);

            // 1. Create Quiz Record (quizzes table)
            // Ensure teacherId and other IDs are strings if needed, or rely on Postgres implicit cast from JS strings
            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .insert([{
                    title: file.name.replace('.xlsx', '').replace('.xls', ''),
                    description: uploadType, // Mapping 'type' to description or status if needed
                    status: 'Draft', // Default status
                    class_id: selectedClassId, // UUID string
                    subject_id: selectedSubjectId, // UUID string
                    duration_minutes: duration,
                    total_marks: totalMarks,
                    teacher_id: teacherId,
                    school_id: profile.schoolId,
                    is_published: false
                }])
                .select()
                .single();

            if (quizError) throw quizError;

            // 2. Insert Questions (quiz_questions table)
            const questionsPayload = parsedQuestions.map((q, index) => ({
                quiz_id: quizData.id,
                question_text: q.question_text,
                question_type: 'multiple_choice', // improved
                options: [q.option_a, q.option_b, q.option_c, q.option_d], // Store as array
                correct_option: q.correct_option,
                points: q.marks,
                order_index: index + 1
            }));

            const { error: qError } = await supabase
                .from('quiz_questions')
                .insert(questionsPayload);

            if (qError) throw qError;

            toast.success("Quiz uploaded successfully!");
            loadInitialData();

        } catch (err: any) {
            console.error("Upload error:", err);
            setErrorMsg(err.message || "Failed to process upload.");
            toast.error(err.message || "Upload failed.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const togglePublish = async (exam: CBTExam) => {
        const newStatus = !exam.isPublished;
        // Optimistic update
        setExams(prev => prev.map(e => e.id === exam.id ? { ...e, isPublished: newStatus } : e));

        const { error } = await supabase
            .from('quizzes')
            .update({ is_published: newStatus })
            .eq('id', exam.id);

        if (error) {
            toast.error("Failed to update status.");
            loadInitialData(); // Revert
        }
    };

    const handleDelete = async (id: string) => {
        const success = await deleteCBTExam(id);
        if (success) {
            toast.success("Exam deleted successfully");
            setExams(prev => prev.filter(e => e.id !== id));
        } else {
            toast.error("Failed to delete exam");
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <main className="flex-grow p-4 md:p-6 space-y-6 overflow-y-auto w-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">CBT & Examinations</h1>
                        <p className="text-slate-500 mt-1 text-sm">Create assessments from Excel ("Question Bank")</p>
                    </div>
                    {!isOnline && (
                        <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-bold mt-2 md:mt-0 self-start md:self-auto">
                            <WifiIcon className="w-4 h-4 mr-1" />
                            Offline Mode
                        </div>
                    )}
                </div>

                {/* Configuration Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center">
                            <ExamIcon className="w-5 h-5 mr-2 text-indigo-600" />
                            Upload Question Bank
                        </h3>
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                            <button onClick={() => setUploadType('Test')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${uploadType === 'Test' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Test</button>
                            <button onClick={() => setUploadType('Exam')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${uploadType === 'Exam' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Exam</button>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">


                        {/* Configuration Inputs */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Class</label>
                                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full rounded-lg border-slate-300 py-2 text-sm">
                                        <option value="">Select Class</option>
                                        {teacherClasses.map(c => {
                                            const name = getFormattedClassName ? getFormattedClassName(c.grade, c.section) : `Grade ${c.grade}${c.section}`;
                                            return <option key={c.id} value={c.id}>{name}</option>
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Subject</label>
                                    <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)} className="w-full rounded-lg border-slate-300 py-2 text-sm">
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code || s.category})</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Duration (Mins)</label>
                                    <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full rounded-lg border-slate-300 py-2 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Total Marks</label>
                                    <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value))} className="w-full rounded-lg border-slate-300 py-2 text-sm" />
                                </div>
                            </div>
                        </div>

                        {/* Upload Area */}
                        <div className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col justify-center items-center p-6 cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all group" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            {isUploading ? (
                                <div className="text-center animate-pulse">
                                    <CloudUploadIcon className="h-10 w-10 text-indigo-500 mx-auto mb-2" />
                                    <p className="text-indigo-600 font-medium text-sm">Processing...</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="bg-indigo-50 p-3 rounded-full inline-block mb-3 group-hover:bg-indigo-100 transition-colors">
                                        <CloudUploadIcon className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <p className="font-semibold text-slate-700 text-sm">Upload Excel File</p>
                                    <p className="text-xs text-slate-400 mt-1">Columns: No, Question, A, B, C, D, Answer</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center border border-red-200">
                        <XCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span className="text-sm">{errorMsg}</span>
                    </div>
                )}

                {/* List of Exams */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Managed Exams</h2>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                            <p className="text-slate-500 text-sm">Loading data...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {exams.map(exam => (
                                <div key={exam.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col mb-2">
                                        <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                                            {exam.className && <span className="bg-slate-100 px-2 py-0.5 rounded">{exam.className}</span>}
                                            {exam.subjectName && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{exam.subjectName}</span>}
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-lg">{exam.title}</h4>
                                        <p className="text-sm text-slate-600 mt-1">
                                            {exam.description || 'Test'} • {exam.durationMinutes} mins • {exam.totalMarks || exam.totalQuestions} Marks • {exam.totalQuestions} Questions
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${exam.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {exam.isPublished ? 'Live' : 'Draft'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => togglePublish(exam)}
                                                className="text-sm text-indigo-600 font-semibold hover:underline"
                                            >
                                                {exam.isPublished ? 'Unpublish' : 'Publish'}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteId(exam.id);
                                                }}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                title="Delete Exam"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {exams.length === 0 && (
                                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg">No exams found. Upload one to start.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Confirmation Modal for Deletion */}
                <ConfirmationModal
                    isOpen={!!deleteId}
                    title="Delete Exam"
                    message="Are you sure you want to delete this exam? This action cannot be undone."
                    onConfirm={async () => {
                        if (deleteId) {
                            await handleDelete(deleteId);
                            setDeleteId(null);
                        }
                    }}
                    onClose={() => setDeleteId(null)}
                />
            </main>
        </div>
    );
};

export default CBTManagementScreen;
