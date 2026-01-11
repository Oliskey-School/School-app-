import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { HelpCircleIcon, CheckCircleIcon, XCircleIcon, AwardIcon } from 'lucide-react';

interface GeometryJeopardyGameProps {
    onBack: () => void;
}

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    points: number;
    isAnswered: boolean;
}

interface Category {
    id: string;
    title: string;
    questions: Question[];
}

const INITIAL_DATA: Category[] = [
    {
        id: 'angles',
        title: 'Angles',
        questions: [
            { id: 'a100', points: 100, question: "An angle less than 90 degrees is called...", options: ["Acute", "Obtuse", "Right", "Reflex"], correctAnswer: "Acute", isAnswered: false },
            { id: 'a200', points: 200, question: "What is the complement of a 30-degree angle?", options: ["60°", "150°", "90°", "45°"], correctAnswer: "60°", isAnswered: false },
            { id: 'a300', points: 300, question: "An angle greater than 180 degrees is...", options: ["Reflex", "Obtuse", "Straight", "Full"], correctAnswer: "Reflex", isAnswered: false },
        ]
    },
    {
        id: 'triangles',
        title: 'Triangles',
        questions: [
            { id: 't100', points: 100, question: "A triangle with all sides equal is...", options: ["Equilateral", "Isosceles", "Scalene", "Right"], correctAnswer: "Equilateral", isAnswered: false },
            { id: 't200', points: 200, question: "The sum of angles in a triangle is...", options: ["180°", "360°", "90°", "270°"], correctAnswer: "180°", isAnswered: false },
            { id: 't300', points: 300, question: "A triangle with one 90° angle is...", options: ["Right-angled", "Obtuse", "Acute", "Equilateral"], correctAnswer: "Right-angled", isAnswered: false },
        ]
    },
    {
        id: 'shapes',
        title: 'Polygons',
        questions: [
            { id: 's100', points: 100, question: "A polygon with 5 sides is a...", options: ["Pentagon", "Hexagon", "Octagon", "Square"], correctAnswer: "Pentagon", isAnswered: false },
            { id: 's200', points: 200, question: "A parallelogram with 4 right angles is a...", options: ["Rectangle", "Rhombus", "Trapezium", "Kite"], correctAnswer: "Rectangle", isAnswered: false },
            { id: 's300', points: 300, question: "Sum of exterior angles of any polygon is...", options: ["360°", "180°", "540°", "90°"], correctAnswer: "360°", isAnswered: false },
        ]
    },
    {
        id: 'area',
        title: 'Area & Perimeter',
        questions: [
            { id: 'ap100', points: 100, question: "Formula for area of a rectangle?", options: ["L × W", "2(L+W)", "S × S", "½ B × H"], correctAnswer: "L × W", isAnswered: false },
            { id: 'ap200', points: 200, question: "Perimeter of a square with side 5cm?", options: ["20cm", "25cm", "10cm", "15cm"], correctAnswer: "20cm", isAnswered: false },
            { id: 'ap300', points: 300, question: "Area of a triangle with base 10 and height 5?", options: ["25", "50", "15", "100"], correctAnswer: "25", isAnswered: false },
        ]
    }
];

