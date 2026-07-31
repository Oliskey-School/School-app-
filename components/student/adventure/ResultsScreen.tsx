
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAIClient, AI_MODEL_NAME } from '../../../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AdventureData, UserAnswer } from '../../../types';
import { CheckCircleIcon, XCircleIcon, SparklesIcon, BookOpenIcon, ChevronRightIcon } from '../../../constants';

interface ResultsScreenProps {
    adventureData: AdventureData;
    userAnswers: UserAnswer[];
    onRestart: () => void;
}

const Accordion: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <motion.button whileTap={{ scale: 0.99 }} onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-left">
                <h3 className="font-bold text-gray-800">{title}</h3>
                <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
            </motion.button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t"><ReactMarkdown remarkPlugins={[remarkGfm]}>{children as string}</ReactMarkdown></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ adventureData, userAnswers, onRestart }) => {
    const [aiSummary, setAiSummary] = useState<string>('');
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    const { score, correctAnswers, incorrectAnswers, totalQuestions, xp, gems } = useMemo(() => {
        const correct = userAnswers.filter(a => a.isCorrect).length;
        const total = adventureData.quiz.length;
        return {
            score: Math.round((correct / total) * 100),
            correctAnswers: correct,
            incorrectAnswers: total - correct,
            totalQuestions: total,
            xp: correct * 10,
            gems: correct * 2,
        };
    }, [userAnswers, adventureData.quiz]);

    useEffect(() => {
        const generateSummary = async () => {
            try {
                const ai = getAIClient();
                const prompt = `A student just completed a quiz with a score of ${score}%. They got ${correctAnswers} correct and ${incorrectAnswers} incorrect. Write a short, fun, and encouraging summary of their performance. Frame it as if they just completed a grand quest.`;
                const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
                setAiSummary(response.text);
            } catch (error) {
                console.error("Error generating summary:", error);
                setAiSummary("You've bravely completed the quest! Every adventure teaches us something new. Great job!");
            } finally {
                setIsLoadingSummary(false);
            }
        };
        generateSummary();
    }, [score, correctAnswers, incorrectAnswers]);

    return (
        <div className="p-4 bg-gray-100 h-full overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="text-center">
                <h1 className="text-3xl font-bold text-gray-800">Quest Complete!</h1>
                <div className="mt-4 bg-white p-4 rounded-xl shadow-sm">
                    <div className="flex items-center space-x-2 text-teal-600">
                        <SparklesIcon className="h-5 w-5" />
                        <h2 className="font-bold">AI Summary</h2>
                    </div>
                    <blockquote className="mt-2 text-left p-3 bg-teal-50 border border-teal-200 rounded-lg">
                        {isLoadingSummary ? <p className="text-gray-600 italic">Calculating your epic performance...</p> : <p className="text-gray-700 italic">{aiSummary}</p>}
                    </blockquote>
                </div>
            </motion.div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 22 }} className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-2xl text-teal-600">{score}%</p><p className="text-xs text-gray-500">Score</p></motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 22 }} className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-2xl text-green-600">{correctAnswers}</p><p className="text-xs text-gray-500">Correct</p></motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 22 }} className="bg-white p-3 rounded-xl shadow-sm"><p className="font-bold text-2xl text-red-600">{incorrectAnswers}</p><p className="text-xs text-gray-500">Incorrect</p></motion.div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-white">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-yellow-400 p-3 rounded-xl shadow-sm"><p className="font-bold text-2xl">+{xp}</p><p className="text-xs font-semibold">XP Earned</p></motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-sky-400 p-3 rounded-xl shadow-sm"><p className="font-bold text-2xl">+{gems}</p><p className="text-xs font-semibold">Gems Found</p></motion.div>
            </div>

            <div className="mt-4">
                <h2 className="font-bold text-gray-700 mb-2">Review Your Answers</h2>
                <div className="space-y-2">
                    {adventureData.quiz.map((q, i) => {
                        const userAnswer = userAnswers.find(a => a.questionId === q.id);
                        const isCorrect = userAnswer?.isCorrect;
                        return (
                            <motion.div
                                key={q.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.04 }}
                                className={`p-3 rounded-lg shadow-sm ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}
                            >
                                <p className="font-semibold text-gray-800 flex items-start"><span className="mr-2">{isCorrect ? <CheckCircleIcon className="text-green-500 w-5 h-5" /> : <XCircleIcon className="text-red-500 w-5 h-5" />}</span>{q.question}</p>
                                {!isCorrect && (
                                    <div className="mt-2 pl-7 text-sm">
                                        <p className="text-gray-700">Your answer: <span className="font-semibold">{userAnswer?.answer}</span></p>
                                        <p className="text-gray-700">Correct answer: <span className="font-semibold">{q.correct_answer}</span></p>
                                        <p className="mt-1 p-2 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800">💡 {q.explanation}</p>
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            </div>

            <div className="mt-4">
                <h2 className="font-bold text-gray-700 mb-2">Explorer's Log</h2>
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                    <h3 className="text-lg font-bold text-teal-700 flex items-center space-x-2"><BookOpenIcon /><span>{adventureData.study_guide.title}</span></h3>
                    {adventureData.study_guide.sections.map((section, i) => (
                        <Accordion key={i} title={section.title}>{section.content}</Accordion>
                    ))}
                </div>
            </div>

            <div className="mt-6">
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onRestart} className="w-full py-3 text-lg font-bold text-white bg-teal-500 rounded-xl shadow-lg hover:bg-teal-600 transition-colors">
                    Start New Adventure
                </motion.button>
            </div>
        </div>
    );
};

export default ResultsScreen;
