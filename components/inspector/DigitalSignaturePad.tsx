import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Download } from 'lucide-react';

interface DigitalSignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onCancel: () => void;
    existingSignature?: string;
}

export default function DigitalSignaturePad({
    onSave,
    onCancel,
    existingSignature
}: DigitalSignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
                setCtx(context);

                // Set canvas size
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width * window.devicePixelRatio;
                canvas.height = rect.height * window.devicePixelRatio;
                context.scale(window.devicePixelRatio, window.devicePixelRatio);

                // Set drawing style
                context.strokeStyle = '#1e40af'; // Indigo color
                context.lineWidth = 2;
                context.lineCap = 'round';
                context.lineJoin = 'round';

                // Load existing signature if provided
                if (existingSignature) {
                    const img = new Image();
                    img.onload = () => {
                        context.drawImage(img, 0, 0, rect.width, rect.height);
                        setIsEmpty(false);
                    };
                    img.src = existingSignature;
                }
            }
        }
    }, [existingSignature]);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!ctx) return;
        setIsDrawing(true);
        setIsEmpty(false);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !ctx) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        let x, y;

        if ('touches' in e) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!ctx) return;
        setIsDrawing(false);
        ctx.closePath();
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);
        setIsEmpty(true);
    };

    const saveSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || isEmpty) return;

        // Convert canvas to data URL (PNG format)
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">
                                Digital Signature
                            </h2>
                            <p className="text-sm text-slate-600">
                                Sign using your mouse, trackpad, or touchscreen
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Signature Canvas */}
                <div className="p-6">
                    <div className="relative bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden">
                        <canvas
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-64 cursor-crosshair touch-none"
                            style={{ touchAction: 'none' }}
                        />
                        {isEmpty && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-slate-400 text-lg font-medium">
                                    ✍️ Sign here
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Timestamp */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600">
                            <span className="font-semibold">Timestamp:</span>{' '}
                            {new Date().toLocaleString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-slate-200 bg-slate-50/50">
                    <div className="flex gap-3">
                        <button
                            onClick={clearSignature}
                            disabled={isEmpty}
                            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="w-5 h-5" />
                            Clear
                        </button>
                        <button
                            onClick={saveSignature}
                            disabled={isEmpty}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" />
                            Save Signature
                        </button>
                    </div>

                    <p className="text-xs text-slate-500 text-center mt-4">
                        By signing, you certify that this inspection report is accurate and complete.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Signature Preview Component
export function SignaturePreview({
    signatureDataUrl,
    onEdit
}: {
    signatureDataUrl: string;
    onEdit: () => void;
}) {
    return (
        <div className="bg-white border-2 border-indigo-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">Inspector Signature</h4>
                <button
                    onClick={onEdit}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    Edit
                </button>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-center min-h-[120px]">
                <img
                    src={signatureDataUrl}
                    alt="Inspector Signature"
                    className="max-h-24 max-w-full object-contain"
                />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Digitally signed on {new Date().toLocaleDateString()}</span>
            </div>
        </div>
    );
}
