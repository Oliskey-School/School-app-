import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { BriefcaseIcon, UserIcon, QuoteIcon, CheckIcon, XIcon, AwardIcon } from 'lucide-react';

interface SharkTankGameProps {
    onBack: () => void;
}

interface Evidence {
    id: string;
    text: string;
    strength: 'weak' | 'strong' | 'irrelevant';
}

interface PitchScenario {
    id: string;
    book: string;
    thesis: string;
    context: string;
    evidenceOptions: Evidence[];
}

const SCENARIOS: PitchScenario[] = [
    {
        id: 'romeo_juliet',
        book: 'Romeo and Juliet',
        thesis: "Ideally, Friar Laurence is most to blame for the tragedy, not the feud.",
        context: "You are pitching to a panel of literary critics. Prove that the Friar's hasty actions caused the doom.",
        evidenceOptions: [
            { id: 'ev1', text: "He married them secretly within 24 hours of meeting.", strength: 'strong' },
            { id: 'ev2', text: "He gave Juliet the sleeping potion without telling Romeo clearly.", strength: 'strong' },
            { id: 'ev3', text: "Romeo was sad about Rosaline at the start.", strength: 'irrelevant' },
            { id: 'ev4', text: "The Prince banished Romeo.", strength: 'weak' } // Weak because it's not the Friar's direct fault, though related
        ]
    },
    {
        id: 'animal_farm',
        book: 'Animal Farm',
        thesis: "Napoleon represents not just Stalin, but the corruption of all absolute power.",
        context: "Convince the Sharks that Orwell's message is universal, not just specific to Russia.",
        evidenceOptions: [
            { id: 'ev1', text: "The pigs start walking on two legs and wearing clothes.", strength: 'strong' },
            { id: 'ev2', text: "He rewrites the Seven Commandments to suit his needs.", strength: 'strong' },
            { id: 'ev3', text: "Boxer the horse worked very hard.", strength: 'weak' }, // True, but doesn't prove the specific thesis about Napoleon's universal corruption
            { id: 'ev4', text: "The farm was originally called Manor Farm.", strength: 'irrelevant' }
        ]
    }
];

const SHARKS = [
    { name: "Mr. Strict", personality: "Demands textual accuracy.", avatar: "👨‍🏫" },
    { name: "Ms. Theme", personality: "Loves deep symbolic meaning.", avatar: "👩‍🏫" },
    { name: "Critic Carl", personality: "Hard to impress.", avatar: "🧐" }
];

