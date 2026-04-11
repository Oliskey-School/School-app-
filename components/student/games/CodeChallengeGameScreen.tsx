import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Student } from '../../../types';
import { PlayIcon, RotateCcw, ArrowUp, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../../../lib/api';
import { toast } from 'react-hot-toast';

interface CodeChallengeGameScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    student?: Student;
}

// --- GAME LOGIC ---
type Direction = 'N' | 'E' | 'S' | 'W';
type CommandType = 'FORWARD' | 'LEFT' | 'RIGHT';

interface Level {
    id: number;
    name: string;
    gridSize: number;
    start: [number, number]; // [row, col]
    startDir: Direction;
    goal: [number, number];
    obstacles: [number, number][];
    maxBlocks: number;
}

const LEVELS: Level[] = [
    {
        id: 1,
        name: 'Hello World',
        gridSize: 5,
        start: [4, 0],
        startDir: 'E',
        goal: [4, 4],
        obstacles: [],
        maxBlocks: 5
    },
    {
        id: 2,
        name: 'The Turn',
        gridSize: 5,
        start: [4, 0],
        startDir: 'E',
        goal: [0, 4],
        obstacles: [[4, 2], [3, 2], [2, 2], [1, 2]], // Wall
        maxBlocks: 8
    },
    {
        id: 3,
        name: 'Zig Zag',
        gridSize: 5,
        start: [4, 0],
        startDir: 'E',
        goal: [0, 4],
        obstacles: [[3, 1], [3, 3], [1, 1], [1, 3]],
        maxBlocks: 12
    },
    {
        id: 4,
        name: 'Maze Runner',
        gridSize: 5,
        start: [4, 2],
        startDir: 'N',
        goal: [2, 2], // Center
        obstacles: [[3, 2], [3, 1], [3, 3], [1, 2]], // Boxed in somewhat
        maxBlocks: 10
    }
];

