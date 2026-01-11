import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { MicIcon, UsersIcon, ThumbsUpIcon, ThumbsDownIcon, ClockIcon } from 'lucide-react';

interface DebateDashGameProps {
    onBack: () => void;
}

interface Argument {
    text: string;
    type: 'strong' | 'weak' | 'fallacy';
    score: number;
}

interface DebateRound {
    topic: string;
    aiSide: 'Pro' | 'Con';
    playerSide: 'Pro' | 'Con';
    rounds: {
        aiArgument: string;
        options: Argument[];
    }[];
}

const DEBATE_SCENARIOS: DebateRound[] = [
    {
        topic: "School Uniforms Should Be Banned",
        aiSide: "Con", // AI is AGAIST banning (Pro-Uniform)
        playerSide: "Pro", // Player is FOR banning
        rounds: [
            {
                aiArgument: "Uniforms create a sense of belonging and reduce bullying based on clothing brands.",
                options: [
                    { text: "Uniforms stifle student expression and individuality, which is key for development.", type: 'strong', score: 20 },
                    { text: "I just don't like the color of the blazer.", type: 'weak', score: 5 },
                    { text: "Teachers wear whatever they want, so it's unfair!", type: 'fallacy', score: -5 }
                ]
            },
            {
                aiArgument: "They are also cheaper for parents in the long run than buying fashion clothes.",
                options: [
                    { text: "Actually, specialized uniform items are often monopolized and expensive.", type: 'strong', score: 20 },
                    { text: "Clothes are free if you govern them.", type: 'fallacy', score: -10 },
                    { text: "My parents are rich so it doesn't matter.", type: 'weak', score: 0 }
                ]
            },
            {
                aiArgument: "Uniforms improve discipline and focus in the classroom.",
                options: [
                    { text: "Studies show no direct link between uniforms and academic performance.", type: 'strong', score: 20 },
                    { text: "Focus comes from good sleep, not clothes.", type: 'weak', score: 10 },
                    { text: "Discipline is boring.", type: 'fallacy', score: -5 }
                ]
            }
        ]
    },
    {
        topic: "Social Media Does More Harm Than Good",
        aiSide: "Pro", // AI thinks it IS harmful
        playerSide: "Con", // Player thinks it is GOOD
        rounds: [
            {
                aiArgument: "Social media causes anxiety and depression in teenagers.",
                options: [
                    { text: "It also provides vital support networks for marginalized communities.", type: 'strong', score: 20 },
                    { text: "I only use it for memes.", type: 'weak', score: 5 },
                    { text: "Phones are just plastic and glass, they can't hurt you.", type: 'fallacy', score: -5 }
                ]
            },
            {
                aiArgument: "It spreads misinformation faster than truth.",
                options: [
                    { text: "It democratizes information, allowing independent journalism to flourish.", type: 'strong', score: 20 },
                    { text: "My friend reads books sometimes.", type: 'fallacy', score: 0 },
                    { text: "People should just trigger check everything.", type: 'weak', score: 5 }
                ]
            }
        ]
    }
];

