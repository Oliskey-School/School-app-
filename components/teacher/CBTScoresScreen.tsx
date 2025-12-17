import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CBTTest, CBTResult } from '../../types';
import { CheckCircleIcon, XCircleIcon } from '../../constants';

interface CBTScoresScreenProps {
    test: CBTTest;
}

const CBTScoresScreen: React.FC<CBTScoresScreenProps> = ({ test }) => {
    const [results, setResults] = useState<CBTResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScores = async () => {
            setLoading(true);
            try {
                // Fetch submissions with student details
                const { data, error } = await supabase
                    .from('cbt_submissions')
                    .select('*, students(name)')
                    .eq('test_id', test.id)
                    .order('submitted_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    const formattedResults: CBTResult[] = data.map((sub: any) => {
                        const score = parseFloat(sub.score);
                        const total = sub.total_questions || test.questionsCount || 10;
                        const percentage = Math.round((score / total) * 100);

                        return {
                            studentId: sub.student_id,
                            studentName: sub.students?.name || 'Unknown',
                            score: score,
                            totalQuestions: total,
                            percentage: percentage,
                            submittedAt: sub.submitted_at,
                            status: percentage >= 50 ? 'Passed' : 'Failed'
                        };
                    });
                    setResults(formattedResults);
                }
            } catch (err) {
                console.error("Error fetching scores:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchScores();
    }, [test.id]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white border-b shadow-sm">
                <h2 className="text-xl font-bold text-gray-800">{test.title} - Results</h2>
                <div className="flex space-x-4 mt-2 text-sm text-gray-600">
                    <p>Total Questions: <strong>{test.questionsCount}</strong></p>
                    <p>Class: <strong>{test.className}</strong></p>
                    <p>Participants: <strong>{results.length}</strong></p>
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading scores...</div>
                ) : results.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                        <p>No students have submitted this test yet.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Percentage</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {results.map((result, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{result.studentName}</div>
                                            <div className="text-xs text-gray-500">ID: {result.studentId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{result.score} / {result.totalQuestions}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm font-bold ${result.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.percentage}%
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(result.submittedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {result.percentage >= 50 ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Passed</span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Failed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CBTScoresScreen;
