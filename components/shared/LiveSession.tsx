
import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { isAIAllowedClient, AI_LOCKED_MESSAGE } from '../../lib/ai';
import { MicrophoneIcon, StopIcon, VideoIcon } from '../../constants';

interface LiveSessionProps {
    onClose: () => void;
}

/**
 * Live Voice — a real, working voice conversation:
 *  1. Your speech is transcribed locally in the browser (instant, private).
 *  2. The transcript + a low-res webcam frame go to the AI (so it can "see").
 *  3. The reply is spoken aloud with the browser's voice.
 * The previous implementation opened a Gemini-Live socket that was never
 * implemented — it sat on "Connecting..." forever.
 */
const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'connecting' | 'listening' | 'thinking' | 'speaking' | 'unsupported' | 'error'>('connecting');
    const [isMuted, setIsMuted] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const [caption, setCaption] = useState<string>('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const recognitionRef = useRef<any>(null);
    const mountedRef = useRef(true);
    const busyRef = useRef(false);        // true while thinking/speaking
    const mutedRef = useRef(false);
    const historyRef = useRef<Array<{ role: string; content: any }>>([]);

    const speak = (text: string) => new Promise<void>((resolve) => {
        if (!('speechSynthesis' in window)) { resolve(); return; }
        window.speechSynthesis.cancel();
        const clean = text.replace(/[*_#`>\[\]]/g, '').replace(/\n+/g, '. ');
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 1.02;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
    });

    const captureFrame = (): string | null => {
        try {
            const video = videoRef.current, canvas = canvasRef.current;
            if (!video || !canvas || !video.videoWidth) return null;
            canvas.width = Math.max(64, Math.floor(video.videoWidth * 0.25));
            canvas.height = Math.max(64, Math.floor(video.videoHeight * 0.25));
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.5);
        } catch { return null; }
    };

    const startRecognition = () => {
        const rec = recognitionRef.current;
        if (!rec || mutedRef.current || busyRef.current || !mountedRef.current) return;
        try { rec.start(); } catch { /* already started */ }
    };

    const handleUtterance = async (transcript: string) => {
        if (!transcript.trim() || busyRef.current) return;
        busyRef.current = true;
        setStatus('thinking');
        setCaption(`You: ${transcript}`);
        try {
            const frame = captureFrame();
            const userContent: any = frame
                ? [{ type: 'text', text: transcript }, { type: 'image_url', image_url: { url: frame } }]
                : transcript;
            historyRef.current.push({ role: 'user', content: transcript });

            const res = await api.aiChat({
                messages: [
                    { role: 'system', content: 'You are a live voice tutor in a school app. Answer in 1-3 short spoken-style sentences — warm, clear and encouraging. If the camera frame is relevant (e.g. the student shows homework or an object), use it; otherwise ignore it.' },
                    ...historyRef.current.slice(-8).slice(0, -1),
                    { role: 'user', content: userContent },
                ],
                max_tokens: 160,
            });

            const reply = (res.text || '').trim() || "I didn't catch that — could you say it again?";
            historyRef.current.push({ role: 'assistant', content: reply });
            setCaption(reply);
            setStatus('speaking');
            await speak(reply);
        } catch (e: any) {
            setCaption(e?.message || 'Sorry, I had trouble answering.');
        } finally {
            busyRef.current = false;
            if (mountedRef.current && !mutedRef.current) {
                setStatus('listening');
                startRecognition();
            }
        }
    };

    useEffect(() => {
        mountedRef.current = true;

        const start = async () => {
            if (!isAIAllowedClient()) {
                setStatus('error');
                setCaption(AI_LOCKED_MESSAGE);
                return;
            }
            const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SR) {
                setStatus('unsupported');
                setCaption('Live voice needs Chrome or Edge. Please use Smart Chat instead.');
                return;
            }
            try {
                // Camera + mic preview (mic is used by speech recognition itself)
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => { });
                }

                // Simple voice-level visualizer
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                audioContextRef.current = ctx;
                const source = ctx.createMediaStreamSource(stream);
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                const buf = new Uint8Array(analyser.frequencyBinCount);
                const tick = () => {
                    if (!mountedRef.current) return;
                    analyser.getByteFrequencyData(buf);
                    const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
                    setVolumeLevel(Math.min(100, avg));
                    requestAnimationFrame(tick);
                };
                tick();

                // Continuous local speech recognition
                const rec = new SR();
                rec.lang = 'en-NG';
                rec.continuous = false;      // one utterance at a time; we restart
                rec.interimResults = false;
                rec.onresult = (e: any) => {
                    const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
                    handleUtterance(transcript);
                };
                rec.onend = () => {
                    // Restart listening unless we're answering or muted
                    if (mountedRef.current && !busyRef.current && !mutedRef.current) startRecognition();
                };
                rec.onerror = (e: any) => {
                    if (e?.error === 'not-allowed') {
                        setStatus('error');
                        setCaption('Microphone permission was denied.');
                    }
                };
                recognitionRef.current = rec;
                setStatus('listening');
                setCaption('Say something — I\'m listening!');
                startRecognition();
            } catch (error) {
                console.error('Failed to start live session', error);
                setStatus('error');
                setCaption('Could not access your camera/microphone.');
            }
        };

        start();

        return () => {
            mountedRef.current = false;
            try { recognitionRef.current?.abort?.(); } catch { }
            try { window.speechSynthesis?.cancel(); } catch { }
            streamRef.current?.getTracks().forEach(t => t.stop());
            audioContextRef.current?.close().catch(() => { });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMute = () => {
        const next = !isMuted;
        setIsMuted(next);
        mutedRef.current = next;
        if (next) {
            try { recognitionRef.current?.abort?.(); } catch { }
            setStatus('listening');
            setCaption('Muted — tap the mic to resume.');
        } else {
            setCaption('Listening again…');
            startRecognition();
        }
    };

    const statusLabel =
        status === 'connecting' ? 'Connecting…'
            : status === 'listening' ? (isMuted ? 'Muted' : 'Listening & Watching')
                : status === 'thinking' ? 'Thinking…'
                    : status === 'speaking' ? 'Speaking…'
                        : status === 'unsupported' ? 'Browser not supported'
                            : 'Unavailable';

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
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${status === 'listening' || status === 'speaking' ? 'bg-blue-500/20 border-4 border-blue-500' : status === 'thinking' ? 'bg-purple-500/20 border-4 border-purple-500' : 'bg-gray-700 animate-pulse'
                        }`}
                        style={{ transform: `scale(${1 + volumeLevel / 200})` }}
                    >
                        {status === 'listening' || status === 'speaking' || status === 'thinking' ? (
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${status === 'thinking' ? 'bg-purple-500' : 'bg-blue-500 animate-pulse'}`}>
                                <VideoIcon className="w-8 h-8 text-white" />
                            </div>
                        ) : (
                            <div className="text-xs font-mono text-center px-2">{statusLabel}</div>
                        )}
                    </div>

                    <div className="text-center px-4">
                        <h2 className="text-2xl font-bold">Live Voice</h2>
                        <p className="text-gray-300 text-sm">{statusLabel}</p>
                        {caption && (
                            <p className="mt-3 text-sm text-gray-100 bg-black/50 rounded-xl px-3 py-2 max-w-xs mx-auto line-clamp-4">{caption}</p>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center space-x-8">
                    <button
                        onClick={toggleMute}
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
