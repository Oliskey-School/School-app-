
import React, { useEffect, useRef, useState } from 'react';
import { getAIClient, AI_MODEL_NAME } from '../../lib/ai';
import { MicrophoneIcon, StopIcon, VideoIcon } from '../../constants';

interface LiveSessionProps {
    onClose: () => void;
}

// Helper for base64 encoding
function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Helper for base64 decoding
function base64ToArrayBuffer(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [isMuted, setIsMuted] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Audio Playback
    const nextStartTimeRef = useRef<number>(0);
    const outputGainNodeRef = useRef<GainNode | null>(null);

    useEffect(() => {
        let session: any = null;
        let mounted = true;

        const startSession = async () => {
            setStatus('connecting');
            try {
                const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');

                // Setup Audio Context
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                outputGainNodeRef.current = audioContextRef.current.createGain();
                outputGainNodeRef.current.connect(audioContextRef.current.destination);

                // Get Media Stream (Audio & Video)
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 16000,
                        channelCount: 1,
                        echoCancellation: true
                    },
                    video: true
                });
                streamRef.current = stream;

                // Setup Video Preview
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }

                // Connect to Gemini Live
                const sessionPromise = (ai as any).live.connect({
                    model: 'gemini-2.0-flash',
                    config: {
                        responseModalities: ['AUDIO'],
                        systemInstruction: { parts: [{ text: "You are a helpful school assistant. Keep responses concise and friendly." }] },
                    },
                    callbacks: {
                        onopen: () => {
                            if (!mounted) return;
                            setStatus('connected');
                            console.log("Live Session Connected");

                            // Start Audio Input Processing
                            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                            const source = ctx.createMediaStreamSource(stream);
                            const processor = ctx.createScriptProcessor(4096, 1, 1);

                            processor.onaudioprocess = (e) => {
                                if (isMuted) return;
                                const inputData = e.inputBuffer.getChannelData(0);

                                // Simple visualizer
                                let sum = 0;
                                for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
                                setVolumeLevel(Math.min(100, (sum / inputData.length) * 500));

                                // Convert Float32 to Int16 PCM
                                const pcmData = new Int16Array(inputData.length);
                                for (let i = 0; i < inputData.length; i++) {
                                    const s = Math.max(-1, Math.min(1, inputData[i]));
                                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                                }

                                const base64Audio = arrayBufferToBase64(pcmData.buffer);

                                (sessionPromise as Promise<any>).then(currentSession => {
                                    currentSession.sendRealtimeInput({
                                        media: {
                                            mimeType: 'audio/pcm;rate=16000',
                                            data: base64Audio
                                        }
                                    });
                                });
                            };

                            source.connect(processor);
                            processor.connect(ctx.destination);

                            inputSourceRef.current = source;
                            processorRef.current = processor;
                        },
                        onmessage: async (msg: any) => {
                            if (!mounted) return;

                            // Handle Audio Output
                            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                            if (audioData && audioContextRef.current && outputGainNodeRef.current) {
                                const audioBufferChunk = base64ToArrayBuffer(audioData);
                                const float32Data = new Float32Array(audioBufferChunk.byteLength / 2);
                                const dataView = new DataView(audioBufferChunk);

                                for (let i = 0; i < float32Data.length; i++) {
                                    float32Data[i] = dataView.getInt16(i * 2, true) / 32768.0;
                                }

                                const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
                                audioBuffer.getChannelData(0).set(float32Data);

                                const source = audioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputGainNodeRef.current);

                                const currentTime = audioContextRef.current.currentTime;
                                const startTime = Math.max(currentTime, nextStartTimeRef.current);
                                source.start(startTime);
                                nextStartTimeRef.current = startTime + audioBuffer.duration;
                            }
                        },
                        onclose: () => {
                            if (mounted) setStatus('disconnected');
                        },
                        onerror: (err) => {
                            console.error("Live Error:", err);
                            if (mounted) setStatus('disconnected');
                        }
                    }
                });

                session = sessionPromise;

                // Video Frame Streaming Loop
                const sendVideoFrame = () => {
                    if (!mounted || status === 'disconnected') return;

                    if (videoRef.current && canvasRef.current && session) {
                        const ctx = canvasRef.current.getContext('2d');
                        if (ctx) {
                            canvasRef.current.width = videoRef.current.videoWidth * 0.2; // Low res for preview
                            canvasRef.current.height = videoRef.current.videoHeight * 0.2;
                            ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

                            const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];

                            session.then((s: any) => {
                                s.sendRealtimeInput({
                                    media: {
                                        mimeType: 'image/jpeg',
                                        data: base64Image
                                    }
                                });
                            });
                        }
                    }
                    setTimeout(sendVideoFrame, 1000); // 1 FPS for visual context
                };
                sendVideoFrame();

            } catch (error) {
                console.error("Failed to start live session", error);
                setStatus('disconnected');
            }
        };

        startSession();

        return () => {
            mounted = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (session) {
                session.then((s: any) => s.close());
            }
        };
    }, []); // Empty dependency array to run once on mount

    return (
        <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-4 text-white">
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border border-gray-800">
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="w-full h-full object-cover opacity-60"
                />

                {/* Status Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-8">
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${status === 'connected' ? 'bg-blue-500/20 border-4 border-blue-500' : 'bg-gray-700 animate-pulse'
                        }`}
                        style={{ transform: `scale(${1 + volumeLevel / 100})` }}
                    >
                        {status === 'connected' ? (
                            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                                <VideoIcon className="w-8 h-8 text-white" />
                            </div>
                        ) : (
                            <div className="text-xs font-mono">Connecting...</div>
                        )}
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold">Gemini Live</h2>
                        <p className="text-gray-300 text-sm">Listening & Watching</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-8">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-4 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                        <MicrophoneIcon className="w-6 h-6 text-white" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-6 rounded-full bg-red-600 hover:bg-red-700 shadow-lg transform hover:scale-105 transition-all"
                    >
                        <StopIcon className="w-8 h-8 text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveSession;
