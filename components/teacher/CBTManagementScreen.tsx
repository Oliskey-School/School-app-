import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import readXlsxFile from 'read-excel-file';
import { supabase } from '../../lib/supabase';
import { CloudUploadIcon, EyeIcon, ExamIcon, TrashIcon, CheckCircleIcon, XCircleIcon, WifiIcon } from '../../constants';
import { CBTTest } from '../../types';
import ConfirmationModal from '../ui/ConfirmationModal';

interface CBTManagementScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: number | null;
}

const SUBJECTS = [
    'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
    'Agricultural Science', 'Economics', 'Government', 'Literature',
    'Geography', 'Civic Education', 'Computer Studies', 'General'
];

const CBTManagementScreen: React.FC<CBTManagementScreenProps> = ({ navigateTo, teacherId }) => {
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
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Data Fetch
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
                // Fallback classes
                const defaultClasses = [
                    { id: 1, content: 'Grade 10A' },
                    { id: 2, content: 'Grade 10B' },
                    { id: 3, content: 'Grade 11A' },
                    { id: 4, content: 'Grade 12A' }
                ];
                setClasses(defaultClasses);
                setSelectedClass(defaultClasses[0].content);
            }

            // 2. Fetch Tests from DB
            let query = supabase.from('cbt_tests').select('*').order('created_at', { ascending: false });

            if (teacherId) {
                query = query.eq('teacher_id', teacherId);
            }

            const { data: testData, error: testError } = await query;

            // 3. Merge with Offline Queue
            const offlineTests = JSON.parse(localStorage.getItem('cbt_upload_queue') || '[]');
            const formattedOfflineTests = offlineTests.map((t: any, index: number) => ({
                ...t,
                id: `pending-${index}`, // Temp ID
                className: t.class_name,
                totalMarks: t.total_mark,
                fileName: 'Pending Upload...',
                questionsCount: (t.questions || []).length,
                createdAt: new Date().toISOString(),
                isPublished: false,
                isPending: true // Flag for UI
            }));

            if (testData) {
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
                // Combine: Offline first, then DB items
                setTests([...formattedOfflineTests, ...formattedTests]);
            } else {
                setTests(formattedOfflineTests);
                if (testError) setErrorMsg(testError.message);
            }
            setLoading(false);
        };

        fetchData();
        setSelectedSubject(SUBJECTS[0]);

        // Online Status Listeners
        const handleOnline = () => { setIsOnline(true); processOfflineQueue(); };
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Process Offline Queue when back online
    const processOfflineQueue = async () => {
        const queueStr = localStorage.getItem('cbt_upload_queue');
        if (!queueStr) return;

        const queue = JSON.parse(queueStr);
        if (queue.length === 0) return;

        console.log("Processing offline queue:", queue.length, "items");

        const newQueue = [];
        for (const payload of queue) {
            const { error } = await supabase.from('cbt_tests').insert([payload]);
            if (error) {
                console.error("Failed to sync item:", error);
                newQueue.push(payload); // Keep in queue if failed
            }
        }

        localStorage.setItem('cbt_upload_queue', JSON.stringify(newQueue));
        if (newQueue.length === 0) {
            toast.success("All offline tests have been synced to the database!");
            window.location.reload(); // Refresh to get real IDs
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setErrorMsg(null);

        try {
            const rows = await readXlsxFile(file);
            if (rows.length <= 1) throw new Error("The Excel file appears to be empty or only contains headers.");

            // Standardize: Skip header row (index 0)
            const dataRows = rows.slice(1);

            // Filter valid rows: Must have a Question (Col B -> index 1)
            const validRows = dataRows.filter(row => row[1] && row[1].toString().trim() !== '');

            if (validRows.length === 0) throw new Error("No valid questions found in Column B (Question Text).");

            const questionCount = validRows.length;
            const markPerQuestion = totalMarks > 0 ? (totalMarks / questionCount) : 1;

            const parsedQuestions = validRows.map((row, index) => {
                // Mapping based on User Request:
                // Col B (1): Question
                // Col C (2) - F (5): Options A-D
                // Col G (6): Correct Answer

                return {
                    id: index + 1,
                    question: row[1]?.toString() || `Question ${index + 1}`,
                    options: [
                        row[2]?.toString() || 'Option A', // Col C
                        row[3]?.toString() || 'Option B', // Col D
                        row[4]?.toString() || 'Option C', // Col E
                        row[5]?.toString() || 'Option D'  // Col F
                    ],
                    answer: row[6]?.toString() || row[2]?.toString() || 'Option A', // Fallback to first option if answer is empty
                    mark: parseFloat(markPerQuestion.toFixed(2))
                };
            });

            const newTestPayload = {
                title: file.name.replace('.xlsx', '').replace(/_/g, ' '),
                type: uploadType,
                class_name: selectedClass,
                subject: selectedSubject,
                duration: duration,
                attempts: attempts,
                total_mark: totalMarks,
                questions: parsedQuestions,
                teacher_id: teacherId || 2, // Use passed ID or fallback
                is_published: false
            };

            // IF ONLINE: Upload to DB
            if (navigator.onLine) {
                const { data, error } = await supabase.from('cbt_tests').insert([newTestPayload]).select();
                if (error) throw error;

                // Success - Update UI Locally without reload
                const newTest: CBTTest = {
                    id: data[0].id,
                    title: data[0].title,
                    type: data[0].type,
                    className: data[0].class_name,
                    subject: data[0].subject,
                    duration: data[0].duration,
                    attempts: data[0].attempts,
                    totalMarks: data[0].total_mark,
                    fileName: 'Question Bank.xlsx',
                    questionsCount: parsedQuestions.length,
                    createdAt: data[0].created_at,
                    isPublished: data[0].is_published,
                    results: []
                };
                setTests(prev => [newTest, ...prev]);
                toast.success(`${uploadType} uploaded successfully! ${questionCount} questions found.`);
            }
            // IF OFFLINE: Save to Local Storage
            else {
                const currentQueue = JSON.parse(localStorage.getItem('cbt_upload_queue') || '[]');
                currentQueue.push(newTestPayload);
                localStorage.setItem('cbt_upload_queue', JSON.stringify(currentQueue));

                // Show in UI as Pending
                const offlineTest: CBTTest = {
                    id: `local-${Date.now()}`,
                    title: newTestPayload.title,
                    type: newTestPayload.type as any,
                    className: newTestPayload.class_name,
                    subject: newTestPayload.subject,
                    duration: newTestPayload.duration,
                    attempts: newTestPayload.attempts,
                    totalMarks: newTestPayload.total_mark,
                    fileName: 'Pending Upload',
                    questionsCount: parsedQuestions.length,
                    createdAt: new Date().toISOString(),
                    isPublished: false,
                    isPending: true
                } as any;

                setTests(prev => [offlineTest, ...prev]);
                toast.success(`You are offline. Test saved locally with ${questionCount} questions.`);
            }

        } catch (err: any) {
            console.error("Error processing file:", err);
            setErrorMsg(err.message || "Failed to process.");
            toast.error(`Error: ${err.message || "Failed to process."}`);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const togglePublish = async (test: CBTTest) => {
        if ((test as any).isPending) {
            toast.error("Cannot publish a test that hasn't finished syncing.");
            return;
        }
        const newStatus = !test.isPublished;
        setTests(prev => prev.map(t => t.id === test.id ? { ...t, isPublished: newStatus } : t));

        const { error } = await supabase
            .from('cbt_tests')
            .update({ is_published: newStatus })
            .eq('id', test.id);

        if (error) toast.error("Failed to update status: " + error.message);
    };

    const confirmDelete = async () => {
        if (deleteId !== null) {
            const testToDelete = tests.find(t => t.id === deleteId);
            if ((testToDelete as any)?.isPending) {
                // Remove from local storage
                const queue = JSON.parse(localStorage.getItem('cbt_upload_queue') || '[]');
                // Simplistic removal for now
                setTests(prev => prev.filter(t => t.id !== deleteId));
            } else {
                const { error } = await supabase.from('cbt_tests').delete().eq('id', deleteId);
                if (error) {
                    toast.error("Failed to delete test.");
                } else {
                    setTests(prev => prev.filter(t => t.id !== deleteId));
                }
            }
            setDeleteId(null);
        }
    };

    const handleViewScores = (test: CBTTest) => {
        navigateTo('cbtScores', `Scores: ${test.title}`, { test });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <main className="flex-grow p-4 md:p-6 space-y-6 overflow-y-auto w-full">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-800">CBT & Examinations</h1>
                        <p className="text-slate-500 mt-1 text-sm">Create, manage, and publish computer-based tests.</p>
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
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-semibold text-slate-800 flex items-center">
                            <ExamIcon className="w-5 h-5 mr-2 text-indigo-600" />
                            Create New Assessment
                        </h3>
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                            <button onClick={() => setUploadType('Test')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${uploadType === 'Test' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Test</button>
                            <button onClick={() => setUploadType('Exam')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${uploadType === 'Exam' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>Exam</button>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Column 1: Inputs */}
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Target Class</label>
                                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 text-sm">
                                        <option value="" disabled>Select Class</option>
                                        {classes.length > 0 ? classes.map(c => <option key={c.id} value={c.content}>{c.content}</option>) : <option value="Grade 10A">Grade 10A</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Subject</label>
                                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 text-sm">
                                        <option value="" disabled>Select Subject</option>
                                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* ALIGNED GRID FOR MOBILE */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase mb-1 h-8 flex items-end justify-center text-center">Duration (m)</label>
                                    <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-full rounded-lg border-slate-300 py-1.5 text-sm text-center font-semibold" min="1" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase mb-1 h-8 flex items-end justify-center text-center">Attempts</label>
                                    <input type="number" value={attempts} onChange={(e) => setAttempts(parseInt(e.target.value))} className="w-full rounded-lg border-slate-300 py-1.5 text-sm text-center font-semibold" min="1" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase mb-1 h-8 flex items-end justify-center text-center">Total Marks</label>
                                    <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(parseInt(e.target.value))} className="w-full rounded-lg border-slate-300 bg-indigo-50 text-indigo-700 py-1.5 text-sm text-center font-bold" min="1" />
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Upload Area */}
                        <div className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col justify-center items-center p-6 cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all group min-h-[160px]" onClick={() => fileInputRef.current?.click()}>
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
                                    <p className="font-semibold text-slate-700 text-sm">Click to Upload Excel File</p>
                                    <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls</p>
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
                                <div key={test.id} className={`bg-white p-5 rounded-xl shadow-sm border ${(test as any).isPending ? 'border-amber-300 bg-amber-50' : 'border-slate-200'} hover:shadow-md transition-shadow`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="space-y-1 w-full md:w-auto">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-800 text-lg">{test.title}</h4>
                                                {(test as any).isPending && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold uppercase border border-amber-200">Pending Sync</span>}
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
                                                    disabled={(test as any).isPending}
                                                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${test.isPublished
                                                        ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed'
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
                message="Are you sure you want to delete this assessment? This action cannot be undone and all student results will be lost."
                confirmText="Delete"
                isDanger
            />
        </div>
    );
};
export default CBTManagementScreen;