const DebateDashGame: React.FC<DebateDashGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [scenario, setScenario] = useState<DebateRound | null>(null);
    const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
    const [gameState, setGameState] = useState<'SETUP' | 'PLAYING' | 'FEEDBACK' | 'GAMEOVER'>('SETUP');
    const [crowdScore, setCrowdScore] = useState(50); // 0 = AI Wins, 100 = Player Wins
    const [timeLeft, setTimeLeft] = useState(30);
    const [feedback, setFeedback] = useState("");
    const [finalResult, setFinalResult] = useState("");

    // Timer Ref
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    };

    const startDebate = () => {
        const randomScenario = DEBATE_SCENARIOS[Math.floor(Math.random() * DEBATE_SCENARIOS.length)];
        setScenario(randomScenario);
        setCurrentRoundIndex(0);
        setCrowdScore(50);
        setGameState('PLAYING');
        startRound(randomScenario, 0);
    };

    const startRound = (scen: DebateRound, index: number) => {
        setTimeLeft(30);

        // AI Speaks first
        const roundData = scen.rounds[index];
        speak(roundData.aiArgument);

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleTimeOut();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeOut = () => {
        setFeedback("Time's up! You stayed silent.");
        updateCrowd(-10);
        setTimeout(nextRound, 2000);
    };

    const handleOptionSelect = (option: Argument) => {
        if (timerRef.current) clearInterval(timerRef.current);

        let msg = "";
        if (option.type === 'strong') msg = "Strong Point! The crowd loves it.";
        else if (option.type === 'weak') msg = "Weak argument. The crowd is unsure.";
        else msg = "Logical Fallacy! The crowd boos.";

        setFeedback(msg);
        speak(msg);
        updateCrowd(option.score);

        setGameState('FEEDBACK');
        setTimeout(nextRound, 2500);
    };

    const updateCrowd = (delta: number) => {
        setCrowdScore(prev => Math.max(0, Math.min(100, prev + delta)));
    };

    const nextRound = () => {
        if (!scenario) return;

        if (currentRoundIndex < scenario.rounds.length - 1) {
            setGameState('PLAYING');
            setCurrentRoundIndex(prev => prev + 1);
            startRound(scenario, currentRoundIndex + 1);
        } else {
            endGame();
        }
    };

    const endGame = () => {
        setGameState('GAMEOVER');
        if (crowdScore > 50) {
            setFinalResult("Victory! You won the debate.");
            addXP(100);
            unlockBadge('master-debater');
            confetti({ particleCount: 150 });
            speak("You won the debate! Congratulations.");
        } else {
            setFinalResult("Defeat. The crowd sided with the opponent.");
            speak("You lost this time.");
        }
    };

    return (
        <GameShell
            title="Debate Dash"
            onExit={onBack}
            score={crowdScore}
            isGameOver={gameState === 'GAMEOVER'}
            onRestart={startDebate}
        >
            <div className="h-full w-full bg-slate-100 flex flex-col p-4 overflow-hidden relative">

                {gameState === 'SETUP' && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                        <MicIcon size={80} className="text-orange-600 mb-6 bg-orange-100 p-4 rounded-full" />
                        <h2 className="text-4xl font-black text-slate-800 mb-4">Ready to Debate?</h2>
                        <p className="text-lg text-slate-600 mb-8">You have 30 seconds to choose the best counter-argument. Avoid logical fallacies!</p>
                        <button onClick={startDebate} className="bg-orange-600 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-orange-500 animate-bounce">
                            Start Debate
                        </button>
                    </div>
                )}

                {(gameState === 'PLAYING' || gameState === 'FEEDBACK') && scenario && (
                    <>
                        {/* Header Info */}
                        <div className="bg-white p-4 rounded-xl shadow-md mb-4 border-l-4 border-orange-500 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Topic</h3>
                                <p className="font-bold text-lg text-slate-800 leading-tight">{scenario.topic}</p>
                            </div>
                            <div className="text-right">
                                <span className={`inline-block px-3 py-1 rounded text-sm font-bold ${scenario.playerSide === 'Pro' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    You are: {scenario.playerSide}
                                </span>
                            </div>
                        </div>

                        {/* Crowd Meter */}
                        <div className="mb-6 relative h-8 bg-gray-300 rounded-full overflow-hidden shadow-inner border border-gray-400">
                            <motion.div
                                animate={{ width: `${crowdScore}%` }}
                                className={`h-full transition-all duration-500 flex items-center justify-end pr-2 ${crowdScore > 50 ? 'bg-green-500' : 'bg-red-500'}`}
                            >
                                <UsersIcon className="text-white/50 w-4 h-4" />
                            </motion.div>
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/30" /> {/* Center line */}
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600">Opponent</span>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow-md">You</span>
                        </div>

                        {/* Main Debate Area */}
                        <div className="flex-1 flex flex-col gap-4">

                            {/* Opponent Bubble */}
                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold shrink-0">AI</div>
                                <div className="bg-gray-200 p-4 rounded-r-2xl rounded-bl-2xl shadow-sm max-w-[80%] text-slate-800 text-lg relative">
                                    <div className="absolute -left-2 top-0 w-0 h-0 border-t-[10px] border-t-gray-200 border-l-[10px] border-l-transparent"></div>
                                    {scenario.rounds[currentRoundIndex].aiArgument}
                                </div>
                            </div>

                            {/* Timer */}
                            <div className="flex justify-center my-2">
                                <div className={`flex items-center gap-2 px-4 py-1 rounded-full text-white font-bold transition-colors ${timeLeft < 10 ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}>
                                    <ClockIcon size={16} /> {timeLeft}s
                                </div>
                            </div>

                            {/* Player Options */}
                            <div className="grid grid-cols-1 gap-3 mt-auto mb-4">
                                {gameState === 'FEEDBACK' ? (
                                    <div className={`p-6 rounded-2xl text-center font-bold text-2xl shadow-xl ${feedback.includes("Strong") ? 'bg-green-100 text-green-800' : feedback.includes("Weak") ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                        {feedback}
                                    </div>
                                ) : (
                                    scenario.rounds[currentRoundIndex].options.map((opt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleOptionSelect(opt)}
                                            className="bg-white hover:bg-orange-50 active:scale-[0.99] border-2 border-slate-200 hover:border-orange-300 p-4 rounded-xl text-left shadow-sm transition-all group"
                                        >
                                            <p className="font-semibold text-slate-700 group-hover:text-slate-900">{opt.text}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {gameState === 'GAMEOVER' && (
                    <div className="absolute inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center p-8 text-center">
                        <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_currentColor] ${crowdScore > 50 ? 'bg-green-500 text-green-100' : 'bg-red-500 text-red-100'}`}>
                            {crowdScore > 50 ? <ThumbsUpIcon size={64} /> : <ThumbsDownIcon size={64} />}
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2">{crowdScore > 50 ? "VICTORY" : "DEFEAT"}</h2>
                        <p className="text-xl text-slate-300 mb-8">{finalResult}</p>

                        <div className="bg-white/10 rounded-xl p-6 mb-8 w-full max-w-sm">
                            <div className="text-sm text-gray-400 uppercase font-bold mb-2">Crowd Approval</div>
                            <div className="text-5xl font-black text-white">{crowdScore}%</div>
                        </div>

                        <button onClick={startDebate} className="bg-white text-slate-900 px-8 py-3 rounded-full font-bold text-lg hover:bg-gray-200">
                            Debate Again
                        </button>
                    </div>
                )}

            </div>
        </GameShell>
    );
};

export default DebateDashGame;
