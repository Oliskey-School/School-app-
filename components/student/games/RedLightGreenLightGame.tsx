import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';

interface RedLightGreenLightGameProps {
    onBack: () => void;
}

const FINISH_LINE_STEPS = 50;

const RedLightGreenLightGame: React.FC<RedLightGreenLightGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'WIN'>('START');
    const [score, setScore] = useState(0); // Score = Steps taken
    const [lightState, setLightState] = useState<'RED' | 'GREEN'>('RED');
    const [feedback, setFeedback] = useState("Tap on GREEN. Stop on RED.");
    const [steps, setSteps] = useState(0);
    const [lives, setLives] = useState(3);

    // Logic Refs
    const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
    const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const canTapRef = useRef(false);

    // Character Animation
    const runnerControls = useAnimation();

    useEffect(() => {
        return () => {
            cleanup();
        };
    }, []);

    const cleanup = () => {
        if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        window.speechSynthesis.cancel();
    };

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    };

    const startGame = () => {
        setScore(0);
        setSteps(0);
        setLives(3);
        setGameState('PLAYING');
        setFeedback("Get Ready...");
        setLightState('RED');

        // Initial start delay
        gameLoopRef.current = setTimeout(() => {
            switchLight('GREEN');
        }, 2000);
    };

    const switchLight = (newState: 'RED' | 'GREEN') => {
        setLightState(newState);

        if (newState === 'GREEN') {
            setFeedback("GO! GO! GO!");
            speak("Green Light!");
            canTapRef.current = true;

            // Random duration for Green Light (2 - 5 seconds)
            const duration = Math.random() * 3000 + 2000;
            gameLoopRef.current = setTimeout(() => {
                switchLight('RED');
            }, duration);

        } else {
            setFeedback("STOP!");
            speak("Red Light!");
            // Grace period for human reaction time (300ms)
            setTimeout(() => {
                canTapRef.current = false;
            }, 400);

            // Random duration for Red Light (1 - 3 seconds)
            const duration = Math.random() * 2000 + 1000;
            gameLoopRef.current = setTimeout(() => {
                switchLight('GREEN');
            }, duration);
        }
    };

    const handleRunTap = () => {
        if (gameState !== 'PLAYING') return;

        if (lightState === 'GREEN' || canTapRef.current) {
            // Successful Step
            const newSteps = steps + 1;
            setSteps(newSteps);
            setScore(newSteps * 10);

            // Speak counts occasionally
            if (newSteps % 5 === 0) {
                speak(newSteps.toString());
            }

            // Move Character Visual
            const progress = Math.min((newSteps / FINISH_LINE_STEPS) * 100, 100);
            runnerControls.start({
                left: `${progress}%`,
                transition: { duration: 0.1 }
            });

            // Check Win
            if (newSteps >= FINISH_LINE_STEPS) {
                handleWin();
            }

        } else {
            // Tapped on Red!
            handleFoul();
        }
    };

    const handleFoul = () => {
        setFeedback("Moved on Red! -1 Life");
        speak("Oops! Stop on Red.");
        setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
                handleGameOver(false);
            }
            return newLives;
        });

        // Screen Shake or red flash effect
        const container = document.getElementById('game-container');
        if (container) {
            container.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-10px)' },
                { transform: 'translateX(10px)' },
                { transform: 'translateX(0)' }
            ], { duration: 300 });
        }
    };

    const handleWin = () => {
        setGameState('WIN');
        cleanup();
        speak("You made it! Great counting!");
        addXP(50);
        unlockBadge('speed-racer');
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
        });
    };

    const handleGameOver = (win: boolean) => {
        setGameState('GAMEOVER');
        cleanup();
        if (!win) speak("Game Over. Try again!");
    };

    return (
        <GameShell
            title="Red Light, Green Light"
            onExit={onBack}
            score={score}
            isGameOver={gameState === 'GAMEOVER'}
            onRestart={startGame}
        >
            <div id="game-container" className="h-full w-full bg-slate-800 relative overflow-hidden flex flex-col items-center">

                {/* Traffic Light */}
                <div className="mt-8 bg-black p-4 rounded-3xl border-4 border-gray-600 shadow-2xl flex flex-col gap-4 relative z-10 transition-transform scale-100">
                    <div className={`w-20 h-20 rounded-full border-4 border-gray-700 shadow-inner overflow-hidden relative ${lightState === 'RED' ? 'bg-red-600 shadow-[0_0_50px_rgba(220,38,38,0.8)]' : 'bg-red-900/30'}`}>
                        {lightState === 'RED' && <div className="absolute top-2 left-4 w-6 h-4 bg-white/40 skew-x-12 rounded-full blur-sm" />}
                    </div>
                    <div className={`w-20 h-20 rounded-full border-4 border-gray-700 shadow-inner overflow-hidden relative ${lightState === 'GREEN' ? 'bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.8)]' : 'bg-green-900/30'}`}>
                        {lightState === 'GREEN' && <div className="absolute top-2 left-4 w-6 h-4 bg-white/40 skew-x-12 rounded-full blur-sm" />}
                    </div>
                </div>

                {/* Status Text */}
                <div className="mt-4 text-white font-black text-3xl tracking-widest uppercase drop-shadow-md">
                    {feedback}
                </div>

                {/* Track */}
                <div className="absolute bottom-0 w-full h-48 bg-gray-700 border-t-8 border-gray-600">
                    {/* Finish Line */}
                    <div className="absolute right-8 top-0 bottom-0 w-4 bg-[repeating-linear-gradient(45deg,black,black_20px,white_20px,white_40px)] opacity-80" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white/20 font-black text-6xl rotate-90 origin-center">FINISH</div>

                    {/* Lane lines */}
                    <div className="absolute top-1/2 w-full h-2 bg-dashed-white opacity-20" />
                </div>

                {/* Runner */}
                <div className="absolute bottom-16 left-8 right-16 h-32 pointer-events-none">
                    <motion.div
                        animate={runnerControls}
                        initial={{ left: "0%" }}
                        className="absolute bottom-0 w-16 h-20"
                        style={{ x: '-50%' }} // Center pivot
                    >
                        <div className={`w-full h-full text-6xl transition-transform ${steps % 2 === 0 ? '-rotate-6' : 'rotate-6'}`}>
                            🏃
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/90 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                            {steps} Steps
                        </div>
                    </motion.div>
                </div>

                {/* Interaction Overlay (Big Button) */}
                <button
                    onTouchStart={(e) => { e.preventDefault(); handleRunTap(); }} // Better for rapid tapping
                    onClick={handleRunTap}
                    disabled={gameState !== 'PLAYING'}
                    className="absolute inset-x-4 bottom-4 h-64 opacity-0 z-20 cursor-pointer disabled:cursor-not-allowed"
                    aria-label="Tap to run"
                />

                {/* Tap Hint */}
                {gameState === 'PLAYING' && steps < 1 && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 animate-pulse pointer-events-none text-xl font-bold">
                        (Tap Screen Repeatedly to Run!)
                    </div>
                )}

                {gameState === 'PLAYING' && lives < 3 && (
                    <div className="absolute top-4 right-4 flex gap-2">
                        {[...Array(lives)].map((_, i) => <span key={i} className="text-2xl">❤️</span>)}
                    </div>
                )}

                {/* Game Over / Start Overlay */}
                {(gameState === 'START' || gameState === 'GAMEOVER' || gameState === 'WIN') && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="text-center p-8 bg-white/10 rounded-3xl border border-white/20">
                            {gameState === 'WIN' ? (
                                <>
                                    <h2 className="text-4xl font-black text-green-400 mb-4">You Won! 🏆</h2>
                                    <p className="text-white mb-8">You ran {steps} steps!</p>
                                    <button onClick={startGame} className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-green-500">Play Again</button>
                                </>
                            ) : gameState === 'GAMEOVER' ? (
                                <>
                                    <h2 className="text-4xl font-black text-red-400 mb-4">Game Over! 🛑</h2>
                                    <p className="text-white mb-8">Moved on Red Light too many times.</p>
                                    <button onClick={startGame} className="bg-red-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:bg-red-500">Try Again</button>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-4xl font-black text-yellow-400 mb-4">Red Light, Green Light</h2>
                                    <p className="text-gray-300 mb-2">Tap fast on <span className="text-green-400 font-bold">GREEN</span>.</p>
                                    <p className="text-gray-300 mb-8">Stop instantly on <span className="text-red-400 font-bold">RED</span>.</p>
                                    <button onClick={startGame} className="bg-blue-600 text-white px-10 py-5 rounded-xl font-bold text-2xl shadow-lg border-b-4 border-blue-800 hover:translate-y-1 active:border-b-0">START</button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

export default RedLightGreenLightGame;