const SharkTankGame: React.FC<SharkTankGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [scenarioIndex, setScenarioIndex] = useState(0);
    const [selectedEvidence, setSelectedEvidence] = useState<string[]>([]);
    const [gameState, setGameState] = useState<'PREP' | 'PITCHING' | 'FEEDBACK'>('PREP');
    const [sharkFeedback, setSharkFeedback] = useState<string[]>([]);
    const [score, setScore] = useState(0);

    const currentScenario = SCENARIOS[scenarioIndex];

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const toggleEvidence = (id: string) => {
        if (selectedEvidence.includes(id)) {
            setSelectedEvidence(prev => prev.filter(e => e !== id));
        } else {
            if (selectedEvidence.length < 2) { // Max 2 pieces of evidence
                setSelectedEvidence(prev => [...prev, id]);
            }
        }
    };

    const submitPitch = () => {
        setGameState('PITCHING');

        let sharkComments: string[] = [];
        let pitchScore = 0;

        const chosenEvidence = currentScenario.evidenceOptions.filter(e => selectedEvidence.includes(e.id));
        const strongCount = chosenEvidence.filter(e => e.strength === 'strong').length;
        const weakCount = chosenEvidence.filter(e => e.strength === 'weak').length;
        const irrelevantCount = chosenEvidence.filter(e => e.strength === 'irrelevant').length;

        // Logic for feedback
        if (strongCount === 2) {
            pitchScore = 1000;
            sharkComments = [
                "Mr. Strict: 'Excellent citation of the text.'",
                "Ms. Theme: 'You really captured the essence of the tragedy.'",
                "Critic Carl: '...I actually liked it. Deal.'"
            ];
            speak("Incredible pitch! All sharks are on board.");
        } else if (strongCount === 1 && weakCount === 1) {
            pitchScore = 500;
            sharkComments = [
                "Mr. Strict: 'One point was good, the other lacked substance.'",
                "Critic Carl: 'I'm on the fence.'"
            ];
            speak("Good pitch, but could be stronger.");
        } else if (irrelevantCount > 0) {
            pitchScore = 100;
            sharkComments = [
                "Ms. Theme: 'What does that have to do with the thesis?'",
                "Critic Carl: 'I'm out.'"
            ];
            speak("That evidence was irrelevant. The sharks are unimpressed.");
        } else {
            pitchScore = 200;
            sharkComments = ["The sharks look confused by your weak arguments."];
            speak("Weak argument.");
        }

        setTimeout(() => {
            setSharkFeedback(sharkComments);
            setScore(prev => prev + pitchScore);
            setGameState('FEEDBACK');

            if (pitchScore >= 500) {
                confetti();
                addXP(50);
            }
        }, 2000);
    };

    const nextScenario = () => {
        if (scenarioIndex < SCENARIOS.length - 1) {
            setScenarioIndex(prev => prev + 1);
            setSelectedEvidence([]);
            setGameState('PREP');
            setSharkFeedback([]);
        } else {
            unlockBadge('literary-shark');
            speak("You've conquered the Shark Tank!");
            // Just generic end state for now
            setGameState('PREP'); // Reset or show end screen loop
            setScenarioIndex(0);
            setSelectedEvidence([]);
            setScore(0);
        }
    };

    return (
        <GameShell
            title="Literary Analysis Shark Tank"
            onExit={onBack}
            score={score}
            isGameOver={false}
            onRestart={() => {
                setScenarioIndex(0);
                setScore(0);
                setSelectedEvidence([]);
                setGameState('PREP');
            }}
        >
            <div className="h-full w-full bg-slate-100 flex flex-col p-4 overflow-hidden relative font-sans">

                {/* Sharks Panel */}
                <div className="flex justify-center gap-4 mb-6">
                    {SHARKS.map((shark, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <div className="text-4xl bg-white rounded-full p-4 shadow-lg border-2 border-slate-200 mb-2">
                                {shark.avatar}
                            </div>
                            <div className="bg-slate-800 text-white text-xs px-3 py-1 rounded-full font-bold">
                                {shark.name}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Desk */}
                <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-w-4xl mx-auto w-full border-t-8 border-blue-600">

                    {/* Header: Thesis */}
                    <div className="bg-blue-50 p-6 border-b border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                            <BriefcaseIcon className="text-blue-600" size={20} />
                            <span className="text-blue-800 font-bold uppercase tracking-wider text-sm">Your Pitch Context</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">"{currentScenario.thesis}"</h2>
                        <p className="text-slate-600 italic">{currentScenario.context}</p>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 relative">
                        {gameState === 'PREP' && (
                            <div className="h-full flex flex-col">
                                <h3 className="font-bold text-slate-500 mb-4 flex items-center gap-2">
                                    <QuoteIcon size={16} />
                                    Select 2 Best Pieces of Evidence:
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentScenario.evidenceOptions.map((ev) => {
                                        const isSelected = selectedEvidence.includes(ev.id);
                                        return (
                                            <button
                                                key={ev.id}
                                                onClick={() => toggleEvidence(ev.id)}
                                                className={`p-4 rounded-xl text-left border-2 transition-all ${isSelected
                                                        ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]'
                                                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}>
                                                        Exhibit {ev.id.replace('ev', '')}
                                                    </span>
                                                    {isSelected && <CheckIcon size={16} className="text-blue-600" />}
                                                </div>
                                                <p className="text-slate-800 font-medium">{ev.text}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto pt-6 flex justify-end">
                                    <button
                                        disabled={selectedEvidence.length !== 2}
                                        onClick={submitPitch}
                                        className="bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:bg-blue-500 transition-all flex items-center gap-2"
                                    >
                                        Enter the Tank <BriefcaseIcon size={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {gameState === 'PITCHING' && (
                            <div className="h-full flex flex-col items-center justify-center text-center animate-pulse">
                                <h3 className="text-3xl font-black text-slate-800 mb-4">Pitching to Sharks...</h3>
                                <p className="text-slate-500">Presenting evidence...</p>
                            </div>
                        )}

                        {gameState === 'FEEDBACK' && (
                            <div className="h-full flex flex-col items-center justify-center text-center animate-fade-in-up">
                                <h3 className="text-2xl font-black text-slate-800 mb-6">The Sharks Have Spoken</h3>

                                <div className="space-y-4 max-w-lg w-full mb-8">
                                    {sharkFeedback.map((comment, i) => (
                                        <div key={i} className="bg-slate-100 p-4 rounded-xl border-l-4 border-slate-800 text-left font-medium text-slate-700 shadow-sm">
                                            {comment}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-4">
                                    <button onClick={() => { setGameState('PREP'); setSelectedEvidence([]); }} className="text-slate-500 font-bold hover:text-slate-700">
                                        Try Again
                                    </button>
                                    <button onClick={nextScenario} className="bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-500 shadow-lg flex items-center gap-2">
                                        Next Pitch <AwardIcon size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </GameShell>
    );
};

export default SharkTankGame;
