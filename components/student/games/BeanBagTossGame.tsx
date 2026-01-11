import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { TargetIcon } from 'lucide-react';

interface BeanBagTossGameProps {
    onBack: () => void;
}

interface Hoop {
    id: number;
    number: number;
    x: number; // percentage from left
    y: number; // percentage from top (depth)
    width: number;
    color: string;
}

const HOOPS: Hoop[] = [
    { id: 1, number: 1, x: 20, y: 40, width: 15, color: 'border-red-500 bg-red-500/10' },
    { id: 2, number: 2, x: 80, y: 40, width: 15, color: 'border-blue-500 bg-blue-500/10' },
    { id: 3, number: 3, x: 50, y: 30, width: 12, color: 'border-green-500 bg-green-500/10' }, // Further back
    { id: 4, number: 4, x: 30, y: 55, width: 18, color: 'border-yellow-500 bg-yellow-500/10' }, // Closer
    { id: 5, number: 5, x: 70, y: 55, width: 18, color: 'border-purple-500 bg-purple-500/10' }, // Closer
];

const BeanBagTossGame: React.FC<BeanBagTossGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
    const [score, setScore] = useState(0);
    const [targetNumber, setTargetNumber] = useState<number>(0);
    const [feedback, setFeedback] = useState("");

    // Toss Logic
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const beanBagControls = useAnimation();
    const [isFlying, setIsFlying] = useState(false);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const startGame = () => {
        setScore(0);
        setGameState('PLAYING');
        pickTarget();
    };

    const pickTarget = () => {
        setIsFlying(false);
        beanBagControls.set({ x: 0, y: 0, scale: 1, opacity: 1 }); // Reset position

        const nextTarget = Math.floor(Math.random() * 5) + 1;
        setTargetNumber(nextTarget);
        setFeedback(`Aim for Number ${nextTarget}!`);
        speak(`Toss the bag into hoop number ${nextTarget}!`);
    };

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (gameState !== 'PLAYING' || isFlying) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = async (e: React.PointerEvent) => {
        if (!isDragging || !dragStart) return;
        setIsDragging(false);

        const endX = e.clientX;
        const endY = e.clientY;
        const deltaX = endX - dragStart.x;
        const deltaY = endY - dragStart.y;

        // Ensure it's a throw (upward swipe)
        if (deltaY > -50) {
            // Swipe wasn't "up" enough to be a throw
            setDragStart(null);
            return;
        }

        setIsFlying(true);

        // Simulate flight path
        // Visual throw
        const throwPower = Math.min(Math.abs(deltaY) / 5, 200); // Max distance clamp
        const throwAngle = deltaX * 1.5; // Horizontal drift

        // Animate
        await beanBagControls.start({
            y: -throwPower * 3, // Fly Up/Away
            x: throwAngle,
            scale: 0.4, // Get smaller as it goes "deep"
            transition: { duration: 0.8, ease: "easeOut" }
        });

        // Calculate landing zone (simplified 0-100 logic)
        // Adjust for screen layout roughly?
        // We will map throwPower to Y percentage and throwAngle to X percentage
        // This is heuristic and "good enough" for a kids game

        // Base X center = 50%
        // Max throw angle (e.g. 200px) might map to +/- 40%
        const landedX = 50 + (throwAngle / 4); // rough mapping

        // Base Y bottom = 100%
        // Max throw power (e.g. 300px) maps to depth (smaller Y %)
        // Start Y is ~80%. 
        // 0 throw = 80%. 300 throw = 20%.
        const powerRatio = Math.abs(deltaY) / window.innerHeight; // 0 to 1
        const landedY = 80 - (powerRatio * 80);

        checkCollision(landedX, landedY);
    };

    const checkCollision = (x: number, y: number) => {
        // Find closest hoop
        let hitHoop: Hoop | null = null;
        let minDist = 1000;

        HOOPS.forEach(hoop => {
            // Distance formula
            const dx = x - hoop.x;
            const dy = y - hoop.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Hit radius approximation (hoop width/2)
            if (dist < (hoop.width / 1.5)) {
                if (dist < minDist) {
                    minDist = dist;
                    hitHoop = hoop;
                }
            }
        });

        if (hitHoop && (hitHoop as Hoop).number === targetNumber) {
            handleSuccess();
        } else {
            handleMiss(hitHoop ? (hitHoop as Hoop).number : undefined);
        }
    };

    const handleSuccess = () => {
        setScore(prev => prev + 10);
        speak("Score!");
        confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.5 }
        });

        beanBagControls.start({ opacity: 0 }).then(() => {
            if (score > 40 && score % 50 === 0) {
                addXP(20);
                unlockBadge('perfect-aim');
            }
            pickTarget();
        });
    };

    const handleMiss = (hitNumber?: number) => {
        if (hitNumber) {
            speak(`Oops, that was number ${hitNumber}. Aim for number ${targetNumber}!`);
        } else {
            speak("Missed! Try throwing harder or softer.");
        }

        // "Fall" or "Bounce" animation could go here
        beanBagControls.start({
            y: "+=20",
            opacity: 0,
            transition: { duration: 0.3 }
        }).then(() => {
            // Reset
            beanBagControls.set({ x: 0, y: 0, scale: 1, opacity: 1 });
            setIsFlying(false);
        });
    };

    return (
        <GameShell
            title="Number Bean Bag Toss"
            onExit={onBack}
            score={score}
            isGameOver={gameState === 'GAMEOVER'}
            onRestart={startGame}
        >
            <div
                className="h-full w-full bg-slate-800 relative overflow-hidden touch-none select-none perspective-1000"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onContextMenu={e => e.preventDefault()}
            >
                {/* Floor / Gym */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-orange-100 transform origin-bottom scale-x-150 rounded-t-[100px] border-t-8 border-orange-200/50 shadow-inner" style={{ transformStyle: 'preserve-3d', transform: 'rotateX(20deg)' }}>
                    {/* Floor Texture */}
                    <div className="w-full h-full opacity-10 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[length:20px_20px]"></div>
                </div>

                {/* Target Display */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-6 py-2 rounded-xl shadow-lg border-b-4 border-gray-200 z-20 flex flex-col items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Target Hoop</span>
                    <span className="text-4xl font-black text-purple-600 font-mono">#{targetNumber || '?'}</span>
                </div>

                {/* Hoops */}
                {HOOPS.map(hoop => (
                    <div
                        key={hoop.id}
                        className={`absolute flex items-center justify-center rounded-[50%] border-4 shadow-lg ${hoop.color} ${targetNumber === hoop.number ? 'animate-pulse ring-4 ring-white/50' : ''}`}
                        style={{
                            left: `${hoop.x}%`,
                            top: `${hoop.y}%`,
                            width: `${hoop.width}%`,
                            height: `${hoop.width * 0.6}%`, // Oval
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        <span className="text-white font-black text-2xl md:text-3xl drop-shadow-md transform -rotate-x-12">{hoop.number}</span>
                    </div>
                ))}

                {/* Visual Guide (if dragging) */}
                {isDragging && dragStart && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-sm animate-pulse">
                        Release to Throw!
                    </div>
                )}

                {/* The Bean Bag */}
                {gameState === 'PLAYING' && (
                    <div
                        className="absolute bottom-[15%] left-1/2 transform -translate-x-1/2 z-30 pointer-events-none"
                    >
                        <motion.div
                            animate={beanBagControls}
                            initial={{ x: 0, y: 0, scale: 1 }}
                            className="w-24 h-24 relative"
                        >
                            {/* Bean Bag Graphic */}
                            <div className="w-full h-full bg-blue-600 rounded-3xl rotate-45 shadow-2xl border-4 border-blue-400 flex items-center justify-center">
                                <div className="w-16 h-16 bg-blue-500 rounded-full opacity-50 blur-sm"></div>
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/denim.png')] opacity-30 mix-blend-overlay"></div>
                            </div>
                        </motion.div>

                        {/* Hand holding it (Only visible when not flying) */}
                        {!isFlying && (
                            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-200 rounded-full -z-10 translate-y-12"></div>
                        )}
                    </div>
                )}

                {/* Start Overlay */}
                {gameState === 'START' && (
                    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={startGame}
                            className="bg-orange-500 text-white px-10 py-5 rounded-2xl font-bold text-2xl shadow-xl flex items-center gap-3 border-b-4 border-orange-700 hover:border-b-2 active:border-b-0 active:translate-y-1"
                        >
                            <TargetIcon />
                            Start Tossing!
                        </motion.button>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

export default BeanBagTossGame;
