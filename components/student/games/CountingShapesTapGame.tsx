import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { StarIcon, PlayIcon, RefreshCwIcon } from 'lucide-react';

interface CountingShapesTapGameProps {
    onBack: () => void;
}

type ShapeType = 'circle' | 'square' | 'triangle' | 'star';

interface FloatingShape {
    id: string;
    type: ShapeType;
    x: number; // percentage 0-90
    color: string;
    speed: number;
    size: number;
}

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'star'];
const COLORS = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-400',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500'
];

const CountingShapesTapGame: React.FC<CountingShapesTapGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
    const [score, setScore] = useState(0);
    const [circleCount, setCircleCount] = useState(0);
    const [shapes, setShapes] = useState<FloatingShape[]>([]);

    // Spawner Ref to clean up interval
    const spawnerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (gameState === 'PLAYING') {
            // Speak Instructions
            if (circleCount === 0) {
                speak("Tap only the Circles!");
            }

            // Start Spawning
            spawnerRef.current = setInterval(spawnShape, 1200);
        }
        return () => {
            if (spawnerRef.current) clearInterval(spawnerRef.current);
            window.speechSynthesis.cancel(); // Stop talking immediately
        };
    }, [gameState]);

    const spawnShape = useCallback(() => {
        const id = Math.random().toString(36).substr(2, 9);
        const type = SHAPES[Math.floor(Math.random() * (circleCount < 3 ? 2 : SHAPES.length))]; // Start easy (only circles/squares)

        // Ensure we get enough circles
        const forcedType = Math.random() > 0.6 ? 'circle' : type;

        const newShape: FloatingShape = {
            id,
            type: forcedType,
            x: Math.random() * 80 + 10, // 10% to 90%
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            speed: Math.random() * 5 + 5, // duration 5-10s
            size: Math.random() * 40 + 60, // 60-100px
        };

        setShapes(prev => [...prev, newShape]);
    }, [circleCount]);

    const handleShapeTap = (shape: FloatingShape) => {
        if (gameState !== 'PLAYING') return;

        // Remove the shape immediately
        setShapes(prev => prev.filter(s => s.id !== shape.id));

        if (shape.type === 'circle') {
            const newCount = circleCount + 1;
            setCircleCount(newCount);
            setScore(prev => prev + 10);

            // Speak the number
            speak(newCount.toString());

            // Visual feedback
            triggerConfetti(shape.x);

            // Level up / Win Condition
            if (newCount % 5 === 0) {
                addXP(10);
                speak("Great job!");
            }

            if (newCount >= 20) {
                endGame(true);
            }
        } else {
            // Wrong shape
            speak("Not a circle!");
            setScore(prev => Math.max(0, prev - 5));
            // Maybe screen shake?
        }
    };

    const handleShapeExit = (id: string) => {
        setShapes(prev => prev.filter(s => s.id !== id));
    };

    const endGame = (win: boolean) => {
        setGameState('GAMEOVER');
        if (spawnerRef.current) clearInterval(spawnerRef.current);
        if (win) {
            unlockBadge('shape-master');
            speak("You did it! You found 20 circles!");
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 }
            });
        }
    };

    const resetGame = () => {
        setShapes([]);
        setScore(0);
        setCircleCount(0);
        setGameState('PLAYING');
    };

    const speak = (text: string) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.2; // Slightly higher pitch for kids
        window.speechSynthesis.speak(utterance);
    };

    const triggerConfetti = (xPosPercent: number) => {
        const x = xPosPercent / 100;
        confetti({
            particleCount: 30,
            spread: 40,
            origin: { x, y: 0.8 },
            gravity: 0.8,
            scalar: 0.8
        });
    };

    return (
        <GameShell
            title="Counting Circles"
            onExit={onBack}
            score={score}
            isGameOver={gameState === 'GAMEOVER'}
            onRestart={resetGame}
        >
            <div className="h-full w-full bg-sky-100 relative overflow-hidden touch-none select-none">
                {/* Background Decor */}
                <div className="absolute bottom-0 w-full h-32 bg-green-400 rounded-t-[50%] scale-150 translate-y-12 shadow-lg" />
                <div className="absolute top-10 left-10 text-sky-200/50">
                    <CloudIcon size={120} />
                </div>
                <div className="absolute top-20 right-20 text-sky-200/50">
                    <CloudIcon size={90} />
                </div>

                {/* Counter Display */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md px-8 py-2 rounded-full shadow-lg border-2 border-orange-400 z-10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-black" />
                    <span className="text-4xl font-black text-orange-600 font-mono">
                        {circleCount} / 20
                    </span>
                </div>

                {/* Game Area */}
                <div className="absolute inset-0 z-0">
                    <AnimatePresence>
                        {shapes.map(shape => (
                            <Shape
                                key={shape.id}
                                shape={shape}
                                onTap={() => handleShapeTap(shape)}
                                onExit={() => handleShapeExit(shape.id)}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Start Screen */}
                {gameState === 'START' && (
                    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setGameState('PLAYING')}
                            className="bg-green-500 text-white px-12 py-6 rounded-3xl font-black text-3xl shadow-[0_8px_0_rgb(21,128,61)] hover:shadow-[0_4px_0_rgb(21,128,61)] hover:translate-y-1 transition-all flex items-center gap-4"
                        >
                            <PlayIcon size={48} fill="currentColor" />
                            PLAY!
                        </motion.button>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

// Sub-component for individual shape to handle its own animation lifecycle
const Shape: React.FC<{ shape: FloatingShape; onTap: () => void; onExit: () => void }> = ({ shape, onTap, onExit }) => {

    // Convert type to Tailwind classes
    const getShapeClasses = () => {
        switch (shape.type) {
            case 'circle': return 'rounded-full';
            case 'square': return 'rounded-xl';
            case 'triangle': return 'clip-triangle'; // Need custom clip-path or CSS
            case 'star': return 'clip-star';
            default: return 'rounded-lg';
        }
    };

    return (
        <motion.button
            layout
            initial={{ y: "110vh", x: `${shape.x}vw`, rotate: 0, scale: 0.5 }}
            animate={{
                y: "-20vh",
                rotate: 360,
                scale: 1
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
                duration: shape.speed,
                ease: "linear"
            }}
            onAnimationComplete={onExit}
            onClick={onTap}
            className={`absolute shadow-xl flex items-center justify-center cursor-pointer hover:brightness-110 active:scale-90 transition-transform ${shape.type === 'circle' ? 'z-20' : 'z-10'}`}
            style={{
                width: shape.size,
                height: shape.size,
                // Custom styles for non-standard shapes if needed, mostly using simple divs/svgs is safer
            }}
        >
            {/* Render Shape Visual */}
            {shape.type === 'circle' && (
                <div className={`w-full h-full ${shape.color} rounded-full border-4 border-white/30`} />
            )}
            {shape.type === 'square' && (
                <div className={`w-full h-full ${shape.color} rounded-2xl border-4 border-white/30`} />
            )}
            {shape.type === 'triangle' && (
                <div className="w-0 h-0 border-l-[40px] border-r-[40px] border-b-[70px] border-l-transparent border-r-transparent border-b-blue-500 scale-105"
                    style={{ borderBottomColor: shape.color.replace('bg-', 'text-').replace('-500', '-500') }} // Hacky color mapping or just use SVG
                >
                    <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-md`}>
                        <polygon points="50,15 90,85 10,85" className={`${shape.color.replace('bg-', 'fill-')}`} stroke="white" strokeWidth="4" />
                    </svg>
                </div>
            )}
            {/* Fallback/Cleaner implementation for triangle using SVG which is robust */}
            {(shape.type === 'triangle') && (
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <path d="M50 10 L90 90 L10 90 Z" className={shape.color.replace('bg-', 'fill-')} stroke="white" strokeWidth="5" />
                </svg>
            )}
            {shape.type === 'star' && (
                <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                    <path d="M50 10 L61 35 L88 39 L69 57 L74 84 L50 71 L26 84 L31 57 L12 39 L39 35 Z" className={shape.color.replace('bg-', 'fill-')} stroke="white" strokeWidth="5" />
                </svg>
            )}

            {/* Face/Eyes for cuteness */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2 pointer-events-none">
                <div className="w-2 h-2 bg-black/70 rounded-full animate-blink" />
                <div className="w-2 h-2 bg-black/70 rounded-full animate-blink delay-75" />
            </div>
        </motion.button>
    );
};

const CloudIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size * 0.6} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.5,19c-3.037,0-5.5-2.463-5.5-5.5c0-0.34,0.032-0.671,0.09-0.993C11.503,12.21,10.78,12,10,12c-2.209,0-4,1.791-4,4 s1.791,4,4,4c0.342,0,0.675-0.046,1-0.126V20h6.5v-0.841C17.848,19.098,18.169,19,18.5,19c2.481,0,4.5-2.019,4.5-4.5 S20.981,10,18.5,10c-0.354,0-0.695,0.043-1.025,0.121C16.929,7.697,14.654,6,12,6c-4.418,0-8,3.582-8,8c0,0.258,0.015,0.512,0.04,0.763 C1.666,15.795,0,17.659,0,19.5C0,21.981,2.019,24,4.5,24h13c3.59,0,6.5-2.91,6.5-6.5S21.09,11,17.5,11" />
    </svg>
);

export default CountingShapesTapGame;
