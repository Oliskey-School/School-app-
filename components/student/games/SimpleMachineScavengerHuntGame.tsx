import React, { useState } from 'react';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import { CheckCircle2, Circle, Camera, Info, Trophy } from 'lucide-react';
import { api } from '../../../lib/api';
import confetti from 'canvas-confetti';

interface SimpleMachineScavengerHuntGameProps {
    onBack: () => void;
}

interface ScavengerItem {
    id: string;
    name: string;
    description: string;
    example: string;
    found: boolean;
}

const ITEMS: ScavengerItem[] = [
    { id: 'lever', name: 'Lever', description: 'A stiff bar that rests on a support called a fulcrum.', example: 'Seesaw, Scissors, Door handle', found: false },
    { id: 'wheel', name: 'Wheel & Axle', description: 'A wheel with a rod (axle) through its center.', example: 'Car tires, Doorknob, Pizza cutter', found: false },
    { id: 'pulley', name: 'Pulley', description: 'A wheel with a groove that holds a rope or cable.', example: 'Flagpole, Window blinds, Crane', found: false },
    { id: 'plane', name: 'Inclined Plane', description: 'A slanted surface connecting a lower level to a higher level.', example: 'Ramp, Slide, Stairs', found: false },
    { id: 'wedge', name: 'Wedge', description: 'An object with at least one slanting side ending in a sharp edge.', example: 'Knife, Axe, Doorstop', found: false },
    { id: 'screw', name: 'Screw', description: 'An inclined plane wrapped around a pole.', example: 'Jar lid, Light bulb, Drill bit', found: false },
];

const FUNNY_COMMENTS = [
    "Analyzing... Beep Boop... Is that a lever or a very straight banana? 🍌",
    "Scanning molecular structure... 99% sure that's a simple machine! 🧪",
    "Wait, let me put on my spectacles... 👓 Ah yes, magnificent!",
    "By Newton's apple! 🍎 You found it!",
    "Gears are turning... calculations are calculating... Success! 🤖",
    "Wow! That's the best one I've seen since 1905! 🕰️"
];

