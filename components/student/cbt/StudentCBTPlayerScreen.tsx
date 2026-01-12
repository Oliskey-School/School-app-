
import React, { useState, useEffect, useRef } from 'react';
import { CBTTest, Student, DashboardType } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { ClockIcon, CheckCircleIcon } from '../../../constants';
import { mockCBTTests } from '../../../data';

interface StudentCBTPlayerScreenProps {
    test: CBTTest;
    studentId: number;
    handleBack: () => void;
}

const StudentCBTPlayerScreen: React.FC<StudentCBTPlayerScreenProps> = ({ test, studentId, handleBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<{ [key: number]: string }>({});
    const [timeLeft, setTimeLeft] = useState(test.duration * 60); // in seconds
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    // Mock questions if not provided (fallback for demo stability)
    const questions = test.questions && test.questions.length > 0 ? test.questions : [
        { id: 1, text: 'Sample Question 1', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
        { id: 2, text: 'Sample Question 2', options: ['A', 'B', 'C', 'D'], correctAnswer: 'B' }
    ];

    useEffect(() => {
        if (timeLeft > 0 && !isSubmitted) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && !isSubmitted) {
            handleSubmit();
        }
    }, [timeLeft, isSubmitted]);

    const handleAnswerSelect = (questionId: number, option: string) => {
        if (isSubmitted) return;
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };

    const handleSubmit = async () => {
        if (isSubmitted) return;

        // Calculate score
        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                correctCount++;
            }
        });

        const finalScore = correctCount;
        const percentage = Math.round((finalScore / questions.length) * 100); // FIXED: Use length directly
        setScore(finalScore);
        setIsSubmitted(true);

        // Save to Database
        try {
            // Check if result exists first (optional, but good for safety)
            // For now, simple insert
            const { error } = await import('../../../lib/supabase').then(m => m.supabase.from('cbt_submissions').insert([{
                test_id: test.id,
                student_id: studentId,
                score: finalScore,
                total_score: test.totalMarks || questions.length, // Ensure total_score is sent
                total_questions: questions.length,
                answers: answers, // Store the student's answers JSON
                submitted_at: new Date().toISOString()
            }]));

            if (error) {
                console.error("Failed to save result:", error);
                // We don't block the UI for now, but in prod we should retry
            }
        } catch (err) {
            console.error("Error saving result:", err);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const { role } = useAuth();

    const showScoreToViewer = role === DashboardType.Teacher; // Only teachers see the score here

    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6 text-center">
                <CheckCircleIcon className="w-20 h-20 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Test Submitted!</h2>
                <p className="text-gray-600 mt-2">You have successfully completed the test.</p>

                {showScoreToViewer ? (
                    <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Your Score</p>
                        <p className="text-4xl sm:text-5xl md:text-6xl font-bold text-indigo-600 mt-2 break-words">{score} / {questions.length}</p>
                        <p className="text-lg sm:text-xl font-medium text-gray-700 mt-1">{Math.round((score / questions.length) * 100)}%</p>
                    </div>
                ) : (
                    <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border w-full max-w-xs sm:max-w-sm md:max-w-md">
                        <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Submission Received</p>
                        <p className="text-base text-gray-700 mt-2">Your answers have been submitted. Results will be available to your teacher.</p>
                    </div>
                )}

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
                    <p className="text-lg font-medium text-gray-800 mb-6">{currentQuestion.text}</p>

                    <div className="space-y-3">
                        {currentQuestion.options.map((option, idx) => (
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
