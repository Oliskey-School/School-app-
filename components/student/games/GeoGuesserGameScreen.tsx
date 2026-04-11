import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student } from '../../../types';
import { Timer, MapPin, Award, PauseIcon, CheckCircle, XCircle, Zap, Globe, LifeBuoy } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'react-hot-toast';

interface GeoGuesserGameScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    student?: Student;
}

// --- DATASET ---
const LOCATIONS = [
    { id: 1, name: 'Eiffel Tower', city: 'Paris', country: 'France', continent: 'Europe', image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce7859?auto=format&fit=crop&w=800&q=80' },
    { id: 2, name: 'Statue of Liberty', city: 'New York', country: 'USA', continent: 'North America', image: 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?auto=format&fit=crop&w=800&q=80' },
    { id: 3, name: 'Taj Mahal', city: 'Agra', country: 'India', continent: 'Asia', image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80' },
    { id: 4, name: 'Great Wall of China', city: 'Beijing', country: 'China', continent: 'Asia', image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80' },
    { id: 5, name: 'Sydney Opera House', city: 'Sydney', country: 'Australia', continent: 'Oceania', image: 'https://images.unsplash.com/photo-1624138784181-dc7f5b75e52e?auto=format&fit=crop&w=800&q=80' },
    { id: 6, name: 'Colosseum', city: 'Rome', country: 'Italy', continent: 'Europe', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80' },
    { id: 7, name: 'Pyramids of Giza', city: 'Giza', country: 'Egypt', continent: 'Africa', image: 'https://images.unsplash.com/photo-1539650116455-251f9351a9ce?auto=format&fit=crop&w=800&q=80' },
    { id: 8, name: 'Machu Picchu', city: 'Cusco', country: 'Peru', continent: 'South America', image: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&w=800&q=80' },
    { id: 9, name: 'Christ the Redeemer', city: 'Rio de Janeiro', country: 'Brazil', continent: 'South America', image: 'https://images.unsplash.com/photo-1635234732107-16d7a424263f?auto=format&fit=crop&w=800&q=80' },
    { id: 10, name: 'Santorini', city: 'Santorini', country: 'Greece', continent: 'Europe', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80' },
    { id: 11, name: 'Mount Fuji', city: 'Tokyo', country: 'Japan', continent: 'Asia', image: 'https://images.unsplash.com/photo-1576675784201-0e142b423952?auto=format&fit=crop&w=800&q=80' },
    { id: 12, name: 'Big Ben', city: 'London', country: 'UK', continent: 'Europe', image: 'https://images.unsplash.com/photo-1529655683826-aba9b3e77383?auto=format&fit=crop&w=800&q=80' },
    { id: 13, name: 'Burj Khalifa', city: 'Dubai', country: 'UAE', continent: 'Asia', image: 'https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?auto=format&fit=crop&w=800&q=80' },
    { id: 14, name: 'Table Mountain', city: 'Cape Town', country: 'South Africa', continent: 'Africa', image: 'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=800&q=80' },
    { id: 15, name: 'Niagara Falls', city: 'Ontario', country: 'Canada', continent: 'North America', image: 'https://images.unsplash.com/photo-1533094602577-198d3d964895?auto=format&fit=crop&w=800&q=80' }
];

type GameState = 'start' | 'playing' | 'paused' | 'finished';

const GeoGuesserGameScreen: React.FC<GeoGuesserGameScreenProps> = ({ navigateTo, student }) => {
    // Game State
    const [gameState, setGameState] = useState<GameState>('start');
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(1);
    const MAX_ROUNDS = 5;

    // Timer
    const [timeLeft, setTimeLeft] = useState(15);

    // Streaks & Multipliers
    const [streak, setStreak] = useState(0);
    const [lifelines, setLifelines] = useState(1); // One 50/50 hint

    // Current Problem
    const [currentLocation, setCurrentLocation] = useState(LOCATIONS[0]);
    const [options, setOptions] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
    const [highScore, setHighScore] = useState(0);

    // Load High Score
    useEffect(() => {
        const saved = localStorage.getItem('geoguesser_highscore');
        if (saved) setHighScore(parseInt(saved));
    }, []);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('geoguesser_highscore', score.toString());
        }
    }, [score, highScore]);

    // --- GAME LOOP ---

    // Timer Logic
    useEffect(() => {
        if (gameState === 'playing' && timeLeft > 0) {
            const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
            return () => clearInterval(timer);
        } else if (gameState === 'playing' && timeLeft === 0) {
            handleTimeout();
        }
    }, [gameState, timeLeft]);

    const generateRound = useCallback(() => {
        // Pick random location
        const randomLoc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
        setCurrentLocation(randomLoc);

        // Generate Options (Mix of Countries or Cities based on difficulty/randomness)
        // Let's guess Countries for now
        const correctAnswer = randomLoc.country;
        const allCountries = Array.from(new Set(LOCATIONS.map(l => l.country)));

        let wrongOptions = allCountries.filter(c => c !== correctAnswer);
        // Shuffle and pick 3 wrong
        wrongOptions = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 3);

        const roundOptions = [...wrongOptions, correctAnswer].sort(() => Math.random() - 0.5);

        setOptions(roundOptions);
        setDisabledOptions([]);
        setTimeLeft(15);
        setFeedback(null);
    }, []);

    // Init First Round
    useEffect(() => {
        if (gameState === 'playing' && round === 1 && !feedback) generateRound();
    }, [gameState, round, generateRound]);

    const handleAnswer = (answer: string) => {
        if (feedback) return; // Prevent double clicks

        if (answer === currentLocation.country) {
            // Correct
            const timeBonus = timeLeft * 10;
            const roundScore = 100 + timeBonus + (streak * 20);
            setScore(s => s + roundScore);
            setStreak(s => s + 1);
            setFeedback('correct');
            toast.success(`Correct! +${roundScore} pts`, { icon: '🌍' });
        } else {
            // Wrong
            setStreak(0);
            setFeedback('wrong');
            toast.error(`Wrong! It was ${currentLocation.country}`, { icon: '❌' });
        }

        setTimeout(() => {
            if (round < MAX_ROUNDS) {
                setRound(r => r + 1);
                generateRound();
            } else {
                setGameState('finished');
                // Save score
                if (score > 0) {
                    api.submitGameScore({
                        game_id: 'geoguesser',
                        game_name: 'GeoGuesser',
                        score,
                        metadata: { streak, grade: student?.grade }
                    }).catch(console.error);
                }
            }
        }, 1500); // 1.5s delay to see result
    };

    const handleTimeout = () => {
        setStreak(0);
        setFeedback('wrong');
        toast.error(`Time's up! It was ${currentLocation.country}`);

        setTimeout(() => {
            if (round < MAX_ROUNDS) {
                setRound(r => r + 1);
                generateRound();
            } else {
                setGameState('finished');
                // Save score
                if (score > 0) {
                    api.submitGameScore({
                        game_id: 'geoguesser',
                        game_name: 'GeoGuesser',
                        score,
                        metadata: { streak, grade: student?.grade }
                    }).catch(console.error);
                }
            }
        }, 1500);
    };

    const useLifeline = () => {
        if (lifelines <= 0 || feedback) return;

        // Remove 2 wrong options
        const wrongOptions = options.filter(o => o !== currentLocation.country);
        const toDisable = wrongOptions.slice(0, 2);

        setDisabledOptions(toDisable);
        setLifelines(l => l - 1);
        toast('50/50 Used!', { icon: '💡' });
    };

    // --- UI START ---
    if (gameState === 'start') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-6 text-center relative overflow-hidden">
                <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1080&q=80" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" alt="bg" />

                <div className="relative z-10">
                    <div className="w-24 h-24 bg-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-2xl mx-auto rotate-12">
                        <MapPin className="w-12 h-12 text-white" />
                    </div>
                    <h1 className="text-5xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-teal-400">
                        GeoGuesser
                    </h1>
                    <p className="text-xl text-slate-300 mb-8 max-w-md mx-auto">
                        Identify {MAX_ROUNDS} locations from around the world. Speed matters!
                    </p>

                    <button onClick={() => setGameState('playing')} className="px-10 py-4 bg-green-500 hover:bg-green-400 rounded-full font-bold text-lg shadow-lg shadow-green-500/30 transition transform hover:scale-105">
                        Start Game
                    </button>

                    <button onClick={() => navigateTo('gamesHub', 'Games Hub')} className="block mt-6 text-sm text-slate-400 hover:text-white transition">
                        Back to Hub
                    </button>
                </div>
            </div>
        );
    }

    // --- UI FINISHED ---
    if (gameState === 'finished') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-6 text-center">
                <Award className="w-24 h-24 text-yellow-400 mb-6 animate-bounce" />
                <h2 className="text-4xl font-bold mb-2">Adventure Complete!</h2>
                <div className="text-7xl font-black text-green-400 mb-6">{score}</div>

                <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm mb-8">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Locations Found</span>
                        <span className="font-bold">{score > 0 ? '5/5' : '0/5'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Best Streak</span>
                        <span className="font-bold text-orange-400">{streak} 🔥</span>
                    </div>
                </div>

                <div className="flex gap-4 w-full max-w-sm">
                    <button onClick={() => navigateTo('gamesHub', 'Games Hub')} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition">Exit</button>
                    <button
                        onClick={() => {
                            setScore(0);
                            setRound(1);
                            setStreak(0);
                            setLifelines(1);
                            setGameState('playing');
                            generateRound();
                        }}
                        className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        );
    }

    // --- UI PLAYING ---
    return (
        <div className="relative h-full w-full bg-slate-900 flex flex-col">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src={currentLocation.image}
                    alt="Where is this?"
                    className="w-full h-full object-cover transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-transparent to-slate-900/90"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center p-4">
                <div className="bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                    <Globe className="w-4 h-4 text-green-400" />
                    <span className="font-bold text-white">Round {round}/{MAX_ROUNDS}</span>
                </div>

                <div className="flex flex-col items-center">
                    <div className={`text-4xl font-black ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'} drop-shadow-md`}>
                        {timeLeft}
                    </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                    <span className="font-mono font-bold text-yellow-400">{score}</span>
                </div>
            </div>

            {/* Hint / Streak Area */}
            <div className="relative z-10 px-4 mt-2 flex justify-between">
                <button
                    onClick={useLifeline}
                    disabled={lifelines === 0}
                    className={`p-2 rounded-full transition ${lifelines > 0 ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-slate-700 text-slate-500'}`}
                >
                    <LifeBuoy className="w-5 h-5" />
                </button>

                {streak > 1 && (
                    <div className="bg-orange-500/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-lg border border-orange-300">
                        {streak} Streak! x{1 + (streak * 0.1)}
                    </div>
                )}
            </div>

            {/* Main Content (Spacer) */}
            <div className="flex-1"></div>

            {/* Guess Area */}
            <div className="relative z-10 p-4 pb-8 w-full max-w-2xl mx-auto">
                <h3 className="text-center text-white/90 text-sm mb-4 font-medium uppercase tracking-widest drop-shadow-sm">
                    Which country is this location in?
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    {options.map((opt, idx) => {
                        const isDisabled = disabledOptions.includes(opt);
                        let btnStyle = "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20";

                        if (feedback && opt === currentLocation.country) {
                            btnStyle = "bg-green-500 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] scale-105 z-20";
                        } else if (feedback && opt !== currentLocation.country && disabledOptions.includes(opt)) { // Was user selection? No easy way to track click in map without state
                            // Simplified: Just dim others
                            btnStyle = "opacity-50 bg-slate-800/50 border-transparent text-slate-500";
                        }

                        if (isDisabled) {
                            btnStyle = "opacity-20 cursor-not-allowed bg-black/20 border-transparent";
                        }

                        return (
                            <button
                                key={idx}
                                disabled={!!feedback || isDisabled}
                                onClick={() => handleAnswer(opt)}
                                className={`h-16 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 ${btnStyle}`}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>

                <div className="text-center mt-6">
                    <button onClick={() => setGameState('start')} className="text-white/50 text-xs hover:text-white transition">
                        Give Up
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeoGuesserGameScreen;
