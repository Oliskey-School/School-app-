import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CloudUploadIcon, EyeIcon, ExamIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '../../constants';
import { CBTTest } from '../../types';
import ConfirmationModal from '../ui/ConfirmationModal';

interface CBTManagementScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const SUBJECTS = [
    'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
    'Agricultural Science', 'Economics', 'Government', 'Literature',
    'Geography', 'Civic Education', 'Computer Studies', 'General'
];

const CBTManagementScreen: React.FC<CBTManagementScreenProps> = ({ navigateTo }) => {
    const [tests, setTests] = useState<CBTTest[]>([]);

    // Configuration State
    const [classes, setClasses] = useState<{ id: number, content: string }[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [duration, setDuration] = useState(60);
    const [attempts, setAttempts] = useState(1);
    const [totalMarks, setTotalMarks] = useState(60);
    const [uploadType, setUploadType] = useState<'Test' | 'Exam'>('Test');

    const [isUploading, setIsUploading] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Classes and Tests
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setErrorMsg(null);

            // 1. Fetch Classes (Using 'classes' table or fallback)
            const { data: classData } = await supabase
                .from('classes')
                .select('id, content')
                .order('content', { ascending: true });

            if (classData && classData.length > 0) {
                const mappedClasses = classData.map((c: any) => ({
                    id: c.id,
                    content: c.content || c.className || 'Class ' + c.id
                }));
                setClasses(mappedClasses);
                setSelectedClass(mappedClasses[0].content);
            } else {
                // Fallback classes if table is empty or doesn't exist
                const defaultClasses = [
                    { id: 1, content: 'Grade 10A' },
                    { id: 2, content: 'Grade 10B' },
                    { id: 3, content: 'Grade 11A' },
                    { id: 4, content: 'Grade 12A' }
                ];
                setClasses(defaultClasses);
                setSelectedClass(defaultClasses[0].content);
            }

            // 2. Fetch Tests
            const { data: testData, error: testError } = await supabase
                .from('cbt_tests')
                .select('*')
                .order('created_at', { ascending: false });

            if (testError) {
                console.error("Error fetching tests:", testError);
                // Don't block UI on fetch error, just show empty
                setErrorMsg(testError.message);
            } else if (testData) {
                const formattedTests: CBTTest[] = testData.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    type: t.type,
                    className: t.class_name,
                    subject: t.subject,
                    duration: t.duration,
                    attempts: t.attempts,
                    totalMarks: t.total_mark || 60,
                    fileName: 'Question Bank.xlsx',
                    questionsCount: (t.questions || []).length,
                    createdAt: t.created_at,
                    isPublished: t.is_published,
                    results: []
                }));
                setTests(formattedTests);
            }
            setLoading(false);
        };

        fetchData();

        // Set default subject
        setSelectedSubject(SUBJECTS[0]);
    }, []);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsUploading(true);

            // Mock Question Generation
            // In a real scenario, we parse the Excel file here
            const questionCount = Math.floor(Math.random() * 10) + 10;
            // Calculate mark per question (simple distribution)
            const markPerQuestion = totalMarks > 0 ? (totalMarks / questionCount) : 1;

            const mockQuestions = Array.from({ length: questionCount }, (_, i) => ({
                id: i + 1,
                question: `Sample Question ${i + 1} from ${file.name}?`,
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                answer: 'Option A',
                mark: parseFloat(markPerQuestion.toFixed(2))
            }));

            setTimeout(async () => {
                const newTestPayload = {
                    title: file.name.replace('.xlsx', '').replace(/_/g, ' '),
                    type: uploadType,
                    class_name: selectedClass,
                    subject: selectedSubject,
                    duration: duration,
                    attempts: attempts,
                    total_mark: totalMarks,
                    questions: mockQuestions,
                    teacher_id: 2,
                    is_published: false
                };

                const { error } = await supabase.from('cbt_tests').insert([newTestPayload]);

                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';

                if (error) {
                    console.error("Error creating test:", error);
                    alert(`Failed to create test: ${error.message}`);
                } else {
                    alert(`${uploadType} uploaded and saved successfully!`);
                    // Refresh
                    window.location.reload(); // Simple refresh to fetch new data (or re-call fetchTests if extracted)
                }
            }, 1000);
        }
    };

    const togglePublish = async (test: CBTTest) => {
        const newStatus = !test.isPublished;
        setTests(prev => prev.map(t => t.id === test.id ? { ...t, isPublished: newStatus } : t));

        const { error } = await supabase
            .from('cbt_tests')
            .update({ is_published: newStatus })
            .eq('id', test.id);

        if (error) {
            alert("Failed to update status: " + error.message);
        }
    };

    const confirmDelete = async () => {
        if (deleteId !== null) {
            const { error } = await supabase.from('cbt_tests').delete().eq('id', deleteId);
            if (error) {
                alert("Failed to delete test.");
            } else {
                setTests(prev => prev.filter(t => t.id !== deleteId));
            }
            setDeleteId(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <main className="flex-grow p-6 space-y-8 overflow-y-auto w-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">CBT & Examinations</h1>
                        <p className="text-slate-500 mt-1">Create, manage, and publish computer-based tests.</p>
                    </div>
                </div>

                {/* Configuration Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-semibold text-slate-800 flex items-center">
                            <ExamIcon className="w-5 h-5 mr-2 text-indigo-600" />
                            Create New Assessment
                        </h3>
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                            <button
                                onClick={() => setUploadType('Test')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${uploadType === 'Test' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Test
                            </button>
                            <button
                                onClick={() => setUploadType('Exam')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${uploadType === 'Exam' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                Exam
                            </button>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Column 1: Inputs */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Target Class</label>
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 hover:border-indigo-400 transition-colors py-2 text-sm"
                                    >
                                        <option value="" disabled>Select Class</option>
                                        {classes.length > 0 ? classes.map(c => (
                                            <option key={c.id} value={c.content}>{c.content}</option>
                                        )) : <option value="Grade 10A">Grade 10A (Default)</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Subject</label>
                                    <select
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 hover:border-indigo-400 transition-colors py-2 text-sm"
                                    >
                                        <option value="" disabled>Select Subject</option>
                                        {SUBJECTS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Duration (m)</label>
                                    <input
                                        type="number"
                                        value={duration}
                                        onChange={(e) => setDuration(parseInt(e.target.value))}
                                        className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 text-sm"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Attempts</label>
                                    <input
                                        type="number"
                                        value={attempts}
                                        onChange={(e) => setAttempts(parseInt(e.target.value))}
                                        className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 text-sm"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Total Marks</label>
                                    <input
                                        type="number"
                                        value={totalMarks}
                                        onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                                        className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-indigo-50 text-indigo-700 font-bold py-2 text-sm"
                                        min="1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Upload Area */}
                        <div
                            className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col justify-center items-center p-6 cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all group min-h-[160px]"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx, .xls"
                                className="hidden"
                            />
                            {isUploading ? (
                                <div className="text-center animate-pulse">
                                    <CloudUploadIcon className="h-10 w-10 text-indigo-500 mx-auto mb-2" />
                                    <p className="text-indigo-600 font-medium text-sm">Processing Question Bank...</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="bg-indigo-50 p-3 rounded-full inline-block mb-3 group-hover:bg-indigo-100 transition-colors">
                                        <CloudUploadIcon className="h-6 w-6 text-indigo-600" />
                                    </div>
                                    <p className="font-semibold text-slate-700 text-sm">Click to Upload Excel File</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">Supports .xlsx, .xls formats</p>
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

                {/* Tests List */}
                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 px-1">Manage Assessments</h2>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                            <p className="text-slate-500 text-sm">Loading assessments...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {tests.map(test => (
                                <div key={test.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-1 w-full md:w-auto">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-800 text-lg">{test.title}</h4>
                                                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-bold ${test.type === 'Exam' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                                                    {test.type}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-600">{test.subject} • {test.className}</p>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
                                                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{test.questionsCount} Qs</span>
                                                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{test.duration}m</span>
                                                <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{test.attempts} Attempts</span>
                                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold px-2 py-1 rounded">Avg: {test.totalMarks} Marks</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-end md:items-center gap-3 w-full md:w-auto">
                                            <div className="flex items-center gap-2 md:mr-4">
                                                <span className={`w-2 h-2 rounded-full ${test.isPublished ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                                                <span className="text-xs font-medium text-slate-500 uppercase">{test.isPublished ? 'Published' : 'Draft'}</span>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <button
                                                    onClick={() => togglePublish(test)}
                                                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${test.isPublished
                                                            ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200'
                                                        }`}
                                                >
                                                    {test.isPublished ? 'Unpublish' : 'Publish'}
                                                </button>
                                                <button
                                                    onClick={() => handleViewScores(test)}
                                                    className="p-2 bg-slate-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-slate-200"
                                                    title="View Scores"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(test.id)}
                                                    className="p-2 bg-slate-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors border border-slate-200"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {tests.length === 0 && (
                                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <ExamIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500">No assessments created yet.</p>
                                    <p className="text-slate-400 text-sm">Upload a file in the configuration panel above.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <ConfirmationModal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Assessment"
                message="Are you sure you wish to delete this assessment? All associated student results will also be permanently removed."
                confirmText="Delete Assessment"
                isDanger
            />
        </div>
    );
};
export default CBTManagementScreen;
