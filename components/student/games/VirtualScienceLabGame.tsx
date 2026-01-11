import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { FlaskConicalIcon, FlameIcon, DropletsIcon, AlertTriangleIcon, SearchIcon, RotateCcwIcon } from 'lucide-react';

interface VirtualScienceLabGameProps {
    onBack: () => void;
}

type ChemicalType = 'liquid' | 'solid' | 'catalyst';

interface Chemical {
    id: string;
    name: string;
    formula: string;
    color: string;
    type: ChemicalType;
    ph?: number; // 0-14
    reactiveWith?: string[];
}

interface Experiment {
    id: number;
    title: string;
    description: string;
    targetResult: {
        color?: string; // Target hex/tailwind color class
        phRange?: [number, number];
        state?: string; // 'bubbling', 'exploded', 'precipitate'
    };
    requiredSteps: string[]; // Logic check mostly
    hint: string;
}

const CHEMICALS: Chemical[] = [
    { id: 'water', name: 'Distilled Water', formula: 'H₂O', color: 'bg-blue-100', type: 'liquid', ph: 7 },
    { id: 'acid', name: 'Hydrochloric Acid', formula: 'HCl', color: 'bg-transparent', type: 'liquid', ph: 1 },
    { id: 'base', name: 'Sodium Hydroxide', formula: 'NaOH', color: 'bg-transparent', type: 'liquid', ph: 14 },
    { id: 'indicator', name: 'Universal Indicator', formula: 'UI', color: 'bg-yellow-600', type: 'liquid' },
    { id: 'copper_sulfate', name: 'Copper Sulfate', formula: 'CuSO₄', color: 'bg-blue-500', type: 'solid' },
    { id: 'magnesium', name: 'Magnesium Strip', formula: 'Mg', color: 'bg-gray-400', type: 'solid' },
];

const EXPERIMENTS: Experiment[] = [
    {
        id: 1,
        title: "The Colors of pH",
        description: "Create a red acidic solution using the Universal Indicator.",
        targetResult: { color: 'red', phRange: [0, 4] },
        requiredSteps: ['indicator', 'acid'],
        hint: "Add Indicator to Water, then make it Acidic."
    },
    {
        id: 2,
        title: "Neutralization",
        description: "Turn a purple basic solution back to green (neutral).",
        targetResult: { color: 'green', phRange: [6, 8] },
        requiredSteps: ['indicator', 'base', 'acid'],
        hint: "Start with Base + Indicator (Purple), then carefully add Acid to neutralize."
    },
    {
        id: 3,
        title: "Fizzy Pop",
        description: "Create a reaction that produces gas bubbles (Hydrogen).",
        targetResult: { state: 'bubbling' },
        requiredSteps: ['acid', 'magnesium'],
        hint: "Acids react with reactive metals to produce Hydrogen gas."
    }
];

