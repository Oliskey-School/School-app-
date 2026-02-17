import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { Student, CBTTest } from '../../../types';
import { ExamIcon, ClockIcon, CheckCircleIcon, ChevronRightIcon, ChevronLeftIcon, DocumentTextIcon } from '../../../constants';

interface StudentCBTListScreenProps {
    studentId: number;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const StudentCBTListScreen: React.FC<StudentCBTListScreenProps> = ({ studentId, navigateTo }) => {
    // We expect the student object to be passed via props or context in a real app,
    // but here we might need to fetch it or use the one passed from Dashboard if available.
    // For now, let's assume the Dashboard passes the full student object or we fetch it.
    // Actually, StudentDashboard passes `student` prop but the interface here only had `studentId`.
    // Let's update the component to accept `student` object if possible, or fetch it.

    // However, looking at StudentDashboard.tsx line 464:  student={student} is passed.
    // We should update the interface to accept `student`.

    const [tests, setTests] = useState<CBTTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState<'Test' | 'Exam' | null>(null);

    // We'll use a local state for student to be safe, or cast from props if we update the interface
    // But since I can't easily change the interface in the parent without seeing if it breaks others,
    // I will try to fetch the student if needed, BUT wait, StudentDashboard definitely passes it.
    // Let's use the `student` from mockStudents as fallback but ideally we want the real one.
    // Actually, reusing the `mockStudents.find` is what caused part of the issue if the ID didn't match.
    // Let's fetch the tests based on the student's class from the DB.

    useEffect(() => {
        const fetchTests = async () => {
            setLoading(true);
            try {
                // 1. Get student details to filter by grade/section
                // In a real scenario, we should have the full student object. 
                // We'll trust the studentId and fetch their class details.
                const { data: studentData } = await supabase
                    .from('students')
                    .select('*')
                    .eq('id', studentId)
                    .single();

                if (!studentData) {
                    console.error("Student not found");
                    setLoading(false);
                    return;
                }

                // 2. Fetch Quizzes (CBT & Exams)
                // Teacher saves description as 'Test' or 'Exam'.
                // We filter by school_id and (class_id OR generic grade match if implemented)
                // For now, let's filter by school_id and allow all published for that school+grade?
                // Ideally we match class_id. But teacher selects a specific class_id.
                // We need to find quizzes where class_id matches student's class_id OR generic grade match.
                // Let's first try matching by school_id and is_published.

                let query = supabase
                    .from('quizzes')
                    .select('*, classes(grade, section), subjects(name)')
                    .eq('school_id', studentData.school_id)
                    .eq('is_published', true)
                    .order('created_at', { ascending: false });

                const { data: quizzesData, error } = await query;
                if (error) throw error;

                // Client-side filter for Class Match (Logic can be improved to DB filter if class_id is consistent)
                // We want to show quizzes that are for this student's class.
                const filteredQuizzes = (quizzesData || []).filter((quiz: any) => {
                    if (quiz.classes) {
                        // Strict class match
                        const sGrade = String(studentData.grade);
                        const sSection = studentData.section;
                        const qGrade = String(quiz.classes.grade);
                        const qSection = quiz.classes.section;

                        // Match Grade
                        if (sGrade !== qGrade) return false;

                        // Match Section if specified in quiz
                        if (qSection && sSection && qSection !== sSection) return false;

                        return true;
                    }
                    // If no class linked, maybe it's general? Assume NO for now to be safe.
                    return false;
                });

                const formattedTests: CBTTest[] = filteredQuizzes.map((q: any) => ({
                    id: q.id,
                    title: q.title,
                    type: (q.description === 'Exam' ? 'Exam' : 'Test'), // Map description to Type
                    className: q.classes ? `Grade ${q.classes.grade}${q.classes.section}` : 'General',
                    subject: q.subjects?.name || 'General',
                    duration: q.duration_minutes,
                    attempts: 0, // Not tracking attempts yet
                    totalMarks: q.total_marks,
                    fileName: 'Question Bank',
                    questionsCount: 0, // We don't fetch questions here to save bandwidth
                    questions: [],
                    createdAt: q.created_at,
                    isPublished: q.is_published,
                    results: []
                }));

                setTests(formattedTests);

            } catch (err) {
                console.error("Error fetching available tests:", err);
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchTests();

            // Real-time Subscription
            const channel = supabase
                .channel('public:quizzes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, (payload) => {
                    console.log('Real-time update received!', payload);
                    fetchTests();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [studentId]);

    // Filter locally by type
    const availableTests = useMemo(() => {
        if (!selectedType) return [];
        return tests.filter(t => t.type === selectedType);
    }, [tests, selectedType]);

    const handleTakeTest = (test: CBTTest) => {
        // Check if taken (in a real app, query cbt_results table)
        // For now, we'll assume the `results` array on the test object might not be populated 
        // because we simply mapped it from the test row. 
        // We should ideally check `cbt_results` table here.

        // TODO: Implement result check against separate table
        // For now preventing client-side check if empty
        const hasTaken = false;

        if (hasTaken) {
            toast.error("You have already taken this test.");
            return;
        }
        navigateTo('cbtPlayer', test.title, { test, studentId });
    };

    if (!selectedType) {
        return (
            <div className="flex flex-col h-full bg-gray-50 p-4">
                <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200 mb-6">
                    <ExamIcon className="h-10 w-10 mx-auto text-indigo-400 mb-2" />
                    <h3 className="font-bold text-lg text-indigo-800">CBT Portal</h3>
                    <p className="text-sm text-indigo-700">Select an assessment type to proceed.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={() => setSelectedType('Test')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:ring-2 hover:ring-blue-200 transition-all"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-xl text-gray-800">Tests</h4>
                                <p className="text-gray-500 text-sm">Quizzes and Class Tests</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="text-gray-400 h-6 w-6" />
                    </button>

                    <button
                        onClick={() => setSelectedType('Exam')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:ring-2 hover:ring-red-200 transition-all"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-red-100 rounded-xl">
                                <ExamIcon className="h-8 w-8 text-red-600" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-xl text-gray-800">Exams</h4>
                                <p className="text-gray-500 text-sm">Termly Examinations</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="text-gray-400 h-6 w-6" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white border-b flex items-center space-x-2">
                <button onClick={() => setSelectedType(null)} className="p-1 rounded-full hover:bg-gray-100">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                </button>
                <h3 className="font-bold text-lg text-gray-800">Available {selectedType}s</h3>
            </div>

            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-2 text-gray-500">Loading tests...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {availableTests.length > 0 ? (
                            availableTests.map(test => {
                                // Real result check logic would go here
                                const hasTaken = false;

                                return (
                                    <div key={test.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-lg">{test.title}</h4>
                                                <p className="text-sm text-gray-500 font-medium">{test.subject}</p>
                                            </div>
                                            {hasTaken ? (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center">
                                                    <CheckCircleIcon className="w-3 h-3 mr-1" /> Completed
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center">
                                                    <ClockIcon className="w-3 h-3 mr-1" /> Pending
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 flex items-center text-sm text-gray-600 space-x-4">
                                            <span>{test.questionsCount} Questions</span>
                                            <span>•</span>
                                            <span>{test.duration} Mins</span>
                                        </div>

                                        {hasTaken ? (
                                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                                <span className="text-sm text-gray-500">Your Score:</span>
                                                <span className="font-bold text-lg text-indigo-600">--</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleTakeTest(test)}
                                                className="w-full mt-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
                                            >
                                                <span>Start {selectedType}</span>
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500">No {selectedType?.toLowerCase()}s are currently available for your class.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default StudentCBTListScreen;
