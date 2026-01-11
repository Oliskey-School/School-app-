import React, { useState, useEffect } from 'react';
import { XIcon, PauseIcon, PlayIcon, RefreshCwIcon, TrophyIcon } from 'lucide-react';
import { useGamification } from '../../../context/GamificationContext';

interface GameShellProps {
    title: string;
    onExit: () => void;
    children: React.ReactNode;
    score?: number;
    timer?: number; // seconds
    isGameOver?: boolean;
    onRestart?: () => void;
}

const GameShell: React.FC<GameShellProps> = ({ title, onExit, children, score = 0, timer, isGameOver, onRestart }) => {
    const { xp, level, addXP } = useGamification();
    const [paused, setPaused] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timer || 0);

    // Timer Logic
    useEffect(() => {
        if (!timer || paused || isGameOver) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer, paused, isGameOver]);

    return (
        <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col text-white">
            {/* Game Header */}
            <div className="h-16 bg-slate-800 flex items-center justify-between px-4 sm:px-6 shadow-md z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400 hover:text-white" />
                    </button>
                    <div>
                        <h2 className="font-bold text-lg leading-tight">{title}</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><TrophyIcon className="w-3 h-3 text-yellow-500" /> Lvl {level}</span>
                            <span>•</span>
                            <span>{xp} XP</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Score Display */}
                    <div className="px-4 py-1 bg-slate-700 rounded-full font-mono font-bold text-yellow-400 border border-slate-600">
                        {score.toLocaleString()} pts
                    </div>

                    {/* Timer Display */}
                    {timer !== undefined && (
                        <div className={`px-3 py-1 rounded-full font-mono font-bold ${timeLeft < 10 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-cyan-400'}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    )}

                    {/* Pause Button */}
                    {!isGameOver && (
                        <button onClick={() => setPaused(!paused)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors">
                            {paused ? <PlayIcon className="w-5 h-5 text-green-400" /> : <PauseIcon className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Game Content Area */}
            <div className="flex-1 relative overflow-hidden bg-slate-900">
                {paused && (
                    <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold mb-4">Game Paused</h2>
                            <button onClick={() => setPaused(false)} className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105 active:scale-95">
                                Resume Game
                            </button>
                        </div>
                    </div>
                )}

                {children}

                {/* Game Over Overlay */}
                {isGameOver && (
                    <div className="absolute inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
                        <TrophyIcon className="w-20 h-20 text-yellow-400 mb-6 drop-shadow-lg" />
                        <h2 className="text-4xl font-extrabold text-white mb-2">Game Over!</h2>
                        <p className="text-slate-400 mb-8 text-lg">You scored <span className="text-yellow-400 font-bold">{score}</span> points</p>

                        <div className="flex gap-4">
                            <button onClick={onExit} className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all">
                                Exit
                            </button>
                            {onRestart && (
                                <button onClick={onRestart} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-105">
                                    <RefreshCwIcon className="w-5 h-5" />
                                    Play Again
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameShell;