const VirtualScienceLabGame: React.FC<VirtualScienceLabGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [activeExperimentId, setActiveExperimentId] = useState(1);
    const [beakerContents, setBeakerContents] = useState<Chemical[]>([]);
    const [beakerPh, setBeakerPh] = useState(7);
    const [beakerColor, setBeakerColor] = useState('bg-blue-50'); // Default water-ish
    const [reactionState, setReactionState] = useState<'stable' | 'bubbling' | 'smoke'>('stable');
    const [feedback, setFeedback] = useState("Select an experiment to begin.");
    const [score, setScore] = useState(0);

    // Derived state for contents
    const hasIndicator = beakerContents.some(c => c.id === 'indicator');

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const resetBeaker = () => {
        setBeakerContents([]);
        setBeakerPh(7);
        setBeakerColor('bg-transparent');
        setReactionState('stable');
        setFeedback("Beaker emptied.");
    };

    const addChemical = (chem: Chemical) => {
        setBeakerContents(prev => [...prev, chem]);

        // Simulation Logic
        let newPh = beakerPh;
        let newColor = beakerColor;
        let newState: 'stable' | 'bubbling' | 'smoke' = 'stable';

        // 1. pH Calculation (Simplified mean approximation for kids logic)
        if (chem.ph !== undefined) {
            // If empty, take chemical ph
            if (beakerContents.length === 0) {
                newPh = chem.ph;
            } else {
                // Averaging logic - strictly simplified game logic
                // If adding acid to base -> move towards 7
                if (chem.ph < 7 && newPh > 7) newPh -= 3; // Neutralize down
                else if (chem.ph > 7 && newPh < 7) newPh += 3; // Neutralize up
                else if (chem.ph < 7) newPh = Math.max(1, newPh - 1); // More acidic
                else if (chem.ph > 7) newPh = Math.min(14, newPh + 1); // More basic
            }
        }

        // 2. Color Calculation
        // Always check indicator check first
        const willHaveIndicator = hasIndicator || chem.id === 'indicator';

        if (willHaveIndicator) {
            if (newPh < 3) newColor = 'bg-red-500';
            else if (newPh < 6) newColor = 'bg-orange-400';
            else if (newPh === 7) newColor = 'bg-green-500'; // Neutral
            else if (newPh < 11) newColor = 'bg-blue-500';
            else newColor = 'bg-purple-600';
        } else {
            // Mix physics
            if (chem.id === 'copper_sulfate') newColor = 'bg-blue-400';
            // Default transparent if just acid/water
        }

        // 3. Reaction Calculation
        // Acid + Magnesium = Bubbles
        const hasAcid = beakerContents.some(c => c.id === 'acid') || chem.id === 'acid';
        const hasMagnesium = beakerContents.some(c => c.id === 'magnesium') || chem.id === 'magnesium';

        if (hasAcid && hasMagnesium) {
            newState = 'bubbling';
            speak("Reaction started! Hydrogen gas produced.");
        }

        setBeakerPh(newPh);
        setBeakerColor(newColor);
        setReactionState(newState);

        checkExperimentCompletion(activeExperimentId, newPh, newState, newColor, [...beakerContents, chem]);
    };

    const checkExperimentCompletion = (expId: number, currentPh: number, currentState: string, currentColor: string, contents: Chemical[]) => {
        const exp = EXPERIMENTS.find(e => e.id === expId);
        if (!exp) return;

        let success = false;

        // Check Goals
        if (exp.targetResult.state && exp.targetResult.state === currentState) success = true;
        if (exp.targetResult.color) {
            // Simplified string match on color class for now, ideally strictly map logic
            if (currentColor.includes(exp.targetResult.color)) success = true;
        }
        if (exp.targetResult.phRange) {
            if (currentPh >= exp.targetResult.phRange[0] && currentPh <= exp.targetResult.phRange[1] && hasIndicator) success = true;
        }

        if (success) {
            setScore(prev => prev + 50);
            setFeedback("Experiment Complete! Great job!");
            speak("Experiment Success!");
            confetti();
            addXP(100);

            // Wait and next
            setTimeout(() => {
                if (activeExperimentId < EXPERIMENTS.length) {
                    setActiveExperimentId(prev => prev + 1);
                    resetBeaker();
                } else {
                    setFeedback("All Experiments Completed! You are a master scientist.");
                    unlockBadge('mad-scientist');
                }
            }, 3000);
        }
    };

    const activeExp = EXPERIMENTS.find(e => e.id === activeExperimentId);

    return (
        <GameShell
            title="Virtual Science Lab"
            onExit={onBack}
            score={score}
            isGameOver={false}
            onRestart={() => { resetBeaker(); setActiveExperimentId(1); setScore(0); }}
        >
            <div className="h-full w-full bg-slate-200 flex flex-col md:flex-row p-4 gap-4 overflow-hidden relative">

                {/* Experiment Info Panel */}
                <div className="w-full md:w-1/3 bg-white rounded-2xl p-6 shadow-xl flex flex-col gap-4 border-l-8 border-cyan-500">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FlaskConicalIcon className="text-cyan-600" />
                        Lab Notebook
                    </h2>

                    {activeExp ? (
                        <div className="flex-1 flex flex-col gap-4">
                            <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                                <h3 className="font-bold text-cyan-800 uppercase text-xs tracking-wider">Current Experiment</h3>
                                <p className="text-xl font-bold text-cyan-900 leading-tight">{activeExp.title}</p>
                            </div>

                            <p className="text-slate-600 font-medium">{activeExp.description}</p>

                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex gap-2 items-start">
                                <SearchIcon size={18} className="text-yellow-600 mt-1 shrink-0" />
                                <p className="text-sm text-yellow-800 italic">{activeExp.hint}</p>
                            </div>

                            <div className="mt-auto">
                                <span className="text-xs font-bold text-slate-400 uppercase">Beaker Contents:</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {beakerContents.length === 0 && <span className="text-slate-300 italic">Empty</span>}
                                    {beakerContents.map((c, i) => (
                                        <span key={i} className={`text-xs px-2 py-1 rounded shadow-sm border ${c.type === 'liquid' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                            {c.formula}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center text-slate-400">
                            <p>All simulations completed!</p>
                        </div>
                    )}
                </div>

                {/* Lab Bench (Main Interact Area) */}
                <div className="flex-1 bg-slate-300 rounded-2xl shadow-inner relative overflow-hidden flex flex-col items-center justify-end pb-12 border-4 border-slate-400">
                    {/* Background Detail */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[length:40px_40px]" />

                    {/* Feedback Toast */}
                    <div className="absolute top-4 bg-black/80 text-white px-6 py-2 rounded-full font-bold shadow-lg animate-fade-in-down z-20">
                        {feedback}
                    </div>

                    {/* Beaker Group */}
                    <div className="relative mb-8 group">
                        {/* Beaker Glass */}
                        <div className="w-48 h-64 border-4 border-white/50 bg-white/10 backdrop-blur-sm rounded-b-3xl relative overflow-hidden z-10 flex items-end">
                            {/* Liquid Level */}
                            <motion.div
                                animate={{ height: `${Math.min(beakerContents.length * 20, 90)}%` }}
                                className={`w-full transition-colors duration-1000 ${beakerColor} opacity-80 relative`}
                            >
                                {/* Bubbles Animation */}
                                {reactionState === 'bubbling' && (
                                    <>
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className="absolute bottom-0 w-3 h-3 bg-white rounded-full animate-bubble"
                                                style={{
                                                    left: `${Math.random() * 100}%`,
                                                    animationDelay: `${Math.random()}s`,
                                                    animationDuration: `${1 + Math.random()}s`
                                                }}
                                            />
                                        ))}
                                    </>
                                )}
                            </motion.div>

                            {/* Graduation marks */}
                            <div className="absolute right-0 top-10 bottom-10 w-8 border-l border-white/30 flex flex-col justify-between py-2 text-[10px] text-white/50 font-mono text-right pr-1">
                                <span>200ml —</span>
                                <span>150ml —</span>
                                <span>100ml —</span>
                                <span>50ml —</span>
                            </div>
                        </div>

                        {/* Stand/Heat Source */}
                        <div className="w-full h-4 bg-gray-400 rounded-full mt-1 bg-gradient-to-r from-gray-500 to-gray-300" />

                        {/* Reset Button (Pour out) */}
                        <button onClick={resetBeaker} className="absolute -right-16 top-0 p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-md tooltip" data-tip="Dump Contents">
                            <RotateCcwIcon size={20} />
                        </button>
                    </div>

                    {/* Shelf / Inventory */}
                    <div className="w-full px-8 grid grid-cols-3 sm:grid-cols-6 gap-4 z-20">
                        {CHEMICALS.map(chem => (
                            <button
                                key={chem.id}
                                onClick={() => addChemical(chem)}
                                className="flex flex-col items-center gap-2 group transition-transform active:scale-95 hover:-translate-y-2"
                            >
                                <div className={`w-14 h-20 ${chem.type === 'liquid' ? 'rounded-t-sm rounded-b-xl border-x-2 border-b-2 border-white/40 bg-white/20' : 'rounded-md bg-white border border-gray-300 shadow-sm'} relative flex items-center justify-center overflow-hidden`}>
                                    {/* Chemical Visual */}
                                    {chem.type === 'liquid' ? (
                                        <div className={`absolute bottom-0 w-full h-3/4 ${chem.color} opacity-70`} />
                                    ) : (
                                        <div className={`w-8 h-8 rounded-full ${chem.color} shadow-inner`} />
                                    )}
                                    <span className="relative z-10 font-bold font-mono text-xs drop-shadow-md text-slate-800 mix-blend-hard-light">{chem.formula}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-600 text-center leading-none max-w-[80px] group-hover:text-slate-900">{chem.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* Global style for bubble animation */}
            <style>{`
                @keyframes bubble {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
                }
                .animate-bubble {
                    animation: bubble infinite ease-in;
                }
            `}</style>
        </GameShell>
    );
};

export default VirtualScienceLabGame;
