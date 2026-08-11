import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student } from '../../../types';
import { Timer, MapPin, Award, PauseIcon, CheckCircle, XCircle, Zap, Globe, LifeBuoy, Loader2 } from 'lucide-react';
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

interface AIRound { clue: string; options: string[]; correct: string; }

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

    // Current Problem — either a curated real-photo location, or an AI-generated
    // text clue round (used when we have fresh AI questions, since AI can't
    // reliably supply a real matching photo URL).
    const [currentLocation, setCurrentLocation] = useState<typeof LOCATIONS[0] | null>(LOCATIONS[0]);
    const [currentClue, setCurrentClue] = useState<string | null>(null);
    const [correctAnswer, setCorrectAnswer] = useState<string>(LOCATIONS[0].country);
    const [options, setOptions] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [disabledOptions, setDisabledOptions] = useState<string[]>([]);
    const [highScore, setHighScore] = useState(0);
    const [aiRounds, setAiRounds] = useState<AIRound[]>([]);
    const [loadingRounds, setLoadingRounds] = useState(false);

    /** Fetch fresh, never-repeating geography trivia from AI for this playthrough.
     * Falls back to the curated photo bank (silently, via empty aiRounds) on any failure. */
    const loadAIRounds = useCallback(async () => {
        setLoadingRounds(true);
        try {
            const { questions } = await api.getAIGameQuestions('geo-guesser', 'World Geography', MAX_ROUNDS);
            const rounds: AIRound[] = (questions || [])
                .filter((q: any) => q?.prompt && Array.isArray(q.options) && q.options.length === 4 && typeof q.answer === 'number')
                .map((q: any) => ({ clue: String(q.prompt), options: q.options.map(String), correct: String(q.options[q.answer]) }));
            setAiRounds(rounds.length >= MAX_ROUNDS ? rounds.slice(0, MAX_ROUNDS) : []);
        } catch {
            setAiRounds([]);
        } finally {
            setLoadingRounds(false);
        }
    }, []);

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

    const generateRound = useCallback((roundNum: number) => {
        const ai = aiRounds[roundNum - 1];
        if (ai) {
            setCurrentLocation(null);
            setCurrentClue(ai.clue);
            setCorrectAnswer(ai.correct);
            setOptions([...ai.options].sort(() => Math.random() - 0.5));
        } else {
            // Pick random location from the curated photo bank
            const randomLoc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
            setCurrentLocation(randomLoc);
            setCurrentClue(null);
            setCorrectAnswer(randomLoc.country);

            const allCountries = Array.from(new Set(LOCATIONS.map(l => l.country)));
            let wrongOptions = allCountries.filter(c => c !== randomLoc.country);
            wrongOptions = wrongOptions.sort(() => Math.random() - 0.5).slice(0, 3);
            setOptions([...wrongOptions, randomLoc.country].sort(() => Math.random() - 0.5));
        }
        setDisabledOptions([]);
        setTimeLeft(15);
        setFeedback(null);
    }, [aiRounds]);

    // Init First Round
    useEffect(() => {
        if (gameState === 'playing' && round === 1 && !feedback) generateRound(1);
    }, [gameState, round, generateRound]);

    const advanceOrFinish = () => {
        setTimeout(() => {
            if (round < MAX_ROUNDS) {
                const nextRound = round + 1;
                setRound(nextRound);
                generateRound(nextRound);
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

    const handleAnswer = (answer: string) => {
        if (feedback) return; // Prevent double clicks

        if (answer === correctAnswer) {
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
            toast.error(`Wrong! It was ${correctAnswer}`, { icon: '❌' });
        }

        advanceOrFinish();
    };

    const handleTimeout = () => {
        setStreak(0);
        setFeedback('wrong');
        toast.error(`Time's up! It was ${correctAnswer}`);

        advanceOrFinish();
    };

    const useLifeline = () => {
        if (lifelines <= 0 || feedback) return;

        // Remove 2 wrong options
        const wrongOptions = options.filter(o => o !== correctAnswer);
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
                    <h1 className="text-5xl font-black mb-4 tracking-tighter text-green-400">
                        GeoGuesser
                    </h1>
                    <p className="text-xl text-slate-300 mb-8 max-w-md mx-auto">
                        Identify {MAX_ROUNDS} locations from around the world. Speed matters!
                    </p>

                    <button
                        onClick={async () => { await loadAIRounds(); setGameState('playing'); }}
                        disabled={loadingRounds}
                        className="px-10 py-4 bg-green-500 hover:bg-green-400 rounded-full font-bold text-lg shadow-lg shadow-green-500/30 transition transform hover:scale-105 disabled:opacity-70 inline-flex items-center gap-2"
                    >
                        {loadingRounds ? <Loader2 className="w-5 h-5 animate-spin" /> : null} {loadingRounds ? 'Preparing locations…' : 'Start Game'}
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
                        onClick={async () => {
                            setScore(0);
                            setRound(1);
                            setStreak(0);
                            setLifelines(1);
                            setFeedback(null);
                            await loadAIRounds();
                            setGameState('playing');
                        }}
                        disabled={loadingRounds}
                        className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition disabled:opacity-70"
                    >
                        {loadingRounds ? 'Preparing…' : 'Play Again'}
                    </button>
                </div>
            </div>
        );
    }

    // --- UI PLAYING ---
    return (
        <div className="relative h-full w-full bg-slate-900 flex flex-col">
            {/* Background: a real landmark photo for curated rounds, or a clue card for AI rounds */}
            <div className="absolute inset-0 z-0">
                {currentLocation ? (
                    <img
                        src={currentLocation.image}
                        alt="Where is this?"
                        className="w-full h-full object-cover transition-opacity duration-500"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                            <Globe className="w-12 h-12 text-green-400 mx-auto mb-4 opacity-80" />
                            <p className="text-white/90 text-lg font-medium leading-relaxed">{currentClue}</p>
                        </div>
                    </div>
                )}
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

                        if (feedback && opt === correctAnswer) {
                            btnStyle = "bg-green-500 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)] scale-105 z-20";
                        } else if (feedback && opt !== correctAnswer && disabledOptions.includes(opt)) { // Was user selection? No easy way to track click in map without state
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
