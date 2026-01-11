import React, { useState, useEffect, useRef } from 'react';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { SwordsIcon, ShieldIcon, ZapIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface MathBattleArenaGameProps {
    onBack: () => void;
}

const DIFFICULTIES = {
    EASY: { min: 1, max: 10, ops: ['+'] },
    MEDIUM: { min: 1, max: 20, ops: ['+', '-'] },
    HARD: { min: 5, max: 50, ops: ['+', '-', '*'] },
};

const MathBattleArenaGame: React.FC<MathBattleArenaGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);

    // Question State
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState(0);
    const [options, setOptions] = useState<number[]>([]);
    const [streak, setStreak] = useState(0);
    const [qTimer, setQTimer] = useState(10); // Per-question timer

    // Visuals
    const [playerHealth, setPlayerHealth] = useState(100);
    const [enemyHealth, setEnemyHealth] = useState(100);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const qTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Global Game Timer
    useEffect(() => {
        if (gameState === 'PLAYING') {
            generateQuestion();
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (qTimerRef.current) clearInterval(qTimerRef.current);
        };
    }, [gameState]);

    // Question Timer
    useEffect(() => {
        if (gameState === 'PLAYING') {
            if (qTimerRef.current) clearInterval(qTimerRef.current);
            qTimerRef.current = setInterval(() => {
                setQTimer(prev => {
                    if (prev <= 0) {
                        handleTimeout();
                        return 10;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (qTimerRef.current) clearInterval(qTimerRef.current);
        };
    }, [gameState, question]); // Reset when question changes

    const handleTimeout = () => {
        setStreak(0);
        setPlayerHealth(prev => {
            const newHealth = Math.max(0, prev - 20);
            if (newHealth <= 0) {
                endGame();
            }
            return newHealth;
        });
        generateQuestion();
    };

    const generateQuestion = () => {
        setQTimer(10); // Reset timer
        const difficulty = streak > 5 ? DIFFICULTIES.HARD : streak > 2 ? DIFFICULTIES.MEDIUM : DIFFICULTIES.EASY;
        const op = difficulty.ops[Math.floor(Math.random() * difficulty.ops.length)];
        const n1 = Math.floor(Math.random() * (difficulty.max - difficulty.min + 1)) + difficulty.min;
        const n2 = Math.floor(Math.random() * (difficulty.max - difficulty.min + 1)) + difficulty.min;

        let ans = 0;
        let qStr = "";

        switch (op) {
            case '+': ans = n1 + n2; qStr = `${n1} + ${n2}`; break;
            case '-': ans = n1 - n2; qStr = `${n1} - ${n2}`; break;
            case '*': ans = n1 * n2; qStr = `${n1} × ${n2}`; break;
        }

        setQuestion(qStr);
        setAnswer(ans);

        // Generate options
        const opts = new Set<number>();
        opts.add(ans);
        while (opts.size < 4) {
            const offset = Math.floor(Math.random() * 10) - 5;
            const fake = ans + offset;
            if (fake !== ans && fake >= 0) opts.add(fake);
        }
        setOptions(Array.from(opts).sort(() => Math.random() - 0.5));
    };

    const handleAnswer = (selected: number) => {
        if (selected === answer) {
            // Correct
            setScore(prev => prev + (10 * (streak + 1)));
            setStreak(prev => prev + 1);
            setEnemyHealth(prev => Math.max(0, prev - 10));
            addXP(2);

            // Visual feedback
            if (enemyHealth <= 10) {
                setEnemyHealth(100); // Respawn enemy
                addXP(20);
                setTimeLeft(prev => Math.min(prev + 5, 60)); // Bonus time
            }
            generateQuestion();
        } else {
            // Incorrect
            setStreak(0);
            setPlayerHealth(prev => Math.max(0, prev - 20));
            if (playerHealth <= 20) {
                endGame();
            }
        }
    };

    const endGame = () => {
        setGameState('GAMEOVER');
        if (timerRef.current) clearInterval(timerRef.current);
        if (qTimerRef.current) clearInterval(qTimerRef.current);
        if (score > 100) unlockBadge('math-whiz');
        confetti({ origin: { y: 0.8 } });
    };

    const restartGame = () => {
        setScore(0);
        setTimeLeft(60);
        setPlayerHealth(100);
        setEnemyHealth(100);
        setStreak(0);
        setQTimer(10);
        setGameState('PLAYING');
    };

    return (
        <GameShell
            title="Math Battle Arena"
            onExit={onBack}
            score={score}
            timer={gameState === 'PLAYING' ? timeLeft : undefined}
            isGameOver={gameState === 'GAMEOVER'}
            onRestart={restartGame}
        >
            <div className="h-full bg-slate-800 p-4 flex flex-col items-center relative overflow-hidden">
                {/* Battle Scene */}
                <div className="w-full max-w-4xl flex justify-between items-end mb-8 px-8 h-64 relative">

                    {/* Player */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-32 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600">
                            <motion.div
                                className="h-full bg-green-500"
                                animate={{ width: `${playerHealth}%` }}
                            />
                        </div>
                        <motion.div
                            animate={{ scale: gameState === 'PLAYING' ? [1, 1.05, 1] : 1 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="text-6xl"
                        >
                            🛡️
                        </motion.div>
                        <span className="text-white font-bold">You</span>
                    </div>

                    {/* VS */}
                    <div className="text-4xl font-black text-white/20">VS</div>

                    {/* Enemy */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-32 bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600">
                            <motion.div
                                className="h-full bg-red-500"
                                animate={{ width: `${enemyHealth}%` }}
                            />
                        </div>
                        <motion.div
                            animate={{
                                x: gameState === 'PLAYING' ? [0, -10, 0] : 0,
                                rotate: gameState === 'PLAYING' ? [0, -5, 5, 0] : 0
                            }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="text-6xl"
                        >
                            👾
                        </motion.div>
                        <span className="text-red-400 font-bold">Math Monger</span>
                    </div>
                </div>

                {/* Question Area */}
                {gameState === 'START' ? (
                    <button
                        onClick={() => setGameState('PLAYING')}
                        className="px-12 py-6 bg-orange-600 hover:bg-orange-500 text-white text-2xl font-bold rounded-2xl shadow-xl hover:scale-105 transition-all"
                    >
                        Start Battle! ⚔️
                    </button>
                ) : (
                    <div className="w-full max-w-2xl bg-slate-700/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-600">
                        <div className="text-center mb-8">
                            <h3 className="text-5xl font-black text-white mb-4 font-mono">{question} = ?</h3>

                            {/* Timer Bar */}
                            <div className="w-full max-w-md mx-auto h-2 bg-slate-600 rounded-full overflow-hidden mb-4">
                                <motion.div
                                    className="h-full bg-yellow-400"
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(qTimer / 10) * 100}%` }}
                                    transition={{ duration: 1, ease: "linear" }}
                                />
                            </div>

                            <div className="flex justify-center gap-1 h-4">
                                {[...Array(streak)].map((_, i) => (
                                    <ZapIcon key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {options.map((opt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(opt)}
                                    className="p-6 bg-slate-600 hover:bg-indigo-600 text-white text-3xl font-bold rounded-xl transition-colors shadow-lg border-b-4 border-slate-800 hover:border-indigo-800 active:border-b-0 active:translate-y-1"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

export default MathBattleArenaGame;