const CodeChallengeGameScreen: React.FC<CodeChallengeGameScreenProps> = ({ navigateTo, student }) => {
    // State
    const [levelIndex, setLevelIndex] = useState(0);
    const [program, setProgram] = useState<CommandType[]>([]);
    const [botState, setBotState] = useState<{ pos: [number, number]; dir: Direction }>({ pos: [4, 0], dir: 'E' });
    const [isRunning, setIsRunning] = useState(false);
    const [executingStep, setExecutingStep] = useState(-1);
    const [gameStatus, setGameStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('code_challenge_level');
        if (saved) setLevelIndex(parseInt(saved));
    }, []);

    useEffect(() => {
        if (levelIndex > 0) {
            localStorage.setItem('code_challenge_level', levelIndex.toString());
        }
    }, [levelIndex]);

    const currentLevel = LEVELS[levelIndex];

    // Reset Level
    useEffect(() => {
        setProgram([]);
        resetBot();
        setGameStatus('idle');
    }, [levelIndex]);

    const resetBot = () => {
        setBotState({ pos: currentLevel.start, dir: currentLevel.startDir });
        setExecutingStep(-1);
        setIsRunning(false);
        setGameStatus('idle');
    };

    const addCommand = (cmd: CommandType) => {
        if (program.length < currentLevel.maxBlocks && !isRunning) {
            setProgram([...program, cmd]);
        } else if (program.length >= currentLevel.maxBlocks) {
            toast.error('Memory Full! Remove blocks.');
        }
    };

    const removeCommand = (index: number) => {
        if (!isRunning) {
            setProgram(program.filter((_, i) => i !== index));
        }
    };

    // Execution Loop - HANDLED IN runProgram() now to avoid staleness issues.
    // useEffect(() => { ... }, [isRunning]) - REMOVED

    // Check Win/Fail LIVE during movement (e.g. hitting walls) is complex in React state effect loop
    // Simplified: Check after each move update or at end.
    // For visual smoothness, we update local botStateRef in a real engine, but here we just update state.

    const executeStep = (cmd: CommandType) => {
        setBotState(prev => {
            let newPos = [...prev.pos] as [number, number];
            let newDir = prev.dir;

            if (cmd === 'LEFT') {
                if (prev.dir === 'N') newDir = 'W';
                else if (prev.dir === 'W') newDir = 'S';
                else if (prev.dir === 'S') newDir = 'E';
                else newDir = 'N';
            } else if (cmd === 'RIGHT') {
                if (prev.dir === 'N') newDir = 'E';
                else if (prev.dir === 'E') newDir = 'S';
                else if (prev.dir === 'S') newDir = 'W';
                else newDir = 'N';
            } else if (cmd === 'FORWARD') {
                if (prev.dir === 'N') newPos[0]--; // Row decrease (up)
                if (prev.dir === 'S') newPos[0]++;
                if (prev.dir === 'E') newPos[1]++;
                if (prev.dir === 'W') newPos[1]--;
            }

            // Check Validity (Bounds & Obstacles)
            if (
                newPos[0] < 0 || newPos[0] >= currentLevel.gridSize ||
                newPos[1] < 0 || newPos[1] >= currentLevel.gridSize ||
                currentLevel.obstacles.some(o => o[0] === newPos[0] && o[1] === newPos[1])
            ) {
                // Crash!
                // We handle visual 'crash' by not moving, or blinking red.
                // Ideally, fail immediately.
                // For simplicity, we just stay put (wall bonk).
                return prev;
            }

            return { pos: newPos, dir: newDir };
        });
    };

    const botStateRef = useRef(botState);
    useEffect(() => { botStateRef.current = botState; }, [botState]);

    // Rewrite Loop to use Ref for logic, State for render
    const runProgram = () => {
        if (program.length === 0) return;
        resetBot();
        setIsRunning(true);
        setGameStatus('running');

        let step = 0;
        let currentBot = { pos: currentLevel.start, dir: currentLevel.startDir };

        const interval = setInterval(() => {
            if (step >= program.length) {
                clearInterval(interval);
                setIsRunning(false);

                // Final Check
                if (currentBot.pos[0] === currentLevel.goal[0] && currentBot.pos[1] === currentLevel.goal[1]) {
                    setGameStatus('success');
                    toast.success('Level Complete! 🎉');
                    
                    // Save score
                    api.submitGameScore({
                        game_id: 'code-challenge',
                        game_name: 'Code Challenge',
                        score: program.length * 10, // Simple scoring
                        metadata: { level: currentLevel, grade: student?.grade }
                    }).catch(console.error);
                } else {
                    setGameStatus('failed');
                    toast.error('Target not reached.');
                }
                return;
            }

            setExecutingStep(step);
            const cmd = program[step];

            // Execute Logic locally
            let newPos = [...currentBot.pos] as [number, number];
            let newDir = currentBot.dir;

            if (cmd === 'LEFT') {
                if (currentBot.dir === 'N') newDir = 'W';
                else if (currentBot.dir === 'W') newDir = 'S';
                else if (currentBot.dir === 'S') newDir = 'E';
                else newDir = 'N';
            } else if (cmd === 'RIGHT') {
                if (currentBot.dir === 'N') newDir = 'E';
                else if (currentBot.dir === 'E') newDir = 'S';
                else if (currentBot.dir === 'S') newDir = 'W';
                else newDir = 'N';
            } else if (cmd === 'FORWARD') {
                if (currentBot.dir === 'N') newPos[0]--;
                if (currentBot.dir === 'S') newPos[0]++;
                if (currentBot.dir === 'E') newPos[1]++;
                if (currentBot.dir === 'W') newPos[1]--;
            }

            // Check Validity
            if (
                newPos[0] < 0 || newPos[0] >= currentLevel.gridSize ||
                newPos[1] < 0 || newPos[1] >= currentLevel.gridSize ||
                currentLevel.obstacles.some(o => o[0] === newPos[0] && o[1] === newPos[1])
            ) {
                // Hit wall, stay put (bonk)
                // Could trigger fail early
            } else {
                currentBot.pos = newPos;
            }
            currentBot.dir = newDir;

            // Sync to State
            setBotState({ ...currentBot });

            step++;
        }, 600);
    };


    return (
        <div className="flex flex-col lg:flex-row h-full bg-slate-900 text-white overflow-hidden">

            {/* --- LEFT: VISUALIZER (Responsive) --- */}
            <div className="flex-1 p-4 lg:p-6 flex flex-col items-center justify-center relative min-h-[50%] lg:min-h-0 order-1">
                {/* Header Info */}
                <div className="absolute top-4 left-4 lg:top-6 lg:left-6 z-10">
                    <h2 className="text-xl lg:text-2xl font-bold font-mono text-purple-400">Level {levelIndex + 1}: {currentLevel.name}</h2>
                    <p className="text-xs lg:text-sm text-slate-400">Guide the bot to the <span className="text-yellow-400">STAR</span></p>
                </div>

                {/* Success Overlay */}
                {gameStatus === 'success' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-3xl font-bold text-green-400 mb-6">Level Complete!</h2>
                        <button
                            onClick={() => {
                                if (levelIndex < LEVELS.length - 1) setLevelIndex(i => i + 1);
                                else navigateTo('gamesHub', 'Games Hub');
                            }}
                            className="px-8 py-4 bg-green-500 hover:bg-green-600 rounded-xl font-bold shadow-lg"
                        >
                            {levelIndex < LEVELS.length - 1 ? 'Next Level' : 'Finish Course'}
                        </button>
                    </div>
                )}

                {/* GRID - Responsive Sizing */}
                <div
                    className="grid gap-1 lg:gap-2 p-2 lg:p-4 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 relative"
                    style={{
                        gridTemplateColumns: `repeat(${currentLevel.gridSize}, minmax(0, 1fr))`,
                        width: 'min(90vw, 45vh, 500px)', // Constrain width based on viewport
                        aspectRatio: '1/1'
                    }}
                >
                    {Array.from({ length: currentLevel.gridSize * currentLevel.gridSize }).map((_, idx) => {
                        const r = Math.floor(idx / currentLevel.gridSize);
                        const c = idx % currentLevel.gridSize;

                        const isBot = botState.pos[0] === r && botState.pos[1] === c;
                        const isGoal = currentLevel.goal[0] === r && currentLevel.goal[1] === c;
                        const isObstacle = currentLevel.obstacles.some(o => o[0] === r && o[1] === c);

                        return (
                            <div
                                key={idx}
                                className={`
                                    rounded-md flex items-center justify-center text-xl sm:text-2xl lg:text-3xl transition-all duration-300
                                    ${isObstacle ? 'bg-slate-700 border border-slate-600' : 'bg-slate-900/50 border border-slate-800'}
                                    ${isGoal ? 'ring-2 ring-yellow-500/50 bg-yellow-500/10' : ''}
                                `}
                            >
                                {isObstacle && '🪨'}
                                {isGoal && !isBot && '⭐'}
                                {isBot && (
                                    <div
                                        className="text-purple-400 transition-transform duration-300"
                                        style={{ transform: `rotate(${botState.dir === 'N' ? 0 : botState.dir === 'E' ? 90 : botState.dir === 'S' ? 180 : 270}deg)` }}
                                    >
                                        🤖
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Button Controls Level */}
                <div className="absolute bottom-4 left-4 lg:bottom-6 lg:left-6 flex gap-2 z-10">
                    <button onClick={() => navigateTo('gamesHub', 'Games Hub')} className="px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-800 rounded-lg text-xs lg:text-sm hover:bg-slate-700">Exit</button>
                    <button onClick={resetBot} className="px-3 py-1.5 lg:px-4 lg:py-2 bg-slate-800 rounded-lg text-xs lg:text-sm hover:bg-slate-700">Reset</button>
                </div>
            </div>

            {/* --- RIGHT: CODE EDITOR (Responsive) --- */}
            <div className="w-full lg:w-96 bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 p-4 lg:p-6 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-2xl z-20 h-[50%] lg:h-auto min-h-0 order-2">
                <div className="mb-4 lg:mb-6 shrink-0">
                    <h3 className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Command Palette</h3>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => addCommand('FORWARD')} className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-xs lg:text-sm shadow-md active:scale-95 transition">
                            <ArrowUp className="w-4 h-4" /> Move
                        </button>
                        <button onClick={() => addCommand('LEFT')} className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-xs lg:text-sm shadow-md active:scale-95 transition">
                            <ArrowLeft className="w-4 h-4" /> Turn Left
                        </button>
                        <button onClick={() => addCommand('RIGHT')} className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-xs lg:text-sm shadow-md active:scale-95 transition">
                            Turn Right <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Main Program</h3>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${program.length >= currentLevel.maxBlocks ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'}`}>
                            {program.length}/{currentLevel.maxBlocks} Blocks
                        </span>
                    </div>

                    <div className="flex-1 bg-slate-900 rounded-xl p-2 overflow-y-auto space-y-2 border border-slate-700">
                        {program.length === 0 && (
                            <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
                                Add commands here...
                            </div>
                        )}
                        {program.map((cmd, idx) => (
                            <div
                                key={idx}
                                className={`
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-mono cursor-pointer group transition-all
                                    ${idx === executingStep ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'}
                                `}
                                onClick={() => removeCommand(idx)}
                            >
                                <span className="text-slate-500 text-xs w-4">{idx + 1}</span>
                                {cmd === 'FORWARD' && <ArrowUp className="w-4 h-4 text-purple-400" />}
                                {cmd === 'LEFT' && <ArrowLeft className="w-4 h-4 text-indigo-400" />}
                                {cmd === 'RIGHT' && <ArrowRight className="w-4 h-4 text-indigo-400" />}
                                <span className="flex-1 font-bold">{cmd}</span>
                                <XCircleIcon className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700">
                    <button
                        onClick={runProgram}
                        disabled={isRunning || program.length === 0}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all ${isRunning ? 'bg-slate-600 text-slate-400 cursor-wait' : 'bg-green-500 hover:bg-green-400 text-white hover:scale-[1.02]'}`}
                    >
                        {isRunning ? 'Running...' : <><PlayIcon className="w-5 h-5 fill-current" /> Run Code</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper Icon
const XCircleIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

export default CodeChallengeGameScreen;
