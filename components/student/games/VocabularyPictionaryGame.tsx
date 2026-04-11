import React, { useRef, useState, useEffect } from 'react';
import GameShell from './GameShell';
import { useGamification } from '../../../context/GamificationContext';
import { PencilIcon, EraserIcon, TrashIcon, CheckIcon, RefreshCwIcon } from 'lucide-react';
import { api } from '../../../lib/api';
import confetti from 'canvas-confetti';

interface VocabularyPictionaryGameProps {
    onBack: () => void;
}

const VOCAB_WORDS = [
    { word: 'Photosynthesis', hint: 'Plants use this to make food.' },
    { word: 'Gravity', hint: 'What keeps us on the ground.' },
    { word: 'Telescope', hint: 'Used to see stars.' },
    { word: 'Volcano', hint: 'Erupts with lava.' },
    { word: 'Microscope', hint: 'See tiny things.' },
    { word: 'Ecosystem', hint: 'Community of living things.' },
];

const VocabularyPictionaryGame: React.FC<VocabularyPictionaryGameProps> = ({ onBack }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [score, setScore] = useState(0);
    const { addXP } = useGamification();

    const currentWord = VOCAB_WORDS[currentWordIndex];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);

        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;

        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        if ('touches' in e) {
            const rect = canvas.getBoundingClientRect();
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                offsetX: (e as React.MouseEvent).nativeEvent.offsetX,
                offsetY: (e as React.MouseEvent).nativeEvent.offsetY
            };
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleNextWord = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        setScore(s => s + 50);
        addXP(50);

        // PERSIST TO DATABASE
        api.submitGameScore({
            game_id: 'vocabulary-pictionary',
            game_name: 'Vocabulary Pictionary',
            score: score + 50,
            metadata: {
                word: currentWord.word,
                hint: currentWord.hint
            }
        }).catch(err => console.error("Failed to save pictionary score:", err));

        clearCanvas();
        setCurrentWordIndex(prev => (prev + 1) % VOCAB_WORDS.length);
    };

    return (
        <GameShell title="Vocabulary Pictionary" onExit={onBack} score={score} isGameOver={false} onRestart={() => setScore(0)}>
            <div className="flex flex-col md:flex-row gap-4 h-full p-2 md:p-4 overflow-hidden bg-slate-100">
                {/* Mobile Header - Word Display (Only visible on small screens) */}
                <div className="md:hidden bg-white p-3 rounded-xl shadow-sm border border-orange-100 flex justify-between items-center shrink-0">
                    <div>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Draw This</p>
                        <h2 className="text-lg font-black text-gray-800 leading-none">{currentWord.word}</h2>
                    </div>
                    <p className="text-xs text-gray-500 italic max-w-[150px] text-right">"{currentWord.hint}"</p>
                </div>

                {/* Drawing Area - Takes maximum space */}
                <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative touch-none order-2 md:order-2">
                    <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="touch-none cursor-crosshair w-full h-full block"
                    />
                    <div className="absolute top-2 right-2 bg-gray-100/90 backdrop-blur px-2 py-1 rounded-md text-[10px] font-medium text-gray-500 pointer-events-none border border-gray-200 select-none">
                        Canvas
                    </div>
                </div>

                {/* Sidebar Controls - Bottom on mobile, Left on Desktop */}
                <div className="w-full md:w-64 flex md:flex-col gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-xl shadow-md border border-gray-200 shrink-0 order-3 md:order-1 overflow-x-auto md:overflow-visible">

                    {/* Desktop Word Display (Hidden on mobile) */}
                    <div className="hidden md:block bg-orange-50 p-4 rounded-lg border border-orange-100 text-center">
                        <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">Draw This</p>
                        <h2 className="text-2xl font-black text-gray-800 break-words">{currentWord.word}</h2>
                        <p className="text-sm text-gray-500 mt-2 italic">"{currentWord.hint}"</p>
                    </div>

                    {/* Tools Row */}
                    <div className="flex md:flex-col gap-2 min-w-max md:min-w-0">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTool('pencil')}
                                className={`p-2 md:p-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${tool === 'pencil' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                                title="Pencil"
                            >
                                <PencilIcon size={18} /> <span className="hidden md:inline">Draw</span>
                            </button>
                            <button
                                onClick={() => setTool('eraser')}
                                className={`p-2 md:p-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}
                                title="Eraser"
                            >
                                <EraserIcon size={18} /> <span className="hidden md:inline">Erase</span>
                            </button>
                        </div>
                    </div>

                    {/* Colors */}
                    <div className="flex md:flex-col gap-2 min-w-max md:min-w-0 border-l md:border-l-0 border-gray-200 pl-3 md:pl-0">
                        <label className="hidden md:block text-xs font-bold text-gray-400">Colors</label>
                        <div className="flex md:grid md:grid-cols-5 gap-1.5 md:gap-2">
                            {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFA500', '#800080', '#00FFFF'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => { setColor(c); setTool('pencil'); }}
                                    className={`w-8 h-8 md:w-8 md:h-8 rounded-full border-2 transition-transform ${color === c && tool === 'pencil' ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Size Slider (Hidden on tiny screens or simplified) */}
                    <div className="hidden md:flex flex-col gap-2">
                        <label className="text-xs font-bold text-gray-400">Brush Size</label>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(parseInt(e.target.value))}
                            className="w-full accent-indigo-600"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto flex md:flex-col gap-2 ml-auto md:ml-0">
                        <button onClick={clearCanvas} className="p-2 md:py-2 md:px-4 bg-red-50 text-red-600 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-100" title="Clear">
                            <TrashIcon size={18} /> <span className="hidden md:inline">Clear</span>
                        </button>
                        <button onClick={handleNextWord} className="px-4 py-2 md:py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-green-600 active:scale-95 transition-all">
                            <CheckIcon size={20} /> <span className="hidden md:inline">Done</span>
                        </button>
                    </div>
                </div>
            </div>
        </GameShell>
    );
};

export default VocabularyPictionaryGame;
