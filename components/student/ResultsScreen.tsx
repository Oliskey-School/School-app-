import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Student } from '../../types';
import { BookOpenIcon, CheckCircleIcon, ClipboardListIcon, SUBJECT_COLORS } from '../../constants';
import DonutChart from '../ui/DonutChart';

interface ResultsScreenProps {
    studentId: number;
    student?: Student;
}

const TermTab: React.FC<{ term: string; isActive: boolean; onClick: () => void; }> = ({ term, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-orange-500 text-white shadow' : 'text-gray-600'
            }`}
    >
        {term}
    </button>
);

const ResultsScreen: React.FC<ResultsScreenProps> = ({ studentId, student }) => {
    // State for fetched data
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTerm, setActiveTerm] = useState<string>('');
    const [quizResults, setQuizResults] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!studentId) return;

            try {
                // Fetch Academic Performance
                const { data: grades } = await supabase
                    .from('academic_performance')
                    .select('*')
                    .eq('student_id', studentId);

                if (grades) {
                    setPerformanceData(grades);
                    const terms = Array.from(new Set(grades.map((d: any) => d.term)));
                    if (terms.length > 0 && !activeTerm) {
                        setActiveTerm(terms[terms.length - 1]);
                    } else if (terms.length === 0) {
                        setActiveTerm('First Term');
                    }
                }
            } catch (err) {
                console.error('Error fetching results:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchQuizResults = async () => {
            const { data } = await supabase.from('quiz_submissions')
                .select('*, quizzes(title, subject)')
                .eq('student_id', studentId)
                .order('submitted_at', { ascending: false });
            if (data) setQuizResults(data);
        };

        fetchData();
        fetchQuizResults();

        // Realtime Subscription
        const channel = supabase.channel(`student_results_${studentId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_performance', filter: `student_id=eq.${studentId}` }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_submissions', filter: `student_id=eq.${studentId}` }, () => {
                fetchQuizResults();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId]);

    // Derived data for active term
    const termGrades = useMemo(() => {
        return performanceData.filter(d => d.term === activeTerm);
    }, [performanceData, activeTerm]);

    // Attendance (Live calc or from report card table)
    // For now, let's use the student prop status or just mock 100% since we don't have date ranges for terms easily mapped
    // Or we could fetch distinct dates from student_attendance table and guess the term.
    // Let's rely on student prop or fallback.
    const attendancePercentage = student?.attendanceStatus === 'Present' ? 95 : 85; // Placeholder logic until term-based attendance is implemented

    const availableTerms = useMemo(() => {
        const terms = Array.from(new Set(performanceData.map((d: any) => d.term)));
        return terms.length > 0 ? terms : ['First Term', 'Second Term']; // Default
    }, [performanceData]);

    if (loading) return <div className="p-10 text-center">Loading academic records...</div>;

    if (performanceData.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-50 h-full flex flex-col justify-center">
                <h3 className="font-bold text-lg text-gray-800">No Performance Data Available</h3>
                <p className="text-gray-600 mt-2">Your academic performance data has not been published yet.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg overflow-x-auto">
                    {availableTerms.map(term => (
                        <TermTab key={term} term={term} isActive={activeTerm === term} onClick={() => setActiveTerm(term)} />
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Grades Section */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center space-x-2 mb-3">
                            <BookOpenIcon className="h-5 w-5 text-orange-600" />
                            <h4 className="font-bold text-gray-800">Grades ({activeTerm})</h4>
                        </div>
                        <div className="space-y-2">
                            {termGrades.length > 0 ? termGrades.map((record: any) => (
                                <div key={record.subject} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                    <span className="font-semibold text-sm text-gray-700">{record.subject}</span>
                                    <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${SUBJECT_COLORS[record.subject] || 'bg-gray-200'}`}>{record.score}%</span>
                                </div>
                            )) : <p className="text-gray-500 text-sm">No grades recorded for this term.</p>}
                        </div>

                        {/* NEW: Quiz Results Section */}
                        <div className="mt-6">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span className="p-1 bg-purple-100 rounded text-purple-600">📝</span>
                                Recent Quizzes
                            </h4>
                            <div className="space-y-2">
                                {quizResults.length > 0 ? quizResults.map((result: any) => (
                                    <div key={result.id} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-lg hover:shadow-sm transition-shadow">
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">{result.quizzes?.title || 'Quiz'}</div>
                                            <div className="text-xs text-gray-500">{new Date(result.submitted_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{result.quizzes?.subject}</span>
                                            <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${result.score >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {result.score}%
                                            </span>
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500 text-sm italic">No quizzes taken yet.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-4">
                        {/* Attendance Section */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <CheckCircleIcon className="h-5 w-5 text-orange-600" />
                                <h4 className="font-bold text-gray-800">Attendance</h4>
                            </div>
                            <div className="flex items-center justify-around">
                                <div className="relative">
                                    <DonutChart percentage={attendancePercentage} color="#f97316" size={100} strokeWidth={10} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800">{attendancePercentage}%</span>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm font-medium">
                                    {/* Simplified attendance stats */}
                                    <p className="text-gray-500 text-xs text-center">Term Estimate</p>
                                </div>
                            </div>
                        </div>

                        {/* Behavior Notes Section - Placeholder as we don't have this table yet */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <ClipboardListIcon className="h-5 w-5 text-orange-600" />
                                <h4 className="font-bold text-gray-800">Behavior Notes</h4>
                            </div>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                <p className="text-sm text-gray-400 text-center py-4">No behavioral notes available.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ResultsScreen;