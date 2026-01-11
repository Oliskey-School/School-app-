import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertCircle, CheckCircle, Flag, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';

interface Question {
    id: number;
    subject: string;
    text: string;
    options: string[];
    correctAnswer: number;
}

// Mock Exam Data (JAMB Style)
const MOCK_QUESTIONS: Question[] = [
    { id: 1, subject: 'Mathematics', text: 'If 2x + 3 = 11, what is the value of x?', options: ['2', '3', '4', '5'], correctAnswer: 2 },
    { id: 2, subject: 'Mathematics', text: 'Simplify: (3√2 + 2√3)(3√2 - 2√3)', options: ['6', '7', '8', '12'], correctAnswer: 0 },
    { id: 3, subject: 'English', text: 'Choose the option opposite in meaning to the underlined word: He is a *notorious* criminal.', options: ['Famous', 'Popular', 'Innocent', 'Reputable'], correctAnswer: 3 },
    { id: 4, subject: 'English', text: 'From the options, choose the word that correctly completes the sentence: The man was charged ___ murder.', options: ['with', 'for', 'of', 'on'], correctAnswer: 0 },
    { id: 5, subject: 'Physics', text: 'Which of the following is a scalar quantity?', options: ['Velocity', 'Momentum', 'Force', 'Temperature'], correctAnswer: 3 },
    { id: 6, subject: 'Physics', text: 'A car travels at 20m/s for 10 seconds. Calculate the distance covered.', options: ['2m', '20m', '100m', '200m'], correctAnswer: 3 },
    { id: 7, subject: 'Chemistry', text: 'The atomic number of an element is determined by the number of:', options: ['Protons', 'Neutrons', 'Electrons', 'Nucleons'], correctAnswer: 0 },
    { id: 8, subject: 'Biology', text: 'The powerhouse of the cell is the:', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi body'], correctAnswer: 1 },
    { id: 9, subject: 'General', text: 'Who is the current President of Nigeria (2024)?', options: ['Bola Ahmed Tinubu', 'Muhammadu Buhari', 'Goodluck Jonathan', 'Olusegun Obasanjo'], correctAnswer: 0 },
    { id: 10, subject: 'General', text: 'What is the capital of Canada?', options: ['Toronto', 'Vancouver', 'Montreal', 'Ottawa'], correctAnswer: 3 },
];

import { generateExamQuestions, AIQuestion } from '../../../lib/gemini';
import { Loader2, Sparkles, BookOpen } from 'lucide-react';

const SUBJECTS = ['Assignment', 'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Government', 'Literature'];

interface CBTExamGameProps {
    onBack?: () => void;
}

import { useGamification } from '../../../context/GamificationContext'; // Added import

// ... imports
import { format } from 'date-fns';

// Mock Leaderboard
const LEADERBOARD = [
    { name: "David O.", score: 95, time: "05:20" },
    { name: "Sarah A.", score: 92, time: "06:15" },
    { name: "Michael B.", score: 88, time: "05:45" },
];

const CBTExamGame: React.FC<CBTExamGameProps> = ({ onBack }) => {
    // ... existing state
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'setup' | 'loading' | 'playing' | 'result'>('setup');
    const [questions, setQuestions] = useState<AIQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
    const [timeLeft, setTimeLeft] = useState(15 * 60);
    const [showPalette, setShowPalette] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);

    // Setup State
    const [selectedSubject, setSelectedSubject] = useState('Mathematics');
    const [difficulty, setDifficulty] = useState('Medium');

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Derived State
    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;

    // Helper Functions
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const toggleMarkForReview = () => {
        if (!currentQuestion) return;
        setMarkedForReview(prev => {
            const next = new Set(prev);
            if (next.has(currentQuestion.id)) {
                next.delete(currentQuestion.id);
            } else {
                next.add(currentQuestion.id);
            }
            return next;
        });
    };

    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState]);

    const startExam = async () => {
        setGameState('loading');
        try {
            const aiQuestions = await generateExamQuestions(selectedSubject, "General Revision", difficulty, 10);
            const finalQuestions = aiQuestions.length > 0 ? aiQuestions : MOCK_QUESTIONS as unknown as AIQuestion[];
            setQuestions(finalQuestions);
            setGameState('playing');
            setTimeLeft(15 * 60);
            setStartTime(Date.now());
        } catch (e) {
            console.error(e);
            toast.error("Using offline questions.");
            setQuestions(MOCK_QUESTIONS as unknown as AIQuestion[]);
            setGameState('playing');
            setTimeLeft(15 * 60);
            setStartTime(Date.now());
        }
    };

    // ... timer effect and formatting

    const handleSelectOption = (optionIndex: number) => {
        if (gameState === 'result') return;
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIndex }));
    };

    const handleSubmit = () => {
        setGameState('result');
        if (timerRef.current) clearInterval(timerRef.current);

        // Calculate Score & Stats
        let rawScore = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) rawScore++;
        });

        const percentage = Math.round((rawScore / totalQuestions) * 100);
        const timeSpentSeconds = (15 * 60) - timeLeft;

        // Gamification Logic
        if (percentage >= 70) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            addXP(100); // Base XP

            // Speed Bonus
            if (timeSpentSeconds < 300) { // Under 5 mins
                addXP(50);
                toast.success("Speed Demon Bonus! +50 XP", { icon: '⚡' });
                unlockBadge('speed-demon');
            }

            unlockBadge('exam-master');
        }

        if (percentage >= 50) {
            addXP(50);
        }
    };

    // ... render logic

    return (
        <div className="flex flex-col h-screen bg-gray-100 font-sans text-gray-800">
            {/* ... Header ... */}
            <header className="bg-white shadow-sm p-3 px-4 flex items-center justify-between z-10 sticky top-0">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-full">
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-800 leading-tight">CBT Exam Master</h1>
                        <p className="text-xs text-gray-500">{selectedSubject} &bull; {difficulty}</p>
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border content-center ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    <Clock className="w-4 h-4" />
                    <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                <main className="flex-1 flex flex-col h-full overflow-y-auto p-4 lg:p-8">
                    {gameState === 'setup' ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center space-y-6 animate-in zoom-in duration-300">
                                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="w-10 h-10 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Configure Exam</h2>
                                <p className="text-gray-500">Select your subject and difficulty to begin.</p>

                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {SUBJECTS.slice(1, 9).map(sub => (
                                                <button
                                                    key={sub}
                                                    onClick={() => setSelectedSubject(sub)}
                                                    className={`p-2 text-sm rounded-lg border transition-colors ${selectedSubject === sub ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                                                >
                                                    {sub}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                                        <div className="flex gap-2">
                                            {['Easy', 'Medium', 'Hard'].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setDifficulty(d)}
                                                    className={`flex-1 p-2 text-sm rounded-lg border transition-colors ${difficulty === d ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={startExam}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    Start Exam
                                </button>
                            </div>
                        </div>
                    ) : gameState === 'loading' ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            <p className="text-gray-500 font-medium animate-pulse">Generating questions with Gemini AI...</p>
                        </div>
                    ) : gameState === 'result' ? (
                        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in duration-300">
                            {/* Score Card */}
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
                                <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${Math.round((questions.filter(q => answers[q.id] === q.correctAnswer).length / totalQuestions) * 100) >= 70 ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                                    }`}>
                                    <span className={`text-4xl font-black ${Math.round((questions.filter(q => answers[q.id] === q.correctAnswer).length / totalQuestions) * 100) >= 70 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {Math.round((questions.filter(q => answers[q.id] === q.correctAnswer).length / totalQuestions) * 100)}%
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {Math.round((questions.filter(q => answers[q.id] === q.correctAnswer).length / totalQuestions) * 100) >= 70 ? 'Excellent Result!' : 'Keep Practicing!'}
                                    </h2>
                                    <p className="text-gray-500">You completed the {selectedSubject} exam.</p>
                                </div>
                                <div className="grid grid-cols-3 gap-4 w-full">
                                    <div className="bg-gray-50 p-3 rounded-xl">
                                        <div className="text-xs text-gray-500 uppercase font-bold">Time</div>
                                        <div className="font-mono font-bold text-lg text-gray-800">{formatTime((15 * 60) - timeLeft)}</div>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-xl">
                                        <div className="text-xs text-green-600 uppercase font-bold">Correct</div>
                                        <div className="font-mono font-bold text-lg text-green-700">{questions.filter(q => answers[q.id] === q.correctAnswer).length}</div>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-xl">
                                        <div className="text-xs text-red-600 uppercase font-bold">Wrong</div>
                                        <div className="font-mono font-bold text-lg text-red-700">{Object.keys(answers).length - questions.filter(q => answers[q.id] === q.correctAnswer).length}</div>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full">
                                    <button onClick={() => setGameState('setup')} className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-200">
                                        Retry
                                    </button>
                                    <button onClick={onBack} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">
                                        Exit
                                    </button>
                                </div>
                            </div>

                            {/* Leaderboard Card */}
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col">
                                <div className="flex items-center gap-2 mb-6 text-gray-800">
                                    <Flag className="text-yellow-500 fill-current" />
                                    <h3 className="text-xl font-bold">Top Students</h3>
                                </div>
                                <div className="space-y-3 flex-1">
                                    {LEADERBOARD.map((entry, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-yellow-400 shadow-md' : idx === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="font-bold text-gray-700">{entry.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-blue-600">{entry.score}%</div>
                                                <div className="text-xs text-gray-400 font-mono">{entry.time}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* User's Current Score Placeholder */}
                                    <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between animate-pulse">
                                        <span className="font-bold text-blue-800">Your Score</span>
                                        <span className="font-bold text-blue-600">{Math.round((questions.filter(q => answers[q.id] === q.correctAnswer).length / totalQuestions) * 100)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : props.gameState === 'playing' || gameState === 'playing' ? ( /* Fallback for 'playing' */
                        <>
                            {/* Question UI */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Question {currentQuestionIndex + 1}/{totalQuestions}</span>
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{answeredCount} Answered</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full mb-6 overflow-hidden">
                                <motion.div
                                    className="bg-blue-600 h-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            <div className="flex-1 mb-6 overflow-y-auto">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 lg:p-10 h-full overflow-y-auto">
                                    {/* Question Content */}
                                    <div className="mb-8">
                                        <h2 className="text-xl lg:text-2xl font-medium text-gray-900 leading-relaxed">
                                            {currentQuestion?.text || "Loading question..."}
                                        </h2>
                                    </div>
                                    <div className="space-y-3">
                                        {currentQuestion?.options?.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectOption(idx)}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group ${answers[currentQuestion.id] === idx
                                                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${answers[currentQuestion.id] === idx
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                                                    }`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span className={`text-base ${answers[currentQuestion.id] === idx ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                                                    {option}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-between gap-4 mt-auto pt-4 border-t border-gray-200 bg-gray-100 sticky bottom-0">
                                <button
                                    onClick={prevQuestion}
                                    disabled={currentQuestionIndex === 0}
                                    className="px-6 py-3 rounded-xl bg-white border border-gray-300 text-gray-700 font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    Previous
                                </button>

                                <button
                                    onClick={toggleMarkForReview}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-colors ${markedForReview.has(currentQuestion?.id)
                                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                                        : 'text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    <Flag className={`w-5 h-5 ${markedForReview.has(currentQuestion?.id) ? 'fill-current' : ''}`} />
                                    <span className="hidden sm:inline">Review</span>
                                </button>

                                <button
                                    onClick={currentQuestionIndex === totalQuestions - 1 ? handleSubmit : nextQuestion}
                                    className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${currentQuestionIndex === totalQuestions - 1
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                >
                                    {currentQuestionIndex === totalQuestions - 1 ? 'Submit' : 'Next'}
                                </button>
                            </div>
                        </>
                    ) : null}
                </main>
                {/* Score and Palette logic remains similar but simplified context */}
            </div>
        </div>
    );
};


export default CBTExamGame;
