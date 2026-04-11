import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Student } from '../../../types';
import { PlayIcon, PauseIcon, Calculator, Timer, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { api } from '../../../lib/api';

interface MathSprintGameScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    student?: Student;
}

type GameState = 'start' | 'playing' | 'paused' | 'finished';

const MathSprintGameScreen: React.FC<MathSprintGameScreenProps> = ({ navigateTo, student }) => {
    // Game State
    const [gameState, setGameState] = useState<GameState>('start');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [streak, setStreak] = useState(0);
    const [comboMultiplier, setComboMultiplier] = useState(1);

    // Problem State
    const [problem, setProblem] = useState({ equation: '2 + 2', answer: 4, options: [3, 4, 5, 2] });
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    // Audio Refs (Using simple beep sounds for now, can be replaced with assets)
    // In a real app, use Howler.js or actual asset URLs.

    useEffect(() => {
        // Init logic
        if (gameState === 'playing' && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setGameState('finished');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        } else if (gameState === 'finished') {
            // Save score to database
            if (score > 0) {
                api.submitGameScore({
                    game_id: 'math-sprint',
                    game_name: 'Math Sprint',
                    score: score,
                    metadata: {
                        streak,
                        accuracy: Math.round((streak / (streak + 3)) * 100), // Placeholder logic
                        grade: student?.grade
                    }
                }).catch(err => console.error('Failed to save score:', err));
            }

            // Navigate to results after a short delay
            setTimeout(() => {
                navigateTo('mathSprintResults', 'Game Over', { score, questionsAnswered: streak }); 
            }, 2000);
        }
    }, [gameState, timeLeft, navigateTo, score, streak, student]);

    const generateProblem = useCallback(() => {
        const grade = student?.grade || 5;
        const difficulty = Math.min(Math.ceil(grade / 3) + Math.floor(score / 500), 10); // Dynamic difficulty

        let num1 = Math.floor(Math.random() * (10 * difficulty)) + 1;
        let num2 = Math.floor(Math.random() * (10 * difficulty)) + 1;
        const operator = ['+', '-', '*'][Math.floor(Math.random() * (grade > 3 ? 3 : 2))]; // No mult for low grades initially

        let answer = 0;
        let equation = '';

        if (operator === '+') {
            answer = num1 + num2;
            equation = `${num1} + ${num2}`;
        } else if (operator === '-') {
            if (num1 < num2) [num1, num2] = [num2, num1]; // Ensure positive
            answer = num1 - num2;
            equation = `${num1} - ${num2}`;
        } else {
            // Simplified multiplication for playability
            num1 = Math.floor(Math.random() * 12) + 1;
            num2 = Math.floor(Math.random() * 12) + 1;
            answer = num1 * num2;
            equation = `${num1} × ${num2}`;
        }

        // Generate Options
        const options = new Set<number>();
        options.add(answer);
        while (options.size < 4) {
            const offset = Math.floor(Math.random() * 10) - 5;
            const wrong = answer + offset;
            if (wrong !== answer && wrong >= 0) options.add(wrong);
        }

        setProblem({
            equation,
            answer,
            options: Array.from(options).sort(() => Math.random() - 0.5)
        });
    }, [student, score]);

    // Initial problem
    useEffect(() => {
        if (gameState === 'playing') generateProblem();
    }, [gameState, generateProblem]);

    const handleAnswer = (selected: number) => {
        if (selected === problem.answer) {
            // Correct
            const points = 10 * comboMultiplier;
            setScore(s => s + points);
            setStreak(s => s + 1);
            if (streak > 0 && streak % 3 === 0) setComboMultiplier(m => Math.min(m + 1, 5));
            setFeedback('correct');
            // Add time bonus for every 5 streak
            if (streak > 0 && streak % 5 === 0) {
                setTimeLeft(t => t + 5);
                toast.success('+5 Seconds!', { icon: '⏱️' });
            }
        } else {
            // Wrong
            setStreak(0);
            setComboMultiplier(1);
            setFeedback('wrong');
            // Penalty? Maybe visual only to keep it fun.
            toast.error('Oops! Try again.');
        }

        setTimeout(() => {
            setFeedback(null);
            generateProblem();
        }, 300);
    };

    const startGame = () => {
        setScore(0);
        setTimeLeft(60);
        setStreak(0);
        setComboMultiplier(1);
        setGameState('playing');
    };

    if (gameState === 'start') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 text-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <Calculator className="w-12 h-12 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">Math Sprint</h1>
                <p className="text-lg text-indigo-100 mb-8 max-w-md">Race against the clock! Solve as many problems as possible in 60 seconds.</p>

                <div className="bg-white/10 p-4 rounded-xl mb-8 backdrop-blur-sm">
                    <p className="font-semibold text-yellow-300">🔥 Streak Bonus</p>
                    <p className="text-sm">Get answers right in a row to multiply your score!</p>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => navigateTo('gamesHub', 'Games Hub')} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition">Back</button>
                    <button onClick={startGame} className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg transform hover:scale-105 transition-all text-xl flex items-center gap-2">
                        <PlayIcon className="fill-current" /> Start Game
                    </button>
                </div>
            </div>
        );
    }

    if (gameState === 'finished') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-indigo-900 to-purple-900 text-white p-6 text-center">
                <Trophy className="w-24 h-24 text-yellow-400 mb-4 animate-pulse" />
                <h2 className="text-3xl font-bold mb-2">Time's Up!</h2>
                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-orange-500 mb-4">{score}</div>
                <p className="text-xl text-indigo-200 mb-8">Great job, {student?.name.split(' ')[0] || 'Champion'}!</p>
                <div className="flex gap-4">
                    <button onClick={() => navigateTo('gamesHub', 'Games Hub')} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold transition">Exit</button>
                    <button onClick={startGame} className="px-8 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg transition transform hover:scale-105">Play Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden relative touch-none select-none">
            {/* Background Effects */}
            <div className={`absolute inset-0 transition-colors duration-300 ${feedback === 'correct' ? 'bg-green-500/20' : feedback === 'wrong' ? 'bg-red-500/20' : 'bg-gradient-to-b from-slate-900 to-slate-800'}`}></div>

            {/* Header */}
            <div className="flex justify-between items-center p-4 lg:p-6 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
                        <span className="font-black text-lg lg:text-xl text-yellow-400">{comboMultiplier}x</span>
                    </div>
                    <div>
                        <p className="text-[10px] lg:text-xs text-slate-400 uppercase font-bold tracking-wider">Score</p>
                        <p className="text-xl lg:text-2xl font-bold font-mono text-white">{score}</p>
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <div className="text-3xl lg:text-4xl font-black font-mono tracking-wider flex items-center gap-2 drop-shadow-lg">
                        <Timer className={`w-5 h-5 lg:w-6 lg:h-6 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-sky-400'}`} />
                        <span className={timeLeft < 10 ? 'text-red-400' : 'text-white'}>{timeLeft}</span>
                    </div>
                    <div className="w-24 lg:w-32 h-1.5 lg:h-2 bg-slate-800/50 rounded-full mt-2 overflow-hidden backdrop-blur-sm border border-white/5">
                        <div
                            className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 10 ? 'bg-red-500' : 'bg-sky-500'}`}
                            style={{ width: `${(timeLeft / 60) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <button onClick={() => setGameState('start')} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition backdrop-blur-md active:scale-95">
                    <PauseIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Main Game Area - Using Flex-1 to fill space evenly */}
            <div className="flex-1 flex flex-col items-center justify-evenly p-4 z-10 w-full max-w-2xl mx-auto">

                {/* Visual Feedback for Streak */}
                <div className="h-8 flex items-center justify-center">
                    {streak > 2 && (
                        <div className="text-orange-400 font-bold animate-bounce tracking-widest uppercase text-sm lg:text-base border border-orange-500/30 px-3 py-1 rounded-full bg-orange-500/10">
                            {streak} Streak! 🔥
                        </div>
                    )}
                </div>

                {/* Equation Card */}
                <div className="w-full flex justify-center mb-4">
                    <div className="bg-white/5 backdrop-blur-xl px-6 py-8 lg:px-12 lg:py-12 rounded-3xl border border-white/10 shadow-2xl w-full text-center hover:bg-white/10 transition-colors">
                        <span className="text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-widest font-mono drop-shadow-xl block">
                            {problem.equation}
                        </span>
                        <div className="mt-4 text-slate-400 text-2xl font-bold">= ?</div>
                    </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-3 lg:gap-6 w-full">
                    {problem.options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(opt)}
                            className="h-20 sm:h-24 lg:h-32 bg-gradient-to-b from-white to-slate-100 text-slate-900 rounded-2xl text-3xl sm:text-4xl lg:text-5xl font-bold shadow-xl shadow-black/20 hover:from-indigo-50 hover:to-white hover:scale-[1.02] active:scale-95 transition-all border-b-4 border-slate-300 active:border-b-0 active:translate-y-1"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3 text-center text-slate-500 text-xs lg:text-sm shrink-0 bg-slate-900/50 backdrop-blur-sm border-t border-white/5">
                Stats: {streak} Streak • Level {Math.min(Math.ceil((student?.grade || 5) / 3) + Math.floor(score / 500), 10)}
            </div>
        </div>
    );
};

export default MathSprintGameScreen;
