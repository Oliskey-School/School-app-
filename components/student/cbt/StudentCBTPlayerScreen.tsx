
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { CBTTest, Student } from '../../../types';
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

    const [questions, setQuestions] = useState<any[]>(test.questions || []);

    useEffect(() => {
        // If questions were not passed (lazy loaded), fetch them now
        const loadQuestions = async () => {
            if (questions.length === 0 && test.id) {
                const { data, error } = await import('../../../lib/supabase').then(m => m.supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('quiz_id', test.id)
                    .order('question_order', { ascending: true })
                );

                if (data) {
                    const mapped = data.map((q: any) => ({
                        id: q.id,
                        text: q.question_text,
                        options: q.options, // Assuming JSON array ["A", "B", ...]
                        correctAnswer: q.correct_option // 'A', 'B'...
                    }));
                    setQuestions(mapped);
                }
            }
        };
        loadQuestions();
    }, [test.id]);

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
        // Logic depends on how questions are passed. 
        // If coming from StudentCBTList, questions might be empty because we optimized the list fetch.
        // We really should fetch questions HERE if they are missing.
        // But for now, assuming they are passed or mock fallback in the component top level.

        questions.forEach(q => {
            // Check if q.correctAnswer matches answers[q.id]
            // Note: In refined logic, q object structure might vary. 
            // The fallback mock uses 'correctAnswer', but our DB object uses 'correct_option' usually.
            // Let's normalize in the fetch or here.

            const correct = q.correctAnswer || (q as any).correct_option;
            if (answers[q.id] === correct) {
                correctCount++;
            }
        });

        const finalScore = correctCount;
        const percentage = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;
        setScore(finalScore);
        setIsSubmitted(true);

        // Save to Database (quiz_submissions)
        try {
            const { error } = await import('../../../lib/supabase').then(m => m.supabase.from('quiz_submissions').insert([{
                quiz_id: test.id,
                student_id: studentId,
                score: percentage,
                total_questions: questions.length,
                answers: answers, // JSON
                status: 'Graded',
                submitted_at: new Date().toISOString()
            }]));

            if (error) {
                console.error("Failed to save result:", error);
                toast.error("Result save failed, but score is recorded locally.");
            } else {
                toast.success("Exam submitted successfully!");
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

    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6 text-center">
                <CheckCircleIcon className="w-20 h-20 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Test Submitted!</h2>
                <p className="text-gray-600 mt-2">You have successfully completed the test.</p>

                <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border w-full max-w-sm">
                    <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Your Score</p>
                    <p className="text-5xl font-bold text-indigo-600 mt-2">{score} / {questions.length}</p>
                    <p className="text-lg font-medium text-gray-700 mt-1">{Math.round((score / questions.length) * 100)}%</p>
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
