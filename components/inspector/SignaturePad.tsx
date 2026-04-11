import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  label: string;
  onSave: (signature: string) => void;
  onCancel: () => void;
  existingSignature?: string;
}

export const SignaturePad: React.FC<Props> = ({ label, onSave, onCancel, existingSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    
    ctx.strokeStyle = '#0F172A'; // Slate-900
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (existingSignature) {
      const img = new Image();
      img.src = existingSignature;
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width / ratio, canvas.height / ratio);
      setHasSignature(true);
    }
  }, [existingSignature]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
    }
  };

  const handleSave = () => {
    if (canvasRef.current && hasSignature) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/90 flex items-center justify-center p-6 backdrop-blur-xl">
       <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 border-slate-100 flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                   <PenTool className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900">{label}</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sign within the area below</p>
                </div>
             </div>
             <button onClick={onCancel} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="w-6 h-6" />
             </button>
          </div>

          <div className="flex-1 bg-slate-50 p-10">
             <div className="relative w-full h-[250px] bg-white rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                     <span className="font-black text-slate-400 tracking-widest uppercase text-xs">Awaiting Signature</span>
                  </div>
                )}
             </div>
          </div>

          <div className="p-8 bg-white border-t border-slate-50 flex items-center justify-between">
             <button 
               onClick={clear}
               className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all border border-slate-200"
             >
                <RotateCcw className="w-4 h-4" />
                <span>Clear Pad</span>
             </button>
             
             <button 
               onClick={handleSave}
               disabled={!hasSignature}
               className={`
                 flex items-center gap-2 px-10 py-3 rounded-2xl font-black text-lg transition-all
                 ${hasSignature 
                   ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-500 active:scale-95' 
                   : 'bg-slate-100 text-slate-300 cursor-not-allowed'}
               `}
             >
                <Check className="w-6 h-6" />
                <span>Confirm Signature</span>
             </button>
          </div>
       </div>
    </div>
  );
};
