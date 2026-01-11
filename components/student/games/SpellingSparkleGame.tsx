import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { SparklesIcon, MicIcon, UserIcon } from 'lucide-react';

interface SpellingSparkleGameProps {
    onBack: () => void;
}

interface Player {
    id: number;
    name: string;
    isAi: boolean;
    eliminated: boolean;
    color: string;
}

const WORDS = [
    "CAT", "DOG", "SUN", "BOOK", "TREE", "FISH",
    "HOPE", "LOVE", "JUMP", "PLAY", "STAR", "BLUE",
    "HAPPY", "SMILE", "WORLD", "TIGER", "ZEBRA"
];

const AI_NAMES = ["Alex", "Sam", "Jordan", "Taylor", "Riley", "Jamie"];
const PLAYER_ID = 0;

const SpellingSparkleGame: React.FC<SpellingSparkleGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('START'); // Victory if player is last one standing? Or just survival? Let's do survival per round.
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentWord, setCurrentWord] = useState("");
    const [currentWordIndex, setCurrentWordIndex] = useState(0); // Which letter we are on
    const [turnIndex, setTurnIndex] = useState(0); // Index in active players array
    const [feedback, setFeedback] = useState("");
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);

    // Logic Refs
    const turnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => cleanup();
    }, []);

    const cleanup = () => {
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        window.speechSynthesis.cancel();
    };

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

    const startGame = () => {
        setScore(0);
        setRound(1);
        setGameState('PLAYING');

        // Setup Players (Player + 3 Bots)
        const initialPlayers: Player[] = [
            { id: 0, name: "You", isAi: false, eliminated: false, color: "bg-blue-500" },
            { id: 1, name: AI_NAMES[0], isAi: true, eliminated: false, color: "bg-red-500" },
            { id: 2, name: AI_NAMES[1], isAi: true, eliminated: false, color: "bg-green-500" },
            { id: 3, name: AI_NAMES[2], isAi: true, eliminated: false, color: "bg-yellow-500" },
        ];
        setPlayers(initialPlayers);

        startRound(initialPlayers);
    };

    const startRound = (currentPlayers: Player[]) => {
        const activePlayers = currentPlayers.filter(p => !p.eliminated);
        if (activePlayers.length === 1 && activePlayers[0].id === PLAYER_ID) {
            handleVictory();
            return;
        }

        // Pick word
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        setCurrentWord(word);
        setCurrentWordIndex(0);
        setTurnIndex(0); // Start with first active player

        setFeedback(`Word is: ${word}`);
        speak(`The word is ${word}.`);

        // Start turn loop
        processTurn(0, word, 0, currentPlayers);
    };

    const processTurn = (tIndex: number, word: string, wIndex: number, allPlayers: Player[]) => {
        const activePlayers = allPlayers.filter(p => !p.eliminated);
        const player = activePlayers[tIndex % activePlayers.length];

        setTurnIndex(tIndex % activePlayers.length);

        if (player.isAi) {
            // AI Turn
            turnTimeoutRef.current = setTimeout(() => {
                if (wIndex < word.length) {
                    // Say Letter
                    // 10% chance AI messes up
                    const isCorrect = Math.random() > 0.05;
                    if (isCorrect) {
                        handleMove(player.id, word[wIndex], word, wIndex, tIndex, allPlayers);
                    } else {
                        // AI wrong letter
                        handleMistake(player.id, "Wrong letter!");
                    }
                } else {
                    // Say Sparkle
                    handleMove(player.id, "SPARKLE", word, wIndex, tIndex, allPlayers);
                }
            }, 1000);
        } else {
            // Player Turn - Wait for input
            setFeedback("Your Turn!");
        }
    };

    const handlePlayerInput = (input: string) => {
        if (gameState !== 'PLAYING') return;
        // Validate
        const activePlayers = players.filter(p => !p.eliminated);
        const currentPlayer = activePlayers[turnIndex];

        if (currentPlayer.id !== PLAYER_ID) return; // Not your turn

        if (input === "SPARKLE") {
            if (currentWordIndex === currentWord.length) {
                handleMove(PLAYER_ID, "SPARKLE", currentWord, currentWordIndex, turnIndex, players);
            } else {
                handleMistake(PLAYER_ID, "Too early for Sparkle!");
            }
        } else {
            // Letter input
            if (currentWordIndex < currentWord.length) {
                if (input === currentWord[currentWordIndex]) {
                    handleMove(PLAYER_ID, input, currentWord, currentWordIndex, turnIndex, players);
                } else {
                    handleMistake(PLAYER_ID, `Oops! needed ${currentWord[currentWordIndex]}`);
                }
            } else {
                handleMistake(PLAYER_ID, "Should have said Sparkle!");
            }
        }
    };

    const handleMove = (pid: number, input: string, word: string, wIndex: number, tIndex: number, allPlayers: Player[]) => {
        speak(input === "SPARKLE" ? "Sparkle!" : input);

        if (input === "SPARKLE") {
            // End of chain
            // Rule: "Next person is out".
            const activePlayers = allPlayers.filter(p => !p.eliminated);
            const nextPlayerIndex = (tIndex + 1) % activePlayers.length;
            const eliminatedPlayer = activePlayers[nextPlayerIndex];

            setFeedback(`${eliminatedPlayer.name} is OUT!`);
            speak(`${eliminatedPlayer.name} is out!`);

            // Elimination Animation
            const newPlayers = allPlayers.map(p =>
                p.id === eliminatedPlayer.id ? { ...p, eliminated: true } : p
            );
            setPlayers(newPlayers);

            if (eliminatedPlayer.id === PLAYER_ID) {
                handleGameOver();
            } else {
                // Continue game with new round
                // Score up for surviving
                setScore(prev => prev + 50);
                setTimeout(() => {
                    if (newPlayers.filter(p => !p.eliminated).length === 1) {
                        // Only player left?
                        if (newPlayers.find(p => p.id === PLAYER_ID && !p.eliminated)) {
                            handleVictory();
                        } else {
                            // Should be impossible if player wasn't eliminated above
                            handleGameOver();
                        }
                    } else {
                        startRound(newPlayers);
                    }
                }, 2000);
            }

        } else {
            // Correct Letter
            setCurrentWordIndex(wIndex + 1);
            // Next Turn
            processTurn(tIndex + 1, word, wIndex + 1, allPlayers);
        }
    };

    const handleMistake = (pid: number, reason: string) => {
        const pName = players.find(p => p.id === pid)?.name;
        setFeedback(`${pName} messed up! (${reason})`);
        speak(`Oh no, ${pName}!`);

        // Elimination for mistake (Game variant)
        const newPlayers = players.map(p =>
            p.id === pid ? { ...p, eliminated: true } : p
        );
        setPlayers(newPlayers);

        if (pid === PLAYER_ID) {
            handleGameOver();
        } else {
            // Bot out
            setTimeout(() => {
                startRound(newPlayers);
            }, 2000);
        }
    };

    const handleVictory = () => {
        setGameState('VICTORY');
        speak("Sparkle Master! You won!");
        addXP(100);
        unlockBadge('spelling-bee-champ');
        confetti({ particleCount: 200, spread: 100 });
    };

    const handleGameOver = () => {
        setGameState('GAMEOVER');
        speak("Game Over!");
    };

    // Render Logic
    const activePlayers = players.filter(p => !p.eliminated);
    const currentPlayer = activePlayers[turnIndex];
    const isPlayerTurn = currentPlayer?.id === PLAYER_ID;

    // Determine relevant letters to show
    // We can show the whole alphabet or just a subset + distractions
    // For simplicity, let's show screen keyboard
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');

    return (
        <GameShell
            title="Spelling Sparkle"
            onExit={onBack}
            score={score}
            isGameOver={gameState === 'GAMEOVER' || gameState === 'VICTORY'}
            onRestart={startGame}
        >
            <div className="h-full w-full bg-indigo-900 relative flex flex-col items-center justify-between p-4 overflow-hidden">

                {/* Circle of Players */}
                <div className="w-full max-w-lg h-64 relative mt-8">
                    <AnimatePresence>
                        {activePlayers.map((p, i) => {
                            // Calculate Circle Position
                            const total = activePlayers.length;
                            const angle = (i / total) * 2 * Math.PI - (Math.PI / 2); // Start top
                            const radius = 100;
                            const x = Math.cos(angle) * radius; // Center is 0,0
                            const y = Math.sin(angle) * radius;

                            const isTurn = i === turnIndex;

                            return (
                                <motion.div
                                    key={p.id}
                                    layout
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{
                                        x: x,
                                        y: y,
                                        scale: isTurn ? 1.2 : 1,
                                        opacity: 1,
                                        zIndex: isTurn ? 10 : 1
                                    }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className={`absolute top-1/2 left-1/2 -ml-8 -mt-8 w-16 h-16 rounded-full border-4 ${isTurn ? 'border-white shadow-[0_0_20px_white]' : 'border-transparent'} ${p.color} flex flex-col items-center justify-center transition-all duration-300`}
                                >
                                    <UserIcon className="text-white w-8 h-8" />
                                    <span className="absolute -bottom-6 text-white text-xs font-bold bg-black/50 px-2 rounded">{p.name}</span>
                                    {/* Speech Bubble */}
                                    {isTurn && (
                                        <div className="absolute -top-10 bg-white text-black px-3 py-1 rounded-xl text-lg font-bold animate-bounce shadow-lg whitespace-nowrap">
                                            {p.isAi ? "..." : "thinking"}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Word Display */}
                <div className="flex flex-col items-center animate-pulse">
                    <span className="text-gray-400 uppercase tracking-widest mb-2">Spell The Word</span>
                    <div className="flex gap-2">
                        {currentWord.split('').map((char, i) => (
                            <div key={i} className={`w-10 h-14 border-b-4 flex items-center justify-center text-4xl font-black ${i < currentWordIndex ? 'text-white border-green-400' : 'text-white/20 border-white/20'
                                }`}>
                                {i < currentWordIndex ? char : '?'}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Controls (Only visible on player turn) */}
                <div className="w-full max-w-2xl bg-black/30 backdrop-blur-md rounded-t-3xl p-6 min-h-[300px] flex flex-col items-center justify-center relative transition-colors duration-300">
                    <div className="absolute top-0 transform -translate-y-1/2 bg-yellow-400 text-black font-bold px-6 py-2 rounded-full shadow-lg">
                        {feedback}
                    </div>

                    {isPlayerTurn && gameState === 'PLAYING' ? (
                        <div className="w-full">
                            <div className="flex justify-center mb-6">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePlayerInput("SPARKLE")}
                                    className={`px-8 py-4 rounded-2xl font-black text-xl flex items-center gap-2 shadow-xl ${currentWordIndex === currentWord.length
                                            ? 'bg-yellow-500 hover:bg-yellow-400 text-black animate-pulse'
                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                                        }`}
                                >
                                    <SparklesIcon /> SPARKLE!
                                </motion.button>
                            </div>

                            <div className="grid grid-cols-7 gap-2 sm:gap-3">
                                {alphabet.map(letter => (
                                    <button
                                        key={letter}
                                        onClick={() => handlePlayerInput(letter)}
                                        className="aspect-square bg-white text-indigo-900 rounded-lg font-bold text-lg sm:text-xl shadow-md hover:bg-indigo-100 active:scale-95 transition-transform"
                                    >
                                        {letter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-white/50 text-xl font-bold flex items-center gap-3">
                            {gameState === 'PLAYING' ? (
                                <>Waiting for other students... <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}><MicIcon /></motion.div></>
                            ) : gameState === 'VICTORY' ? (
                                <span className="text-green-400 text-3xl">YOU WON!</span>
                            ) : (
                                <span className="text-red-400 text-3xl">OUT!</span>
                            )}
                        </div>
                    )}
                </div>

                {gameState === 'START' && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="text-center">
                            <h1 className="text-5xl font-black text-yellow-400 mb-4 flex items-center justify-center gap-3"><SparklesIcon size={48} /> Sparkle</h1>
                            <p className="text-white mb-8 max-w-md mx-auto">Spell the word one letter at a time. If you finish the word, say <strong>SPARKLE</strong> to eliminate the next player!</p>
                            <button onClick={startGame} className="bg-purple-600 text-white px-12 py-4 rounded-2xl font-bold text-2xl hover:bg-purple-500 transition-colors">Join Circle</button>
                        </div>
                    </div>
                )}
            </div>
        </GameShell>
    );
};

export default SpellingSparkleGame;
