import React, { useState } from 'react';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import { User, ScrollText, Play, ArrowRight, UserCircle2, Mic2, Star, Sparkles } from 'lucide-react';
import { api } from '../../../lib/api';
import confetti from 'canvas-confetti';

interface HistoricalHotSeatGameProps {
    onBack: () => void;
}

const HISTORICAL_FIGURES = [
    {
        id: 1,
        name: 'Albert Einstein',
        era: '1879 - 1955',
        role: 'Genius Physicist',
        facts: [
            'I developed the theory of relativity.',
            'I won the Nobel Prize in Physics in 1921.',
            'My famous equation is E = mc².',
            'I was born in Germany but moved to the USA.',
            'I played the violin.'
        ],
        challenge: "Speak with a wild, eccentric accent and mess up your hair!",
        image: 'https://images.unsplash.com/photo-1534067783741-512d0e11d99d?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
        id: 2,
        name: 'Queen Amina',
        era: 'Mid-16th Century',
        role: 'Warrior Queen',
        facts: [
            'I was a Hausa warrior queen of the city-state Zazzau.',
            'I expanded the territory of the Hausa people.',
            'I am known as "Amina, daughter of Nikatau, a woman as capable as a man".',
            'I built fortified walls around cities, known as "ganuwar Amina".',
            'I ruled for 34 years.'
        ],
        challenge: "Stand tall, use a booming voice, and command respect like a Queen!",
        image: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
        id: 3,
        name: 'Nelson Mandela',
        era: '1918 - 2013',
        role: 'Freedom Fighter',
        facts: [
            'I was the first Black head of state of South Africa.',
            'I spent 27 years in prison on Robben Island.',
            'I won the Nobel Peace Prize in 1993.',
            'I fought against apartheid.',
            'My clan name is Madiba.'
        ],
        challenge: "Speak slowly, wisely, and with a gentle smile.",
        image: 'https://images.unsplash.com/photo-1555811400-f1db7cb4c09b?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    },
    {
        id: 4,
        name: 'Cleopatra',
        era: '69 BC - 30 BC',
        role: 'Pharaoh of Egypt',
        facts: [
            'I was the last active ruler of the Ptolemaic Kingdom of Egypt.',
            'I could speak over a dozen languages.',
            'I formed alliances with Julius Caesar and Mark Antony.',
            'I am famous for my intelligence and charm.',
            'I ruled Egypt for 21 years.'
        ],
        challenge: "Act extremely dramatic and strike poses often!",
        image: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=400&auto=format&fit=crop&q=60'
    }
];

const HistoricalHotSeatGame: React.FC<HistoricalHotSeatGameProps> = ({ onBack }) => {
    const [currentFigureIndex, setCurrentFigureIndex] = useState(0);
    const [gameState, setGameState] = useState<'intro' | 'reveal' | 'acting'>('intro');
    const { addXP } = useGamification();

    const figure = HISTORICAL_FIGURES[currentFigureIndex];

    const startGame = () => {
        setGameState('reveal');
    };

    const startActing = () => {
        setGameState('acting');
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 }
        });
    };

    const nextCharacter = () => {
        setGameState('reveal');
        setCurrentFigureIndex((prev) => (prev + 1) % HISTORICAL_FIGURES.length);
        addXP(50);

        // PERSIST TO DATABASE
        api.submitGameScore({
            game_id: 'historical-hotseat',
            game_name: 'Historical Hot Seat',
            score: 100, // Fixed score per character
            metadata: {
                character: figure.name,
                characterId: figure.id
            }
        }).catch(err => console.error("Failed to save hotseat score:", err));
    };

    return (
        <GameShell title="Time Travel TV: Hot Seat!" onExit={onBack} score={0} isGameOver={false} onRestart={() => { }}>
            <div className="h-full bg-indigo-950 p-4 md:p-8 flex flex-col items-center justify-center overflow-y-auto relative">
                {/* Studio Lights Effect */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-800/50 via-indigo-950 to-indigo-950 pointer-events-none"></div>

                <div className="max-w-3xl w-full relative z-10">

                    {gameState === 'intro' && (
                        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-12 text-center border-8 border-yellow-400 rotate-1 transform hover:rotate-0 transition-transform duration-500">
                            <div className="w-24 h-24 md:w-32 md:h-32 mx-auto bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 animate-bounce">
                                <Mic2 size={48} className="md:w-16 md:h-16" />
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-indigo-900 mb-4 tracking-tight">TIME TRAVEL TV</h2>
                            <p className="text-lg md:text-xl text-indigo-600 font-bold mb-8">
                                "Welcome to the hottest show in history! You are the Mystery Guest. Can you fool the audience?"
                            </p>
                            <button
                                onClick={startGame}
                                className="px-8 py-4 md:px-10 md:py-5 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-black text-xl md:text-2xl hover:scale-105 transition-transform shadow-xl animate-pulse"
                            >
                                ENTER THE STUDIO! 🎬
                            </button>
                        </div>
                    )}

                    {gameState === 'reveal' && (
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-indigo-300 animate-slide-in-up">
                            <div className="bg-indigo-600 p-8 text-center text-white">
                                <h3 className="text-2xl font-bold mb-2 text-indigo-200">Your Secret Identity Is...</h3>
                                <div className="text-6xl my-4">🤫</div>
                                <p className="text-sm font-medium opacity-80">Don't show this screen to anyone else!</p>
                            </div>
                            <div className="p-8 text-center">
                                <button
                                    onClick={startActing}
                                    className="w-full py-6 bg-indigo-100 text-indigo-800 rounded-2xl font-black text-xl hover:bg-indigo-200 transition-colors border-2 border-indigo-200 dashed"
                                >
                                    TAP TO REVEAL <br /> <span className="text-sm font-normal text-indigo-500">(Only if you are the actor)</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {gameState === 'acting' && (
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-yellow-400">
                            <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
                                <div>
                                    <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">On Air Now</p>
                                    <h2 className="text-3xl font-black">{figure.name}</h2>
                                    <p className="text-indigo-200 text-sm">{figure.role} • {figure.era}</p>
                                </div>
                                <div className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded animate-pulse">
                                    LIVE
                                </div>
                            </div>

                            <div className="p-6 md:p-8">
                                {/* ACTING CHALLENGE */}
                                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6 transform -rotate-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <Sparkles className="text-yellow-600" fill="currentColor" />
                                        <h3 className="font-black text-yellow-800 uppercase">Acting Challenge!</h3>
                                    </div>
                                    <p className="text-lg font-bold text-gray-800 italic">"{figure.challenge}"</p>
                                </div>

                                <div className="flex items-start gap-4 mb-4">
                                    <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600 shrink-0">
                                        <ScrollText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-700 mb-1">Cheat Sheet (Facts)</h3>
                                        <ul className="space-y-2">
                                            {figure.facts.map((fact, index) => (
                                                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                                    <span className="font-bold text-indigo-400">•</span>
                                                    {fact}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                                    <button
                                        onClick={nextCharacter}
                                        className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-colors shadow-lg hover:scale-105"
                                    >
                                        Next Guest <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </GameShell>
    );
};

export default HistoricalHotSeatGame;