const SimpleMachineScavengerHuntGame: React.FC<SimpleMachineScavengerHuntGameProps> = ({ onBack }) => {
    const [items, setItems] = useState<ScavengerItem[]>(ITEMS);
    const [score, setScore] = useState(0);
    const [scanningId, setScanningId] = useState<string | null>(null);
    const [scanMessage, setScanMessage] = useState("");
    const { addXP } = useGamification();

    const startScan = (id: string) => {
        setScanningId(id);
        setScanMessage("Initializing Scan-o-matic 3000...");

        let steps = 0;
        const interval = setInterval(() => {
            steps++;
            if (steps === 1) setScanMessage("Calibrating lenses... 🔭");
            if (steps === 2) setScanMessage("Detecting physics magic... ✨");
            if (steps === 3) {
                clearInterval(interval);
                completeItem(id);
            }
        }, 800);
    };

    const completeItem = (id: string) => {
        const randomComment = FUNNY_COMMENTS[Math.floor(Math.random() * FUNNY_COMMENTS.length)];
        setScanMessage(randomComment);

        setTimeout(() => {
            setItems(prev => prev.map(item => {
                if (item.id === id && !item.found) {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#FFD700', '#FFA500', '#00FF00']
                    });
                    setScore(s => s + 150);
                    addXP(150);

                    // PERSIST TO DATABASE
                    api.submitGameScore({
                        game_id: 'simple-machine-scavenger-hunt',
                        game_name: "Dr. Gizmo's Gadget Hunt",
                        score: score + 150,
                        metadata: {
                            itemId: id,
                            itemName: item.name,
                            totalFound: items.filter(i => i.found).length + 1
                        }
                    }).catch(err => console.error("Failed to save scavenger score:", err));

                    return { ...item, found: true };
                }
                return item;
            }));
            setScanningId(null);
        }, 1500);
    };

    const completedCount = items.filter(i => i.found).length;
    const progress = (completedCount / items.length) * 100;

    return (
        <GameShell title="Dr. Gizmo's Gadget Hunt" onExit={onBack} score={score} isGameOver={false} onRestart={() => { }}>
            <div className="h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Dr. Gizmo Header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
                            <SettingsIcon size={200} />
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                            <div className="bg-white p-2 rounded-full shadow-lg shrink-0">
                                <div className="w-20 h-20 bg-yellow-300 rounded-full flex items-center justify-center text-4xl border-4 border-white">
                                    👨‍🔬
                                </div>
                            </div>
                            <div className="text-center md:text-left">
                                <h2 className="text-2xl font-black mb-1 text-yellow-300">"Greetings, Future Inventor!"</h2>
                                <p className="text-indigo-100 font-medium">
                                    "I am <span className="font-bold text-white">Dr. Gizmo</span>! My lab has exploded (again) and I need YOU to find examples of simple machines in the wild to help me rebuild! Are you up for the challenge?"
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar with personality */}
                        <div className="mt-6 bg-black/20 rounded-full h-6 p-1 relative">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-700 relative" style={{ width: `${Math.max(5, progress)}%` }}>
                                <span className="absolute right-0 -top-1 transform translate-x-1/2 text-lg">🚀</span>
                            </div>
                        </div>
                        <p className="text-center mt-2 text-xs font-bold uppercase tracking-widest text-indigo-200">
                            Gadget Collection: {completedCount}/{ITEMS.length}
                        </p>
                    </div>

                    {/* Scanning Overlay */}
                    {scanningId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-bounce-in">
                                <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-6 relative">
                                    <Camera size={48} className="text-blue-600 animate-pulse" />
                                    <div className="absolute inset-0 border-4 border-blue-400 rounded-full animate-ping opacity-20"></div>
                                </div>
                                <h3 className="text-2xl font-black text-gray-800 mb-2">Analyzing...</h3>
                                <p className="text-lg text-blue-600 font-bold animate-pulse">{scanMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* Items Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map(item => (
                            <div key={item.id} className={`bg-white rounded-2xl p-5 border-b-4 transition-all transform hover:-translate-y-1 ${item.found ? 'border-green-500 shadow-none bg-green-50' : 'border-gray-200 hover:border-purple-400 shadow-lg'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className={`font-black text-xl ${item.found ? 'text-green-700 line-through decoration-4 decoration-green-400/50' : 'text-gray-800'}`}>{item.name}</h3>
                                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500 uppercase">Points: 150XP</span>
                                    </div>
                                    {item.found ? (
                                        <div className="bg-green-100 text-green-600 p-2 rounded-full rotate-12">
                                            <Trophy size={28} className="fill-current" />
                                        </div>
                                    ) : (
                                        <div className="text-gray-200">
                                            <Circle size={32} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <p className="text-gray-600 font-medium mb-4 leading-relaxed">{item.description}</p>

                                <div className="bg-indigo-50 text-indigo-800 text-sm py-2 px-3 rounded-xl mb-4 flex items-center gap-2 border border-indigo-100">
                                    <span className="text-xl">🕵️</span>
                                    <span><strong>Hint:</strong> {item.example}</span>
                                </div>

                                <button
                                    onClick={() => startScan(item.id)}
                                    disabled={item.found || !!scanningId}
                                    className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-black text-lg transition-all ${item.found
                                        ? 'bg-transparent text-green-600 cursor-default grayscale opacity-50'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:scale-[1.02] shadow-xl shadow-purple-200'}`}
                                >
                                    {item.found ? (
                                        'Verified! ✅'
                                    ) : (
                                        <>
                                            <Camera size={24} /> SNAP PHOTO!
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    {completedCount === items.length && (
                        <div className="bg-gradient-to-br from-yellow-300 to-orange-400 rounded-3xl p-8 text-center animate-bounce-in shadow-2xl transform rotate-1">
                            <div className="text-6xl mb-4">🏆👨‍🔬🎉</div>
                            <h3 className="text-4xl font-black text-white drop-shadow-md mb-2">MASTER ENGINEER!</h3>
                            <p className="text-xl text-white font-bold mb-6">"Eureka! You verified all the machines! My lab is saved!"</p>
                            <button onClick={onBack} className="bg-white text-orange-600 px-8 py-3 rounded-full font-black text-xl hover:bg-orange-50 hover:scale-105 transition-all shadow-lg">
                                Collect Reward
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </GameShell>
    );
};

function SettingsIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

export default SimpleMachineScavengerHuntGame;
