import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { MapIcon, CheckIcon, LockIcon, StarIcon, ScrollIcon } from 'lucide-react';

interface VocabularyAdventureGameProps {
    onBack: () => void;
}

interface Level {
    id: number;
    title: string;
    description: string;
    x: number; // % position
    y: number; // % position
    puzzles: Puzzle[];
    bgGradient: string;
}

interface Puzzle {
    id: number;
    type: 'definition' | 'fill-blank';
    question: string;
    options: string[];
    correctAnswer: string;
}

const LEVELS: Level[] = [
    {
        id: 1,
        title: "Whispering Woods",
        description: "Start your journey in the quiet forest.",
        x: 20, y: 80,
        bgGradient: "from-green-800 to-green-600",
        puzzles: [
            {
                id: 101,
                type: 'definition',
                question: "Which word means 'extremely happy'?",
                options: ["Sad", "Elated", "Angry", "Bored"],
                correctAnswer: "Elated"
            },
            {
                id: 102,
                type: 'fill-blank',
                question: "The cat sat on the _____.",
                options: ["Mat", "Ocean", "Cloud", "Sun"],
                correctAnswer: "Mat"
            }
        ]
    },
    {
        id: 2,
        title: "Rushing River",
        description: "Cross the dangerous waters.",
        x: 40, y: 50,
        bgGradient: "from-blue-700 to-cyan-500",
        puzzles: [
            {
                id: 201,
                type: 'definition',
                question: "What is a 'synonym' for fast?",
                options: ["Slow", "Rapid", "Heavy", "Tall"],
                correctAnswer: "Rapid"
            },
            {
                id: 202,
                type: 'fill-blank',
                question: "He ran so fast he was out of _____.",
                options: ["Money", "Breath", "Time", "Shoes"],
                correctAnswer: "Breath"
            }
        ]
    },
    {
        id: 3,
        title: "Crystal Cave",
        description: "Find the hidden gems of knowledge.",
        x: 70, y: 60,
        bgGradient: "from-purple-800 to-indigo-600",
        puzzles: [
            {
                id: 301,
                type: 'definition',
                question: "A person who writes books is an _____.",
                options: ["Author", "Artist", "Actor", "Athlete"],
                correctAnswer: "Author"
            },
            {
                id: 302,
                type: 'fill-blank',
                question: "Please _____ the door when you leave.",
                options: ["Open", "Break", "Close", "Eat"],
                correctAnswer: "Close"
            }
        ]
    },
    {
        id: 4,
        title: "Sky Fortress",
        description: "The final challenge awaits in the clouds.",
        x: 80, y: 20,
        bgGradient: "from-sky-700 to-blue-300",
        puzzles: [
            {
                id: 401,
                type: 'definition',
                question: "Which word is the opposite of 'Victory'?",
                options: ["Win", "Success", "Defeat", "Trophy"],
                correctAnswer: "Defeat"
            },
            {
                id: 402,
                type: 'fill-blank',
                question: "The _____ shone brightly in the night sky.",
                options: ["Sun", "Moon", "Car", "Tree"],
                correctAnswer: "Moon"
            }
        ]
    }
];

