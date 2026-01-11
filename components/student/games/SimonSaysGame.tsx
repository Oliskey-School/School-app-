import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { Volume2Icon, VolumeXIcon } from 'lucide-react';

interface SimonSaysGameProps {
    onBack: () => void;
}

type BodyPart = 'eyes' | 'nose' | 'mouth' | 'ears' | 'head';

interface GameCommand {
    isSimon: boolean;
    part: BodyPart;
    text: string;
}

const BODY_PARTS: { id: BodyPart; label: string }[] = [
    { id: 'eyes', label: 'Eyes' },
    { id: 'nose', label: 'Nose' },
    { id: 'mouth', label: 'Mouth' },
    { id: 'ears', label: 'Ears' },
    { id: 'head', label: 'Head' }, // General tap on head area excluding others
];

const SimonSaysGame: React.FC<SimonSaysGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [feedback, setFeedback] = useState<string>("");
    const [isSimon, setIsSimon] = useState(false); // For visual indicator (optional)

    // Game Loop State
    const [currentCommand, setCurrentCommand] = useState<GameCommand | null>(null);
    const [waitingForInput, setWaitingForInput] = useState(false);
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        window.speechSynthesis.cancel();
    };

    const startGame = () => {
        setScore(0);
        setLives(3);
        setGameState('PLAYING');
        setFeedback("Listen carefully!");
        scheduleNextRound(2000);
    };

    const scheduleNextRound = (delay: number) => {
        if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
        gameLoopRef.current = setTimeout(() => {
            startRound();
        }, delay);
    };

    const startRound = () => {
        const isSimonRound = Math.random() > 0.4; // 60% chance of Simon Says
        const part = BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)].id;

        // Construct Command
        const commandText = isSimonRound
            ? `Simon says touch your ${part}!`
            : `Touch your ${part}!`;

        const command: GameCommand = {
            isSimon: isSimonRound,
            part,
            text: commandText
        };

        setCurrentCommand(command);
        setIsSimon(isSimonRound);
        setFeedback(isSimonRound ? "Simon Says..." : "...");

        // Speak
        speak(commandText, () => {
            // Callback after speaking finishes logic
            // But waitForInput should start immediately or after speak?
            // Usually simon says is reaction, so after speak.
            // Simplified: Input is valid as soon as speaking starts or slightly after.
        });

        // Allow input
        setWaitingForInput(true);

        // Set Timeout for "No Action"
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleTimeout(command);
        }, 3000); // 3 seconds to react
    };

    const handleTimeout = (cmd: GameCommand) => {
        if (!waitingForInput) return;
        setWaitingForInput(false);

        if (cmd.isSimon) {
            // Should have clicked but didn't
            handleMistake("Time's up! You missed it.");
        } else {
            // Correctly didn't click
            handleSuccess(true); // Passive success
        }
    };

    const handlePartClick = (part: BodyPart) => {
        if (!waitingForInput || !currentCommand) return;
        setWaitingForInput(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (currentCommand.isSimon) {
            if (part === currentCommand.part) {
                handleSuccess(false); // Active success
            } else {
                handleMistake(`Wrong part! That was your ${part}.`);
            }
        } else {
            handleMistake(`Simon didn't say!`);
        }
    };

    const handleSuccess = (passive: boolean) => {
        setScore(prev => prev + 10);
        setFeedback(passive ? "Good waiting!" : "Correct!");

        if (score > 0 && score % 50 === 0) {
            addXP(20);
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }

        scheduleNextRound(1500);
    };

    const handleMistake = (reason: string) => {
        setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
                endGame();
            }
            return newLives;
        });
        setFeedback(reason);
        speak("Oops!");
        // Shake screen effect logic here if desired
        scheduleNextRound(2000);
    };

    const endGame = () => {
        setGameState('GAMEOVER');
        cleanup();
        if (score >= 100) unlockBadge('simon-master');
    };

    const speak = (text: string, onEnd?: () => void) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        if (onEnd) utterance.onend = onEnd;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <GameShell
            title="Simon Says Body Parts"
            onExit={onBack}
            score={score}
            isGameOver={gameState === 'GAMEOVER'}
            onRestart={startGame}
        >
            <div className="h-full flex flex-col items-center bg-yellow-50 relative overflow-hidden">
                {/* Feedback Banner */}
                <div className={`mt-4 px-6 py-2 rounded-full font-bold text-xl shadow-sm transition-all ${feedback.includes("Wrong") || feedback.includes("Oops") || feedback.includes("didn't") ? 'bg-red-100 text-red-600' :
                        feedback.includes("Correct") || feedback.includes("Good") ? 'bg-green-100 text-green-600' : 'bg-white text-gray-600'
                    }`}>
                    {feedback || "Get Ready!"}
                </div>

                {/* Lives */}
                <div className="absolute top-4 right-4 flex gap-1">
                    {[...Array(3)].map((_, i) => (
                        <motion.div
                            key={i}
                            animate={{ scale: i < lives ? 1 : 0.5, opacity: i < lives ? 1 : 0.2 }}
                            className="text-2xl"
                        >
                            ❤️
                        </motion.div>
                    ))}
                </div>

                {/* Character Interaction Area */}
                <div className="flex-1 w-full max-w-md flex items-center justify-center relative">
                    <div className="relative w-64 h-64 sm:w-80 sm:h-80 select-none">

                        {/* Head Base (Main Click Area for Head) */}
                        <div
                            onClick={() => handlePartClick('head')}
                            className="absolute inset-0 bg-yellow-200 rounded-full border-4 border-yellow-800 shadow-xl cursor-pointer hover:brightness-105 active:scale-95 transition-transform"
                        />

                        {/* Ears */}
                        <div
                            onClick={() => handlePartClick('ears')}
                            className="absolute -left-4 top-1/3 w-8 h-12 bg-yellow-200 rounded-l-xl border-l-4 border-y-4 border-yellow-800 cursor-pointer hover:bg-yellow-300"
                        />
                        <div
                            onClick={() => handlePartClick('ears')}
                            className="absolute -right-4 top-1/3 w-8 h-12 bg-yellow-200 rounded-r-xl border-r-4 border-y-4 border-yellow-800 cursor-pointer hover:bg-yellow-300"
                        />

                        {/* Eyes */}
                        <div className="absolute top-1/4 left-[20%] right-[20%] flex justify-between px-4">
                            <div
                                onClick={(e) => { e.stopPropagation(); handlePartClick('eyes'); }}
                                className="w-12 h-12 bg-white rounded-full border-2 border-black flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-transform"
                            >
                                <div className="w-4 h-4 bg-black rounded-full" />
                            </div>
                            <div
                                onClick={(e) => { e.stopPropagation(); handlePartClick('eyes'); }}
                                className="w-12 h-12 bg-white rounded-full border-2 border-black flex items-center justify-center overflow-hidden cursor-pointer hover:scale-110 transition-transform"
                            >
                                <div className="w-4 h-4 bg-black rounded-full" />
                            </div>
                        </div>

                        {/* Nose */}
                        <div
                            onClick={(e) => { e.stopPropagation(); handlePartClick('nose'); }}
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-10 bg-orange-300 rounded-full border border-orange-700 cursor-pointer hover:scale-110 transition-transform"
                        />

                        {/* Mouth */}
                        <div
                            onClick={(e) => { e.stopPropagation(); handlePartClick('mouth'); }}
                            className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 w-24 h-12 bg-red-400 rounded-b-full border-2 border-red-900 cursor-pointer hover:scale-105 transition-transform overflow-hidden flex justify-center"
                        >
                            <div className="w-16 h-8 bg-red-800 rounded-full mt-6 opacity-30" /> {/* Tongue/Depth */}
                        </div>

                    </div>
                </div>

                {/* Tip */}
                {gameState === 'PLAYING' && (
                    <p className="mb-8 text-gray-400 text-sm font-medium animate-pulse">
                        Tap the face parts to obey Simon!
                    </p>
                )}

                {/* Start Overlay */}
                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startGame}
                            className="bg-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-2xl shadow-xl flex items-center gap-3 border-b-4 border-purple-800 hover:border-b-2 active:border-b-0 active:translate-y-1"
                        >
                            Start Game 🗣️
                        </motion.button>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

export default SimonSaysGame;
