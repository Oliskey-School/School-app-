
import React, { useState, useEffect, useCallback } from 'react';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import { Sword, Zap, Heart, Trophy, RefreshCw } from 'lucide-react';
import { api } from '../../../lib/api';
import confetti from 'canvas-confetti';

interface WordItem {
    id: number;
    text: string;
    isCorrect: boolean;
    x: number;
    y: number;
    speed: number;
}

const WORD_CATEGORIES = [
    {
        name: 'Action Verbs',
        words: ['Run', 'Jump', 'Think', 'Fly', 'Sing', 'Dance', 'Eat', 'Write'],
        distractors: ['Apple', 'Blue', 'Quickly', 'House', 'Table', 'Happy', 'Small']
    },
    {
        name: 'Proper Nouns',
        words: ['Nigeria', 'London', 'Lagos', 'Jupiter', 'Tuesday', 'January', 'Sango'],
        distractors: ['country', 'city', 'day', 'planet', 'month', 'river', 'man']
    },
    {
        name: 'Adjectives',
        words: ['Beautiful', 'Swift', 'Bright', 'Heavy', 'Cold', 'Silent', 'Rough'],
        distractors: ['Run', 'Table', 'He', 'Very', 'Under', 'And', 'Book']
    }
];

const VocabularyNinjaGame: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameOver'>('intro');
    const [category, setCategory] = useState(WORD_CATEGORIES[0]);
    const [fallingWords, setFallingWords] = useState<WordItem[]>([]);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameLoop, setGameLoop] = useState<number | null>(null);
    const { addXP } = useGamification();

    const spawnWord = useCallback(() => {
        const isCorrect = Math.random() > 0.4;
        const text = isCorrect
            ? category.words[Math.floor(Math.random() * category.words.length)]
            : category.distractors[Math.floor(Math.random() * category.distractors.length)];

        const newWord: WordItem = {
            id: Date.now(),
            text,
            isCorrect,
            x: Math.random() * 80 + 10, // 10% to 90%
            y: -50,
            speed: 2 + Math.random() * 3 + (score / 100) // Increase speed over time
        };

        setFallingWords(prev => [...prev, newWord]);
    }, [category, score]);

    const startGame = () => {
        const randomCat = WORD_CATEGORIES[Math.floor(Math.random() * WORD_CATEGORIES.length)];
        setCategory(randomCat);
        setScore(0);
        setLives(3);
        setFallingWords([]);
        setGameState('playing');
    };

    const handleWordClick = (word: WordItem) => {
        if (word.isCorrect) {
            setScore(prev => prev + 10);
            setFallingWords(prev => prev.filter(w => w.id !== word.id));
            if (score + 10 % 100 === 0) {
                // Flash effect or sound
            }
        } else {
            setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) {
                    setGameState('gameOver');
                    return 0;
                }
                return newLives;
            });
            setFallingWords(prev => prev.filter(w => w.id !== word.id));
        }
    };

    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            setFallingWords(prev => {
                const next = prev.map(w => ({ ...w, y: w.y + w.speed }));

                // Check for missed correct words
                const missed = next.filter(w => w.y > 600 && w.isCorrect);
                if (missed.length > 0) {
                    setLives(l => Math.max(0, l - missed.length));
                }

                const filtered = next.filter(w => w.y <= 600);

                if (lives <= 0 || (next.length > 0 && next.some(w => w.y > 600 && w.isCorrect && lives <= 1))) {
                    setGameState('gameOver');
                }

                return filtered;
            });

            if (Math.random() < 0.03) {
                spawnWord();
            }
        }, 16);

        return () => clearInterval(interval);
    }, [gameState, spawnWord, lives]);

    useEffect(() => {
        if (gameState === 'gameOver') {
            addXP(score);
            if (score > 100) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }

            // PERSIST TO DATABASE
            api.submitGameScore({
                game_id: 'vocabulary-ninja',
                game_name: 'Vocabulary Ninja',
                score: score,
                metadata: {
                    category: category.name,
                    finalScore: score
                }
            }).catch(err => console.error("Failed to save ninja score:", err));
        }
    }, [gameState, score, addXP]);

    return (
        <GameShell
            title="Vocabulary Ninja"
            onExit={onBack}
            score={score}
            isGameOver={gameState === 'gameOver'}
            onRestart={startGame}
        >
            <div className="h-full bg-slate-900 overflow-hidden relative font-sans">
                {/* HUD */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                    <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-full border border-slate-700 text-white flex items-center gap-2">
                        <Trophy className="text-yellow-400" size={18} />
                        <span className="font-bold">{score}</span>
                    </div>

                    <div className="bg-slate-800/80 backdrop-blur px-4 py-2 rounded-full border border-slate-700 text-white flex items-center gap-4">
                        <span className="text-xs uppercase font-bold text-slate-400">Target:</span>
                        <span className="text-pink-400 font-extrabold">{category.name}</span>
                    </div>

                    <div className="flex gap-2">
                        {[...Array(3)].map((_, i) => (
                            <Heart
                                key={i}
                                className={`${i < lives ? 'text-red-500 fill-red-500' : 'text-slate-700'} transition-colors`}
                                size={24}
                            />
                        ))}
                    </div>
                </div>

                {gameState === 'intro' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-white">
                        <div className="w-24 h-24 bg-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-pink-500/50 rotate-12">
                            <Sword size={48} className="text-white" />
                        </div>
                        <h2 className="text-4xl font-black mb-4">VOCABULARY NINJA</h2>
                        <p className="max-w-md text-slate-400 mb-8 leading-relaxed">
                            Slice through the words! Only tap the <span className="text-pink-400 font-bold">correct category</span> words. Miss 3 or hit a wrong one, and the mission fails!
                        </p>
                        <button
                            onClick={startGame}
                            className="bg-pink-500 hover:bg-pink-600 text-white px-10 py-4 rounded-2xl font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-pink-500/30"
                        >
                            BEGIN MISSION
                        </button>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="h-full w-full relative">
                        {fallingWords.map(word => (
                            <button
                                key={word.id}
                                onClick={() => handleWordClick(word)}
                                style={{
                                    left: `${word.x}%`,
                                    top: `${word.y}px`,
                                    transition: 'transform 0.1s ease-out'
                                }}
                                className="absolute -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg font-bold text-slate-900 border-b-4 border-slate-300 hover:scale-110 active:scale-90"
                            >
                                {word.text}
                            </button>
                        ))}
                    </div>
                )}

                {gameState === 'gameOver' && (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-white bg-slate-950/80 backdrop-blur-sm z-30 relative">
                        <h2 className="text-6xl font-black text-red-500 mb-2">MISSION FAILED</h2>
                        <p className="text-2xl font-bold mb-8">You scored {score} points!</p>

                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                            <button
                                onClick={startGame}
                                className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors"
                            >
                                <RefreshCw size={20} /> RETRY
                            </button>
                            <button
                                onClick={onBack}
                                className="bg-slate-800 text-white px-6 py-4 rounded-2xl font-black hover:bg-slate-700 transition-colors"
                            >
                                EXIT
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

export default VocabularyNinjaGame;
