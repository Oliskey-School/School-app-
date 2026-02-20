
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { CBTTest } from '../../../types';
import { ClockIcon, CheckCircleIcon } from '../../../constants';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';

interface StudentCBTPlayerScreenProps {
    test: CBTTest;
    studentId: number | string;
    handleBack: () => void;
}

const StudentCBTPlayerScreen: React.FC<StudentCBTPlayerScreenProps> = ({ test, studentId, handleBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [timeLeft, setTimeLeft] = useState(test.duration * 60); // in seconds
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [totalMarks, setTotalMarks] = useState(0);
    const [questions, setQuestions] = useState<any[]>(test.questions || []);
    const [loading, setLoading] = useState(true);
    const { currentSchool } = useAuth();

    useEffect(() => {
        const loadQuestions = async () => {
            setLoading(true);
            try {
                if (questions.length === 0 && test.id) {
                    // Fetch from the correct table: cbt_questions linked by exam_id
                    const { data, error } = await supabase
                        .from('cbt_questions')
                        .select('*')
                        .eq('exam_id', test.id);

                    if (error) {
                        console.error('Error fetching questions:', error);
                        toast.error('Failed to load questions');
                        return;
                    }

                    if (data && data.length > 0) {
                        const mapped = data.map((q: any) => ({
                            id: q.id,
                            text: q.question_text,
                            options: Array.isArray(q.options) ? q.options : [],
                            correctAnswer: q.correct_answer,
                            points: q.points || 1
                        }));
                        setQuestions(mapped);
                    }
                }
            } catch (err) {
                console.error('Error loading questions:', err);
            } finally {
                setLoading(false);
            }
        };
        loadQuestions();
    }, [test.id]);

    // Timer
    useEffect(() => {
        if (timeLeft > 0 && !isSubmitted && !loading) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !isSubmitted && !loading) {
            handleSubmit();
        }
    }, [timeLeft, isSubmitted, loading]);

    const handleAnswerSelect = (questionId: string, option: string) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    const handleSubmit = async () => {
        if (isSubmitted) return;

        let correctCount = 0;
        let earnedPoints = 0;
        let maxPoints = 0;

        questions.forEach(q => {
            maxPoints += (q.points || 1);
            const userAnswer = answers[q.id];
            if (userAnswer && userAnswer === q.correctAnswer) {
                correctCount++;
                earnedPoints += (q.points || 1);
            }
        });

        const percentage = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;
        setScore(correctCount);
        setTotalMarks(earnedPoints);
        setIsSubmitted(true);

        // Save to cbt_submissions
        try {
            const { error } = await supabase.from('cbt_submissions').insert({
                exam_id: test.id,
                student_id: studentId,
                score: percentage,
                status: 'completed',
                submitted_at: new Date().toISOString()
            });

            if (error) {
                console.error('Failed to save result:', error);
                toast.error('Result save failed, but your score is recorded locally.');
            } else {
                toast.success('Exam submitted successfully!');
            }
        } catch (err) {
            console.error('Error saving result:', err);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-medium">Loading questions...</p>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6 text-center">
                <p className="text-gray-500 text-lg">No questions found for this exam.</p>
                <button
                    onClick={handleBack}
                    className="mt-6 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6 text-center">
                <CheckCircleIcon className="w-20 h-20 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Test Submitted!</h2>
                <p className="text-gray-600 mt-2">You have successfully completed the test.</p>

                <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border w-full max-w-sm">
                    <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Your Score</p>
                    <p className="text-5xl font-bold text-indigo-600 mt-2">{score} / {questions.length}</p>
                    <p className="text-lg font-medium text-gray-700 mt-1">{questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%</p>
                </div>

                <button
                    onClick={handleBack}
                    className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors"
                >
                    Return to CBT Portal
                </button>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm border-b border-gray-200 flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-gray-800 text-lg">{test.title}</h2>
                    <p className="text-xs text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
                <div className={`flex items-center space-x-2 font-mono font-bold text-lg ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                    <ClockIcon className="w-5 h-5" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>

            {/* Question Area */}
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="bg-white p-6 rounded-xl shadow-sm min-h-[300px]">
                    <p className="text-lg font-medium text-gray-800 mb-6">{currentQuestion?.text}</p>

                    <div className="space-y-3">
                        {(currentQuestion?.options || []).map((option: string, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${answers[currentQuestion.id] === option
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <span className="font-bold mr-3">{String.fromCharCode(65 + idx)}.</span>
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer Controls */}
            <div className="p-4 bg-white border-t border-gray-200 flex justify-between">
                <button
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 text-gray-600 font-semibold disabled:opacity-50"
                >
                    Previous
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                    >
                        Next
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                    >
                        Submit Test
                    </button>
                )}
            </div>
        </div>
    );
};

export default StudentCBTPlayerScreen;
