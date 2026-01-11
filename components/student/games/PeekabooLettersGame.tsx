import React, { useState, useEffect } from 'react';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PeekabooLettersGameProps {
    onBack: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const COLORS = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400'];

const PeekabooLettersGame: React.FC<PeekabooLettersGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHidden, setIsHidden] = useState(true);
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);

    useEffect(() => {
        // Speak instruction on mount
        const utterance = new SpeechSynthesisUtterance("Let's play Peekaboo!");
        window.speechSynthesis.speak(utterance);

        return () => {
            window.speechSynthesis.cancel(); // Stop talking on exit
        };
    }, []);

    const handleReveal = () => {
        if (!isHidden) return;

        setIsHidden(false);
        setScore(prev => prev + 10);
        addXP(5);

        // Sound effect
        const letter = LETTERS[currentIndex];
        const utterance = new SpeechSynthesisUtterance(`Peekaboo! It's ${letter}!`);
        window.speechSynthesis.speak(utterance);

        confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
        });

        // Next round delay
        setTimeout(() => {
            if (currentIndex < LETTERS.length - 1) {
                setIsHidden(true);
                setCurrentIndex(prev => prev + 1);
            } else {
                handleGameOver();
            }
        }, 2500);
    };

    const handleGameOver = () => {
        setIsGameOver(true);
        addXP(50);
        unlockBadge('early-bird'); // Example badge
        const utterance = new SpeechSynthesisUtterance("Great job! You found all the letters!");
        window.speechSynthesis.speak(utterance);
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsHidden(true);
        setScore(0);
        setIsGameOver(false);
    };

    return (
        <GameShell
            title="Peekaboo Letters"
            onExit={onBack}
            score={score}
            isGameOver={isGameOver}
            onRestart={handleRestart}
        >
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-sky-100 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fbaebb 2px, transparent 2.5px)', backgroundSize: '30px 30px' }}></div>

                <AnimatePresence mode="wait">
                    {isHidden ? (
                        <motion.button
                            key="hidden"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.2, opacity: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleReveal}
                            className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-3xl bg-orange-500 shadow-xl flex items-center justify-center cursor-pointer border-b-8 border-orange-700 relative z-10 transition-all active:border-b-0 active:translate-y-2"
                        >
                            <span className="text-6xl sm:text-7xl md:text-8xl font-bold text-white animate-bounce">
                                ❓
                            </span>
                            <span className="absolute bottom-6 sm:bottom-8 text-white font-bold opacity-80 text-sm sm:text-base">Tap to Reveal!</span>
                        </motion.button>
                    ) : (
                        <motion.div
                            key="revealed"
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1.2, rotate: 0 }}
                            className={`w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-3xl ${COLORS[currentIndex % COLORS.length]} shadow-2xl flex items-center justify-center border-4 border-white relative z-10`}
                        >
                            <span className="text-8xl sm:text-9xl md:text-[10rem] font-black text-white drop-shadow-md">
                                {LETTERS[currentIndex]}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-8 sm:mt-12 flex gap-3 sm:gap-4 relative z-10">
                    {LETTERS.map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ${i < currentIndex || (i === currentIndex && !isHidden) ? 'bg-green-500 scale-125' : 'bg-slate-300'}`}
                        />
                    ))}
                </div>
            </div>
        </GameShell>
    );
};

export default PeekabooLettersGame;
