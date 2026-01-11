import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import confetti from 'canvas-confetti';
import { AtomIcon, ZapIcon, AlertTriangleIcon, ActivityIcon, RefreshCwIcon } from 'lucide-react';

interface PhysicsLabGameProps {
    onBack: () => void;
}

interface Particle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    type: 'neutron' | 'atom' | 'split-product' | 'control-rod';
    stable?: boolean;
}

const PhysicsLabGame: React.FC<PhysicsLabGameProps> = ({ onBack }) => {
    const { addXP, unlockBadge } = useGamification();
    const [gameState, setGameState] = useState<'IDLE' | 'RUNNING' | 'COMPLETED' | 'MELTDOWN'>('IDLE');
    const [energy, setEnergy] = useState(0);
    const [temperature, setTemperature] = useState(200); // Base temp
    const [particles, setParticles] = useState<Particle[]>([]);
    const [controlRodsActive, setControlRodsActive] = useState(false);

    // Lab Report State
    const [showReport, setShowReport] = useState(false);
    const [reportData, setReportData] = useState({
        q1: '',
        q2: '',
        observation: ''
    });

    const handleReportSubmit = () => {
        if (!reportData.q1 || !reportData.q2) return;

        let bonusXP = 0;
        if (reportData.q1 === 'neutron') bonusXP += 50;
        if (reportData.q2 === 'absorb') bonusXP += 50;

        addXP(100 + bonusXP);
        unlockBadge('lab-scientist');
        confetti({ particleCount: 300, spread: 100 });
        setGameState('COMPLETED');
        setShowReport(false);
    };

    // Refs for animation loop
    const requestRef = useRef<number>();
    const canvasRef = useRef<HTMLDivElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Init Sound
    useEffect(() => {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => { audioCtxRef.current?.close(); };
    }, []);

    const playSound = (type: 'split' | 'absorb' | 'alarm') => {
        if (!audioCtxRef.current) return;
        const oscillator = audioCtxRef.current.createOscillator();
        const gainNode = audioCtxRef.current.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtxRef.current.destination);

        if (type === 'split') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(100 + Math.random() * 200, audioCtxRef.current.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioCtxRef.current.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioCtxRef.current.currentTime + 0.1);
        } else if (type === 'absorb') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(50, audioCtxRef.current.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioCtxRef.current.currentTime + 0.2);
        }
    };

    // Initialize Simulation
    const resetSimulation = () => {
        const newParticles: Particle[] = [];
        // Create Grid of Uranium Atoms
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 4; j++) {
                newParticles.push({
                    id: `u-${i}-${j}`,
                    x: 20 + i * 15, // % positions
                    y: 20 + j * 15,
                    vx: 0,
                    vy: 0,
                    type: 'atom',
                    stable: true
                });
            }
        }
        // Add Control Rods (Static obstacles)
        if (controlRodsActive) {
            newParticles.push({ id: 'rod-1', x: 27, y: 35, vx: 0, vy: 0, type: 'control-rod' });
            newParticles.push({ id: 'rod-2', x: 57, y: 35, vx: 0, vy: 0, type: 'control-rod' });
            newParticles.push({ id: 'rod-3', x: 87, y: 35, vx: 0, vy: 0, type: 'control-rod' });
        }

        setParticles(newParticles);
        setEnergy(0);
        setTemperature(200);
        setGameState('IDLE');
    };

    useEffect(() => {
        resetSimulation();
    }, [controlRodsActive]);

    // Game Loop
    const update = () => {
        if (gameState !== 'RUNNING' && gameState !== 'MELTDOWN') return;

        let currentParticles = [...particles];
        let energyGain = 0;
        let tempGain = 0;
        let hasActivity = false;

        // Move particles
        currentParticles = currentParticles.map(p => {
            if (p.type === 'neutron' || p.type === 'split-product') {
                hasActivity = true;
                return {
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy
                };
            }
            return p;
        }).filter(p => p.x > 0 && p.x < 100 && p.y > 0 && p.y < 100);

        // Collision Detection
        const newNeutrons: Particle[] = [];
        const deadParticles: string[] = [];

        currentParticles.forEach(p1 => {
            if (p1.type === 'neutron') {
                // Check collision with atoms or rods
                currentParticles.forEach(p2 => {
                    if (p2.id === p1.id) return;
                    if (deadParticles.includes(p2.id) || deadParticles.includes(p1.id)) return;

                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 3) { // Collision Threshold
                        if (p2.type === 'atom' && p2.stable) {
                            // FISSION!
                            deadParticles.push(p1.id); // Neutron absorbed
                            deadParticles.push(p2.id); // Atom splits

                            energyGain += 100;
                            tempGain += 50;
                            playSound('split');

                            // Release 2-3 new neutrons
                            for (let n = 0; n < 3; n++) {
                                const angle = Math.random() * Math.PI * 2;
                                newNeutrons.push({
                                    id: `n-${Date.now()}-${n}`,
                                    x: p2.x,
                                    y: p2.y,
                                    vx: Math.cos(angle) * 0.8,
                                    vy: Math.sin(angle) * 0.8,
                                    type: 'neutron'
                                });
                            }
                        } else if (p2.type === 'control-rod') {
                            // Absorbed
                            deadParticles.push(p1.id);
                            playSound('absorb');
                        }
                    }
                });
            }
        });

        // Update State
        currentParticles = currentParticles.filter(p => !deadParticles.includes(p.id));
        currentParticles = [...currentParticles, ...newNeutrons];

        // Apply
        setParticles(currentParticles);
        setEnergy(prev => prev + energyGain);
        setTemperature(prev => {
            const cooling = 2; // Constant cooling
            let newTemp = prev + tempGain - cooling;
            if (newTemp < 200) newTemp = 200;
            return newTemp;
        });

        if (tempGain > 0) {
            // Check Meltdown or Completion
        } else if (!hasActivity && newNeutrons.length === 0 && gameState === 'RUNNING') {
            // Stopped
            setTimeout(() => setGameState('COMPLETED'), 1000);
        }

        requestRef.current = requestAnimationFrame(update);
    };

    useEffect(() => {
        if (gameState === 'RUNNING') {
            requestRef.current = requestAnimationFrame(update);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [gameState, particles]);

    useEffect(() => {
        if (temperature > 1500) {
            setGameState('MELTDOWN');
            window.speechSynthesis.speak(new SpeechSynthesisUtterance("Warning. Critical temperature. Meltdown imminent."));
        }
        if (energy > 5000 && gameState !== 'COMPLETED') {
            setGameState('COMPLETED');
            addXP(150);
            unlockBadge('nuclear-physicist');
            confetti({ particleCount: 200 });
            window.speechSynthesis.speak(new SpeechSynthesisUtterance("Energy target reached. Simulation successful."));
        }
    }, [temperature, energy]);


    const fireNeutron = () => {
        if (gameState !== 'RUNNING') setGameState('RUNNING');

        setParticles(prev => [
            ...prev,
            {
                id: `trigger-${Date.now()}`,
                x: 0,
                y: 50,
                vx: 1.5,
                vy: 0,
                type: 'neutron'
            }
        ]);
    };

    return (
        <GameShell
            title="Physics Lab: Nuclear Fission"
            onExit={onBack}
            score={energy}
            isGameOver={gameState === 'COMPLETED' || gameState === 'MELTDOWN'}
            onRestart={resetSimulation}
        >
            <div className="h-full w-full bg-slate-900 flex flex-col md:flex-row p-4 gap-4 overflow-hidden relative font-mono text-cyan-400">

                {/* Control Panel */}

                <div className="w-full md:w-64 bg-slate-800 rounded-xl p-6 border-2 border-cyan-700/50 flex flex-col gap-6 shadow-[0_0_20px_rgba(6,182,212,0.15)] order-2 md:order-1">
                    {/* ... stats ... */}
                    <div className="flex items-center gap-2 text-cyan-300 border-b border-cyan-800/50 pb-2">
                        <ActivityIcon />
                        <h2 className="font-bold text-lg">Reactor Stats</h2>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs uppercase tracking-widest text-cyan-600">Energy Output</label>
                        <div className="text-3xl font-black text-white">{energy} <span className="text-sm text-cyan-600">kWh</span></div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div animate={{ width: `${Math.min(100, energy / 50)}%` }} className="h-full bg-cyan-400 shadow-[0_0_10px_cyan]" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs uppercase tracking-widest text-cyan-600">Core Temp</label>
                        <div className={`text-3xl font-black ${temperature > 1000 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                            {Math.floor(temperature)}°C
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden relative">
                            <motion.div
                                animate={{ width: `${Math.min(100, temperature / 20)}%` }}
                                className={`h-full transition-colors ${temperature > 1000 ? 'bg-red-500' : temperature > 600 ? 'bg-orange-400' : 'bg-green-400'}`}
                            />
                        </div>
                    </div>

                    <div className="mt-auto space-y-4">
                        {/* ... controls ... */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={controlRodsActive}
                                onChange={(e) => setControlRodsActive(e.target.checked)}
                                className="toggle toggle-cyan"
                            />
                            <span className="text-sm font-bold">Enable Control Rods</span>
                        </div>

                        <button
                            onClick={fireNeutron}
                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 ${gameState === 'MELTDOWN' ? 'bg-gray-600 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-500/30'}`}
                            disabled={gameState === 'MELTDOWN'}
                        >
                            <div className="flex items-center justify-center gap-2">
                                <ZapIcon size={18} fill="currentColor" />
                                Fire Neutron
                            </div>
                        </button>

                        <button
                            onClick={() => setShowReport(true)}
                            className="w-full py-3 rounded-lg font-bold bg-purple-600 text-white hover:bg-purple-500 flex items-center justify-center gap-2 shadow-lg"
                        >
                            <span className="text-xl">📝</span> Lab Report
                        </button>

                        <button
                            onClick={resetSimulation}
                            className="w-full py-2 rounded-lg font-bold border border-cyan-700 hover:bg-cyan-900/30 text-cyan-400 flex items-center justify-center gap-2"
                        >
                            <RefreshCwIcon size={14} /> Reset Core
                        </button>
                    </div>
                </div>

                {/* Simulation Area */}
                <div className="flex-1 bg-black rounded-2xl border-4 border-slate-700 relative overflow-hidden shadow-inner order-1 md:order-2 cursor-crosshair" ref={canvasRef}>
                    {/* ... simulation content ... */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[length:40px_40px]" />

                    <AnimatePresence>
                        {particles.map(p => (
                            <motion.div
                                key={p.id}
                                initial={{ scale: 0 }}
                                animate={{
                                    left: `${p.x}%`,
                                    top: `${p.y}%`,
                                    scale: 1,
                                    backgroundColor: p.type === 'neutron' ? '#22d3ee' : p.type === 'control-rod' ? '#475569' : '#16a34a'
                                }}
                                exit={{ scale: 2, opacity: 0 }}
                                transition={{ duration: 0 }}
                                className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center shadow-lg
                                    ${p.type === 'atom' ? 'w-12 h-12 bg-green-600 border-2 border-green-400 shadow-[0_0_15px_rgba(22,163,74,0.5)]' :
                                        p.type === 'neutron' ? 'w-3 h-3 bg-cyan-400 shadow-[0_0_10px_cyan]' :
                                            p.type === 'control-rod' ? 'w-6 h-24 bg-slate-600 border border-slate-400 rounded-sm' : ''}
                                `}
                            >
                                {p.type === 'atom' && (
                                    <AtomIcon className="text-green-900 w-8 h-8 animate-spin-slow" />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Report Modal Overlay */}
                    {showReport && (
                        <div className="absolute inset-0 bg-slate-900/95 z-[60] p-8 overflow-y-auto">
                            <div className="max-w-2xl mx-auto bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
                                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="text-3xl">📝</span> Lab Report: Nuclear Fission
                                </h2>

                                <div className="space-y-6">
                                    {/* Question 1 */}
                                    <div>
                                        <label className="block text-cyan-300 font-bold mb-2">1. Which particle initiates the chain reaction?</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['proton', 'electron', 'neutron'].map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setReportData({ ...reportData, q1: opt })}
                                                    className={`p-3 rounded-lg border capitalize ${reportData.q1 === opt ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Question 2 */}
                                    <div>
                                        <label className="block text-cyan-300 font-bold mb-2">2. What happens when neutrons hit control rods?</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'bounce', label: 'They bounce off' },
                                                { id: 'absorb', label: 'They are absorbed (Reaction slows)' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setReportData({ ...reportData, q2: opt.id })}
                                                    className={`p-3 rounded-lg border text-left ${reportData.q2 === opt.id ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Observation */}
                                    <div>
                                        <label className="block text-cyan-300 font-bold mb-2">3. Observations & Conclusion</label>
                                        <textarea
                                            value={reportData.observation}
                                            onChange={(e) => setReportData({ ...reportData, observation: e.target.value })}
                                            placeholder="Record your observations on temperature and energy output..."
                                            className="w-full h-32 bg-slate-900 border border-slate-600 rounded-xl p-4 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            onClick={() => setShowReport(false)}
                                            className="flex-1 py-3 text-slate-400 font-bold hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleReportSubmit}
                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg"
                                        >
                                            Submit Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {gameState === 'MELTDOWN' && !showReport && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-900/50 z-50 animate-pulse">
                            <div className="bg-red-600 text-white p-8 rounded-2xl border-4 border-red-900 shadow-2xl text-center">
                                <AlertTriangleIcon size={64} className="mx-auto mb-4" />
                                <h1 className="text-4xl font-black uppercase mb-2">Core Meltdown!</h1>
                                <p className="font-mono text-lg">Temperature exceeded critical limits.</p>
                                <button onClick={resetSimulation} className="mt-6 bg-white text-red-900 px-6 py-2 rounded-full font-bold hover:bg-gray-100">
                                    Decontaminate & Reset
                                </button>
                            </div>
                        </div>
                    )}

                    {gameState === 'COMPLETED' && !showReport && (
                        <div className="absolute inset-0 flex items-center justify-center bg-cyan-900/50 z-50">
                            <div className="bg-cyan-900 text-white p-8 rounded-2xl border-4 border-cyan-400 shadow-2xl text-center">
                                <AtomIcon size={64} className="mx-auto mb-4 text-cyan-400" />
                                <h1 className="text-4xl font-black uppercase mb-2">Experiment Complete!</h1>
                                <p className="font-mono text-lg mb-6">Simulation finished successfully.</p>
                                <button onClick={() => setShowReport(true)} className="bg-cyan-400 text-cyan-900 px-8 py-3 rounded-full font-bold hover:bg-cyan-300 shadow-lg text-lg animate-bounce">
                                    📝 Write Lab Report
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </GameShell>
    );
};

export default PhysicsLabGame;