const VocabularyAdventureGame: React.FC<VocabularyAdventureGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [currentLevelId, setCurrentLevelId] = useState(1); // The level the player IS AT (unlocked)
    const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);
    const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
    const [puzzleIndex, setPuzzleIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showMap, setShowMap] = useState(true);
    const [levelComplete, setLevelComplete] = useState(false);

    // Audio
    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const handleLevelClick = (level: Level) => {
        if (level.id > maxUnlockedLevel) {
            // Locked
            // Shake animation?
            return;
        }

        // Travel to level
        setCurrentLevelId(level.id);

        if (level.id === maxUnlockedLevel && !levelComplete) {
            // Current frontier - start puzzles
            setTimeout(() => {
                startLevel(level);
            }, 1000); // Wait for travel anim
        }
    };

    const startLevel = (level: Level) => {
        setShowMap(false);
        setPuzzleIndex(0);
        setActivePuzzle(level.puzzles[0]);
        speak(level.description);
    };

    const handleAnswer = (answer: string) => {
        if (!activePuzzle) return;

        if (activePuzzle.options.length > 0) {
            // Multiple Choice
            if (answer === activePuzzle.correctAnswer) {
                handleCorrect();
            } else {
                handleIncorrect();
            }
        }
    };

    const handleCorrect = () => {
        speak("Correct!");
        const currentLevel = LEVELS.find(l => l.id === currentLevelId);
        if (!currentLevel) return;

        if (puzzleIndex + 1 < currentLevel.puzzles.length) {
            // Next puzzle in level
            setPuzzleIndex(prev => prev + 1);
            setActivePuzzle(currentLevel.puzzles[puzzleIndex + 1]);
        } else {
            // Level Complete
            handleLevelComplete();
        }
    };

    const handleIncorrect = () => {
        speak("Try again.");
    };

    const handleLevelComplete = () => {
        setLevelComplete(true);
        setScore(prev => prev + 100);
        addXP(50);
        confetti({ particleCount: 100, spread: 70 });
        speak("Level Complete!");

        setTimeout(() => {
            setShowMap(true); // Return to map

            // Unlock next level logic
            if (currentLevelId < LEVELS.length) {
                setMaxUnlockedLevel(currentLevelId + 1);
                setCurrentLevelId(currentLevelId + 1); // Auto move to next? Or let user click? Let's move.
            } else {
                // Game Won
                unlockBadge('explorer-legend');
            }
        }, 2000);
    };

    const currentLevelData = LEVELS.find(l => l.id === currentLevelId);

    return (
        <GameShell
            title="Vocabulary Adventure"
            onExit={onBack}
            score={score}
            isGameOver={false}
            onRestart={() => { }}
        >
            <div className="h-full w-full relative bg-slate-900 overflow-hidden font-sans">

                {/* MAP VIEW */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ${showMap ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    {/* Map Background */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')] opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/50 to-slate-900/50" />

                    {/* Paths (SVG Lines) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {LEVELS.map((level, i) => {
                            if (i === LEVELS.length - 1) return null;
                            const next = LEVELS[i + 1];
                            return (
                                <line
                                    key={i}
                                    x1={`${level.x}%`} y1={`${level.y}%`}
                                    x2={`${next.x}%`} y2={`${next.y}%`}
                                    stroke={maxUnlockedLevel > level.id ? "#FBBF24" : "#4B5563"}
                                    strokeWidth="4"
                                    strokeDasharray="10,5"
                                    className="drop-shadow-sm transition-colors duration-1000"
                                />
                            );
                        })}
                    </svg>

                    {/* Nodes */}
                    {LEVELS.map((level) => {
                        const isUnlocked = level.id <= maxUnlockedLevel;
                        const isCurrent = level.id === currentLevelId;
                        const isCompleted = level.id < maxUnlockedLevel;

                        return (
                            <div
                                key={level.id}
                                onClick={() => handleLevelClick(level)}
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-all duration-300 ${isCurrent ? 'scale-110 z-20' : 'scale-100 z-10'} ${!isUnlocked && 'opacity-60 grayscale'}`}
                                style={{ left: `${level.x}%`, top: `${level.y}%` }}
                            >
                                <motion.div
                                    whileHover={isUnlocked ? { scale: 1.1, translateY: -5 } : {}}
                                    className={`w-16 h-16 rounded-full border-4 shadow-xl flex items-center justify-center ${isCompleted ? 'bg-green-500 border-green-300' :
                                            isUnlocked ? 'bg-amber-500 border-amber-300 animate-pulse' :
                                                'bg-gray-700 border-gray-600'
                                        }`}
                                >
                                    {isCompleted ? <CheckIcon className="text-white w-8 h-8" /> :
                                        !isUnlocked ? <LockIcon className="text-gray-400 w-8 h-8" /> :
                                            <MapIcon className="text-white w-8 h-8" />}
                                </motion.div>

                                <div className={`mt-2 px-3 py-1 rounded-lg text-sm font-bold shadow-md whitespace-nowrap ${isUnlocked ? 'bg-white text-slate-900' : 'bg-gray-800 text-gray-500'
                                    }`}>
                                    {level.title}
                                </div>
                            </div>
                        );
                    })}

                    {/* Player Character Token */}
                    {/* Animate this moving between nodes coordinates */}
                    <motion.div
                        className="absolute w-12 h-12 bg-blue-500 rounded-full border-4 border-white shadow-[0_0_20px_blue] z-30 flex items-center justify-center pointer-events-none"
                        animate={{
                            left: `${currentLevelData?.x}%`,
                            top: `${currentLevelData?.y}%`
                        }}
                        transition={{ type: "spring", stiffness: 50, damping: 20 }}
                        style={{ marginLeft: "-1.5rem", marginTop: "-1.5rem" }} // Center anchor adjustment because left/top are top-left based usually, but we want center. Wait, motion handles this if we use x/y translate. Let's stick effectively.
                    >
                        <span className="text-2xl">🧙‍♂️</span>
                    </motion.div>

                    {/* HUD */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md p-4 rounded-xl text-white max-w-xs">
                        <h3 className="font-bold text-amber-400 uppercase tracking-wider text-xs">Current Mission</h3>
                        <p className="text-lg font-medium">{currentLevelData?.description}</p>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        {maxUnlockedLevel <= LEVELS.length ? (
                            <button onClick={() => startLevel(LEVELS.find(l => l.id === maxUnlockedLevel)!)} className="bg-amber-500 hover:bg-amber-400 text-black px-8 py-3 rounded-full font-bold shadow-lg animate-bounce">
                                {maxUnlockedLevel === 1 ? 'Start Journey' : 'Continue Adventure'}
                            </button>
                        ) : (
                            <div className="bg-green-500 px-6 py-2 rounded-full text-white font-bold">Journey Complete!</div>
                        )}
                    </div>
                </div>

                {/* PUZZLE VIEW */}
                <div className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center p-4 bg-gradient-to-br ${currentLevelData?.bgGradient} ${!showMap ? 'opacity-100 z-20' : 'opacity-0 z-0 pointer-events-none'}`}>
                    {activePuzzle && (
                        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-2xl w-full text-center border-4 border-white/50">
                            <div className="flex justify-between items-center mb-8">
                                <span className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                                    Puzzle {puzzleIndex + 1} / {currentLevelData?.puzzles.length}
                                </span>
                                <div className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                    <ScrollIcon size={14} /> Word Quest
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 mb-8 leading-tight">
                                {activePuzzle.question}
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {activePuzzle.options.map((option, idx) => (
                                    <motion.button
                                        key={idx}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleAnswer(option)}
                                        className="bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 p-6 rounded-2xl font-bold text-xl shadow-sm border-2 border-slate-200 transition-colors"
                                    >
                                        {option}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </GameShell>
    );
};

export default VocabularyAdventureGame;
