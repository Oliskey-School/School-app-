import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { AnchorIcon, ShipIcon, Volume2Icon } from 'lucide-react';

interface AlphabetFishingGameProps {
    onBack: () => void;
}

interface Fish {
    id: string;
    letter: string;
    x: number; // percentage
    y: number; // percentage
    direction: 1 | -1; // 1 = right, -1 = left
    speed: number;
    color: string;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
const FISH_COLORS = ['bg-orange-400', 'bg-blue-400', 'bg-pink-400', 'bg-purple-400', 'bg-red-400', 'bg-green-400'];

const AlphabetFishingGame: React.FC<AlphabetFishingGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
    const [score, setScore] = useState(0);
    const [targetLetter, setTargetLetter] = useState('');
    const [fishes, setFishes] = useState<Fish[]>([]);
    const [caughtFish, setCaughtFish] = useState<Fish | null>(null); // For animation

    // Game Loop
    const spawnRef = useRef<NodeJS.Timeout | null>(null);
    const moveRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (gameState === 'PLAYING') {
            startGameLoop();
        }
        return () => cleanup();
    }, [gameState]);

    const cleanup = () => {
        if (spawnRef.current) clearInterval(spawnRef.current);
        if (moveRef.current) clearInterval(moveRef.current);
        window.speechSynthesis.cancel();
    };

    const startGameLoop = () => {
        // Initial spawn
        spawnFishBatch(5);
        pickNewTarget();

        // Movement Loop
        moveRef.current = setInterval(() => {
            setFishes(prev => prev.map(fish => {
                let newX = fish.x + (fish.speed * fish.direction * 0.1);

                // Wrap around or bounce? Wrap is better for natural flow
                if (newX > 110 && fish.direction === 1) newX = -10;
                if (newX < -10 && fish.direction === -1) newX = 110;

                return { ...fish, x: newX };
            }));
        }, 50);

        // Spawn Loop to replace or add density
        spawnRef.current = setInterval(() => {
            setFishes(prev => {
                if (prev.length < 8) {
                    return [...prev, createFish()];
                }
                return prev;
            });
        }, 2000);
    };

    const createFish = (forcedLetter?: string): Fish => {
        const letter = forcedLetter || LETTERS[Math.floor(Math.random() * LETTERS.length)];
        const direction = Math.random() > 0.5 ? 1 : -1;
        return {
            id: Math.random().toString(36).substr(2, 9),
            letter,
            x: direction === 1 ? -15 : 115,
            y: Math.random() * 60 + 20, // 20% to 80% height
            direction,
            speed: Math.random() * 2 + 1,
            color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)]
        };
    };

    const spawnFishBatch = (count: number) => {
        const newFishes: Fish[] = [];
        for (let i = 0; i < count; i++) {
            const f = createFish();
            f.x = Math.random() * 80 + 10; // Random start pos
            newFishes.push(f);
        }
        setFishes(newFishes);
    };

    const pickNewTarget = () => {
        const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        setTargetLetter(letter);
        setFishes(prev => {
            // Ensure at least one fish has the target letter
            const exists = prev.some(f => f.letter === letter);
            if (!exists) {
                return [...prev, createFish(letter)];
            }
            return prev;
        });

        speak(`Catch the letter ${letter}!`);
    };

    const handleFishClick = (fish: Fish) => {
        if (gameState !== 'PLAYING') return;

        if (fish.letter === targetLetter) {
            // Success
            setCaughtFish(fish);
            setScore(prev => prev + 10);
            setFishes(prev => prev.filter(f => f.id !== fish.id));

            speak(`${fish.letter}! Correct!`);

            // Reeling animation delay
            setTimeout(() => {
                setCaughtFish(null);
                if (score > 0 && score % 100 === 0) {
                    addXP(25);
                    unlockBadge('master-angler');
                }
                pickNewTarget();
            }, 1000);

        } else {
            // Wrong
            speak(`That is ${fish.letter}. Try finding ${targetLetter}.`);
            setScore(prev => Math.max(0, prev - 5));
        }
    };

    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    return (
        <GameShell
            title="Alphabet Fishing"
            onExit={onBack}
            score={score}
            isGameOver={gameState === 'GAMEOVER'}
            onRestart={() => { setScore(0); setGameState('PLAYING'); }}
        >
            <div className="h-full w-full bg-cyan-900 relative overflow-hidden cursor-crosshair">
                {/* Background Water Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-400 to-blue-900 opacity-80" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

                {/* Sunbeams */}
                <div className="absolute top-0 left-1/4 w-32 h-[120%] bg-white/10 rotate-12 blur-xl" />
                <div className="absolute top-0 right-1/4 w-20 h-[120%] bg-white/5 -rotate-12 blur-xl" />

                {/* Target Display */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur border-4 border-yellow-400 px-8 py-3 rounded-full shadow-lg flex items-center gap-4">
                    <span className="text-gray-500 font-bold uppercase text-sm">Find:</span>
                    <span className="text-5xl font-black text-blue-600">{targetLetter}</span>
                    <button onClick={() => speak(targetLetter)} className="p-2 bg-blue-100 rounded-full hover:bg-blue-200">
                        <Volume2Icon className="text-blue-600 w-6 h-6" />
                    </button>
                </div>

                {/* Fishes */}
                <div className="absolute inset-0 z-10 w-full h-full">
                    <AnimatePresence>
                        {fishes.map(fish => (
                            <FishComponent key={fish.id} fish={fish} onClick={() => handleFishClick(fish)} />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Caught Animation Overlay */}
                <AnimatePresence>
                    {caughtFish && (
                        <motion.div
                            initial={{ x: `${caughtFish.x}%`, y: `${caughtFish.y}%`, scale: 1 }}
                            animate={{ y: '-20%', scale: 1.5, rotate: 360 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute z-30 pointer-events-none"
                        >
                            {/* Fishing Line */}
                            <div className="absolute bottom-full left-1/2 w-0.5 h-[100vh] bg-white opacity-50" />
                            <div className={`${caughtFish.color} w-24 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-xl relative`}>
                                <span className="text-4xl font-black text-white">{caughtFish.letter}</span>
                                {/* Fish Tail */}
                                <div className={`absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 ${caughtFish.color} rounded-r-xl rotate-45 -z-10`} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Start Screen */}
                {gameState === 'START' && (
                    <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setGameState('PLAYING')}
                            className="bg-blue-600 text-white px-12 py-6 rounded-3xl font-black text-3xl shadow-xl flex items-center gap-4 border-b-8 border-blue-800"
                        >
                            <AnchorIcon size={48} />
                            Cast Off!
                        </motion.button>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

const FishComponent: React.FC<{ fish: Fish; onClick: () => void }> = ({ fish, onClick }) => {
    return (
        <motion.button
            onClick={onClick}
            animate={{ left: `${fish.x}%`, top: `${fish.y}%` }}
            transition={{ duration: 0, ease: 'linear' }} // Manual updates via parent timer
            className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{
                width: '100px',
                height: '70px',
                transform: `scaleX(${fish.direction === 1 ? -1 : 1})` // Flip based on direction
            }}
        >
            <div className={`w-full h-full ${fish.color} rounded-full relative flex items-center justify-center border-4 border-white/20 shadow-md transition-transform group-hover:scale-110 group-active:scale-95`}>
                <span className="text-4xl font-black text-white drop-shadow-md select-none" style={{ transform: `scaleX(${fish.direction === 1 ? -1 : 1})` }}>
                    {fish.letter}
                </span>

                {/* Eye */}
                <div className="absolute top-3 left-4 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-black rounded-full" />
                </div>

                {/* Tail */}
                <div className={`absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 ${fish.color} rotate-45 rounded-sm -z-10 animate-pulse`} />

                {/* Fin */}
                <div className={`absolute top-0 right-8 w-6 h-4 ${fish.color} rounded-t-lg -mt-3 brightness-90`} />
            </div>
        </motion.button>
    );
};

export default AlphabetFishingGame;
