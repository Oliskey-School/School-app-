import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Check, Save, RotateCcw, Pen, Square, Circle as CircleIcon, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  fieldId: string;
  photos: string[]; // List of base64 strings
  onChange: (photos: string[]) => void;
}

export const PhotoCaptureField: React.FC<Props> = ({ fieldId, photos, onChange }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setIsCapturing(true);
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Please grant camera permissions to capture evidence.");
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        onChange([...photos, dataUrl]);
        stopCamera();
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-6">
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo, i) => (
          <div key={i} className="relative group aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm">
            <img src={photo} alt={`Evidence ${i+1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
               <button 
                 onClick={() => setActivePhotoIndex(i)}
                 className="p-3 bg-white text-indigo-600 rounded-xl hover:scale-110 transition-transform"
               >
                 <Pen className="w-5 h-5" />
               </button>
               <button 
                 onClick={() => removePhoto(i)}
                 className="p-3 bg-white text-red-600 rounded-xl hover:scale-110 transition-transform"
               >
                 <X className="w-5 h-5" />
               </button>
            </div>
          </div>
        ))}
        
        {photos.length < 4 && (
          <button
            onClick={startCamera}
            className="aspect-video rounded-2xl border-4 border-dashed border-slate-100 flex flex-col items-center justify-center gap-3 text-slate-300 hover:border-indigo-200 hover:text-indigo-400 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
               <Camera className="w-6 h-6" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest">Capture Photo</span>
          </button>
        )}
      </div>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCapturing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col"
          >
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
               <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
               />
               
               {/* Overlay Guide */}
               <div className="absolute inset-x-10 inset-y-20 border-2 border-white/20 rounded-3xl pointer-events-none flex items-center justify-center">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-white absolute top-0 left-0"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-white absolute top-0 right-0"></div>
                  <div className="w-4 h-4 border-b-2 border-l-2 border-white absolute bottom-0 left-0"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-white absolute bottom-0 right-0"></div>
               </div>
            </div>

            <div className="p-10 flex items-center justify-between bg-slate-900 border-t border-white/10">
               <button 
                onClick={stopCamera}
                className="w-16 h-16 rounded-2xl bg-white/5 text-white flex items-center justify-center hover:bg-white/10"
               >
                 <X className="w-8 h-8" />
               </button>
               <button 
                onClick={capturePhoto}
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-transform p-2"
               >
                  <div className="w-20 h-20 rounded-full border-4 border-slate-900 flex items-center justify-center">
                     <div className="w-16 h-16 bg-slate-900 rounded-full"></div>
                  </div>
               </button>
               <div className="w-16 h-16"></div> {/* Spacer */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Annotation Modal */}
      <AnimatePresence>
        {activePhotoIndex !== null && (
          <PhotoAnnotationModal 
            photo={photos[activePhotoIndex]}
            onSave={(annotated) => {
              const newPhotos = [...photos];
              newPhotos[activePhotoIndex] = annotated;
              onChange(newPhotos);
              setActivePhotoIndex(null);
            }}
            onCancel={() => setActivePhotoIndex(null)}
          />
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

interface AnnotationProps {
  photo: string;
  onSave: (annotated: string) => void;
  onCancel: () => void;
}

const PhotoAnnotationModal: React.FC<AnnotationProps> = ({ photo, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<'draw' | 'rect' | 'circle' | 'text'>('draw');
  const [color, setColor] = useState('#EF4444'); // Red-500
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = photo;
    img.onload = () => {
      // Fit image to landscape but maintain aspect ratio
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.7;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    };
  }, [photo]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    setStartPos({ x, y });
    setIsDrawing(true);

    if (tool === 'draw') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
      }
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    if (tool === 'draw') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const endX = ('changedTouches' in e) ? e.changedTouches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const endY = ('changedTouches' in e) ? e.changedTouches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    if (tool === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, endX - startPos.x, endY - startPos.y);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(endX - startPos.x, 2) + Math.pow(endY - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (tool === 'text') {
      const text = prompt("Enter observation:");
      if (text) {
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(text, startPos.x, startPos.y);
      }
    }

    setIsDrawing(false);
  };

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/jpeg'));
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/95 flex flex-col items-center justify-center p-6 backdrop-blur-md">
       <div className="w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between text-white">
             <div>
                <h3 className="text-2xl font-black tracking-tight">Annotate Evidence</h3>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Highlight deficiencies on the photo</p>
             </div>
             <div className="flex items-center gap-3">
                <button onClick={onCancel} className="px-6 py-3 bg-white/5 rounded-xl font-bold hover:bg-white/10 transition-colors">Cancel</button>
                <button 
                  onClick={handleSave}
                  className="px-8 py-3 bg-indigo-600 rounded-xl font-black flex items-center gap-2 hover:bg-indigo-500 shadow-xl shadow-indigo-900/50 transition-all"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </button>
             </div>
          </div>

          <div className="relative bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center min-h-[400px]">
             <canvas 
               ref={canvasRef} 
               onMouseDown={handleStart}
               onMouseMove={handleMove}
               onMouseUp={handleEnd}
               onTouchStart={handleStart}
               onTouchMove={handleMove}
               onTouchEnd={handleEnd}
               className="cursor-crosshair shadow-inner"
             />

             {/* Toolbar Overlay */}
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-md border border-white/10 p-2 rounded-2xl flex items-center gap-2 shadow-2xl shadow-black/50">
                {[
                  { id: 'draw', icon: Pen },
                  { id: 'rect', icon: Square },
                  { id: 'circle', icon: CircleIcon },
                  { id: 'text', icon: Type }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id as any)}
                    className={`p-3 rounded-xl transition-all ${tool === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <t.icon className="w-5 h-5" />
                  </button>
                ))}
                <div className="w-px h-6 bg-white/10 mx-2"></div>
                {['#EF4444', '#10B981', '#F59E0B', '#3B82F6'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button 
                  onClick={() => {
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    if (!canvas || !ctx) return;
                    const img = new Image();
                    img.src = photo;
                    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  }}
                  className="p-3 text-white/40 hover:text-white transition-colors"
                  title="Reset"
                >
                   <RotateCcw className="w-5 h-5" />
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