const GeometryJeopardyGame: React.FC<GeometryJeopardyGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [categories, setCategories] = useState<Category[]>(INITIAL_DATA);
    const [score, setScore] = useState(0);
    const [activeQuestion, setActiveQuestion] = useState<{ q: Question; catId: string } | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null);
    const [gameWon, setGameWon] = useState(false);

    // Audio
    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const handleQuestionClick = (categoryIndex: number, questionIndex: number) => {
        const question = categories[categoryIndex].questions[questionIndex];
        if (question.isAnswered) return;

        setActiveQuestion({ q: question, catId: categories[categoryIndex].id });
        speak(question.question);
    };

    const handleAnswer = (option: string) => {
        if (!activeQuestion) return;

        const isCorrect = option === activeQuestion.q.correctAnswer;

        if (isCorrect) {
            setScore(prev => prev + activeQuestion.q.points);
            setFeedback({ type: 'correct', msg: "Correct!" });
            speak("Correct!");
            confetti({
                particleCount: 50,
                spread: 40,
                origin: { y: 0.7 }
            });
        } else {
            setScore(prev => Math.max(0, prev - activeQuestion.q.points)); // Deduct points?
            setFeedback({ type: 'wrong', msg: `Wrong! Answer was ${activeQuestion.q.correctAnswer}` });
            speak(`Incorrect. The answer was ${activeQuestion.q.correctAnswer}`);
        }

        // Mark as answered
        const newCategories = [...categories];
        const catIdx = newCategories.findIndex(c => c.id === activeQuestion.catId);
        const qIdx = newCategories[catIdx].questions.findIndex(q => q.id === activeQuestion.q.id);
        newCategories[catIdx].questions[qIdx].isAnswered = true;
        setCategories(newCategories);

        // Close modal logic
        setTimeout(() => {
            setActiveQuestion(null);
            setFeedback(null);
            checkWin(newCategories);
        }, 2000);
    };

    const checkWin = (currentCategories: Category[]) => {
        const allAnswered = currentCategories.every(c => c.questions.every(q => q.isAnswered));
        if (allAnswered) {
            setGameWon(true);
            addXP(200);
            unlockBadge('geometry-genius');
            confetti({ particleCount: 200, spread: 100 });
            speak("Board Cleared! You are a Geometry Genius.");
        }
    };

    return (
        <GameShell
            title="Geometry Jeopardy"
            onExit={onBack}
            score={score}
            isGameOver={gameWon}
            onRestart={() => {
                setCategories(INITIAL_DATA.map(c => ({ ...c, questions: c.questions.map(q => ({ ...q, isAnswered: false })) })));
                setScore(0);
                setGameWon(false);
            }}
        >
            <div className="h-full w-full bg-blue-900 overflow-hidden flex flex-col p-4 relative font-mono">

                {/* Board */}
                <div className="flex-1 grid grid-cols-4 gap-2 sm:gap-4 max-w-5xl mx-auto w-full content-center">
                    {/* Headers */}
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-blue-800 text-yellow-400 font-bold text-center py-4 rounded-lg border-2 border-black shadow-lg flex items-center justify-center text-sm sm:text-lg uppercase tracking-wider">
                            {cat.title}
                        </div>
                    ))}

                    {/* Questions Grid (Transposed visual logic naturally flows if we map col by col, but CSS grid rows implies row by row. 
                        We need to map row 1 (all 100s), row 2 (all 200s)... 
                    */}
                    {[0, 1, 2].map(rowIndex => (
                        <React.Fragment key={rowIndex}>
                            {categories.map((cat, catIndex) => {
                                const q = cat.questions[rowIndex];
                                return (
                                    <motion.button
                                        key={q.id}
                                        whileHover={!q.isAnswered ? { scale: 1.05, backgroundColor: "#2563EB" } : {}}
                                        whileTap={!q.isAnswered ? { scale: 0.95 } : {}}
                                        onClick={() => handleQuestionClick(catIndex, rowIndex)}
                                        disabled={q.isAnswered}
                                        className={`aspect-video rounded-lg border-2 border-black shadow-xl flex items-center justify-center text-2xl sm:text-4xl font-black transition-colors duration-500 ${q.isAnswered ? 'bg-blue-900/50 text-blue-900/0 border-blue-900/20' : 'bg-blue-600 text-yellow-300 cursor-pointer'
                                            }`}
                                    >
                                        {q.isAnswered ? "" : q.points}
                                    </motion.button>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>

                {/* Score Footer */}
                <div className="mt-4 bg-black p-4 rounded-xl border-4 border-yellow-500 text-center max-w-md mx-auto w-full shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                    <div className="text-yellow-500 font-bold uppercase tracking-widest text-xs mb-1">Total Winnings</div>
                    <div className="text-4xl text-white font-black">${score}</div>
                </div>

                {/* Question Modal */}
                <AnimatePresence>
                    {activeQuestion && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="absolute inset-0 z-50 bg-blue-900/90 backdrop-blur-md flex items-center justify-center p-4"
                        >
                            <div className="bg-blue-800 border-4 border-yellow-400 rounded-3xl p-8 max-w-3xl w-full shadow-2xl text-center">
                                <div className="text-yellow-400 text-xl font-bold mb-6 font-mono border-b border-blue-600 pb-4">
                                    {categories.find(c => c.id === activeQuestion.catId)?.title} for ${activeQuestion.q.points}
                                </div>

                                <h3 className="text-3xl sm:text-4xl font-bold text-white mb-10 leading-relaxed">
                                    {activeQuestion.q.question}
                                </h3>

                                {!feedback ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {activeQuestion.q.options.map((opt, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleAnswer(opt)}
                                                className="bg-blue-600 hover:bg-yellow-400 hover:text-blue-900 text-white p-6 rounded-xl font-bold text-xl transition-all border-2 border-blue-500 shadow-lg text-left"
                                            >
                                                <span className="opacity-50 mr-2">{String.fromCharCode(65 + i)})</span> {opt}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`p-6 rounded-xl text-3xl font-black text-white flex flex-col items-center gap-4 ${feedback.type === 'correct' ? 'bg-green-600' : 'bg-red-600'}`}>
                                        {feedback.type === 'correct' ? <CheckCircleIcon size={64} /> : <XCircleIcon size={64} />}
                                        {feedback.msg}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Win Screen */}
                {gameWon && (
                    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
                        <div className="bg-white p-12 rounded-3xl text-center shadow-2xl animate-bounce-in max-w-lg">
                            <AwardIcon size={100} className="text-yellow-500 mx-auto mb-6" />
                            <h2 className="text-4xl font-black text-blue-900 mb-2">GEOMETRY GENIUS!</h2>
                            <p className="text-xl text-gray-500 mb-8">You cleared the board with ${score}!</p>
                            <button
                                onClick={() => {
                                    setCategories(INITIAL_DATA.map(c => ({ ...c, questions: c.questions.map(q => ({ ...q, isAnswered: false })) })));
                                    setScore(0);
                                    setGameWon(false);
                                }}
                                className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-500"
                            >
                                Play Again
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

export default GeometryJeopardyGame;
