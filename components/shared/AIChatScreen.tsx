
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getAIClient, AI_MODEL_NAME } from '../../lib/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CameraIcon, SendIcon, MicrophoneIcon, SparklesIcon, VideoIcon, PhotoIcon, BriefcaseIcon, MapIcon, SearchIcon, PlayIcon, StopIcon, AIIcon } from '../../constants';
import { THEME_CONFIG } from '../../constants';
import { DashboardType } from '../../types';
import Header from '../ui/Header';
import LiveSession from './LiveSession';
import MediaGenerator from './MediaGenerator';

interface Message {
    role: 'user' | 'model';
    text: string;
    imageUrl?: string;
    audioData?: string; // Base64 encoded
}

interface AIChatScreenProps {
    onBack: () => void;
    dashboardType: DashboardType;
}

// --- Helper Functions ---
const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

// --- Main Component ---
const AIChatScreen: React.FC<AIChatScreenProps> = ({ onBack, dashboardType }) => {
    const theme = THEME_CONFIG[dashboardType];
    const [activeTab, setActiveTab] = useState<'chat' | 'live' | 'create'>('chat');

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: "Hello! I'm your enhanced AI assistant. Use the tabs below to switch between Chat, Live Voice, and Creative Studio." }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // Chat Settings
    const [thinkingMode, setThinkingMode] = useState(false);
    const [useGrounding, setUseGrounding] = useState<'none' | 'search' | 'maps'>('none');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // --- Voice input: browser speech recognition (instant, free, offline-safe).
    // The old flow recorded audio and sent it to a TEXT model, which can't
    // transcribe — the mic button looked alive but never produced words.
    const recognitionRef = useRef<any>(null);
    const startRecording = () => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            toast.error('Voice input needs Chrome or Edge. Please type your question instead.');
            return;
        }
        try {
            const rec = new SR();
            rec.lang = 'en-NG';
            rec.interimResults = false;
            rec.continuous = false;
            rec.onresult = (e: any) => {
                const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
                if (transcript) setInputText(prev => (prev + ' ' + transcript).trim());
            };
            rec.onend = () => setIsRecording(false);
            rec.onerror = (e: any) => {
                setIsRecording(false);
                if (e?.error !== 'no-speech' && e?.error !== 'aborted') toast.error('Could not hear you — try again.');
            };
            recognitionRef.current = rec;
            rec.start();
            setIsRecording(true);
        } catch (e) {
            console.error('Mic error', e);
            toast.error('Could not access microphone.');
        }
    };

    const stopRecording = () => {
        recognitionRef.current?.stop();
        setIsRecording(false);
    };

    // --- Read a reply aloud: browser speech synthesis (works everywhere, no
    // network). The old flow asked the model for audio it can't produce.
    const playTTS = (text: string) => {
        try {
            if (!('speechSynthesis' in window)) { toast.error('Read-aloud is not supported in this browser.'); return; }
            window.speechSynthesis.cancel();
            const clean = text.replace(/[*_#`>\[\]]/g, '').replace(/\n+/g, '. ');
            const utter = new SpeechSynthesisUtterance(clean);
            utter.rate = 1;
            window.speechSynthesis.speak(utter);
        } catch (error) {
            console.error('TTS Error', error);
        }
    };

    // --- Main Chat Logic ---
    const handleSendMessage = async (text: string, attachment?: File) => {
        if (!text && !attachment) return;

        setIsLoading(true);
        setInputText('');

        let userMsg: Message = { role: 'user', text };
        if (attachment) {
            userMsg.imageUrl = URL.createObjectURL(attachment);
        }
        setMessages(prev => [...prev, userMsg]);

        try {
            const ai = getAIClient();
            let parts: any[] = [];

            if (text) parts.push({ text });
            if (attachment) {
                const filePart = await fileToGenerativePart(attachment);
                parts.push(filePart);
            }

            // Every mode gets a purpose-built instruction so the buttons DO
            // something real (the old code set Gemini-only "tools" that our AI
            // provider ignores, and Deep Thinker was an empty block).
            const sysLines = [
                'You are a friendly AI assistant inside a Nigerian school app, helping students, teachers, parents and admins. Be accurate, age-appropriate and encouraging. Use clear examples relevant to Nigerian schools when helpful.',
            ];
            // Deep Thinker → a stronger reasoning model + step-by-step working
            let modelName: string | undefined;
            if (thinkingMode) {
                modelName = 'deepseek-ai/deepseek-v4-flash';
                sysLines.push('Deep-Thinking mode: reason step by step. Briefly show your working (numbered steps) before the final answer — like a good teacher on a whiteboard.');
            }
            if (useGrounding === 'search') {
                sysLines.push('Research mode: answer like a research assistant. You do NOT have live internet access, so be upfront when a fact could be outdated (prices, current officials, recent events), and end with 2-3 reliable places to verify (e.g. official websites, WAEC/NECO resources, textbooks).');
            } else if (useGrounding === 'maps') {
                sysLines.push('Places mode: answer geography and location questions descriptively (landmarks, distances, regions, travel context — Nigeria-aware). You cannot access live maps, so for directions or current travel times, advise checking a maps app and focus on teaching the geography.');
            }

            const response = await ai.models.generateContent({
                ...(modelName ? { model: modelName } : {}),
                contents: { parts },
                systemInstruction: { parts: [{ text: sysLines.join('\n') }] },
            });

            const responseText = response.text || "No response generated.";
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);

        } catch (error: any) {
            console.error("Chat Error", error);
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Auto-scroll to latest message
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        }, 0);
    }, [messages]);

    // --- Render ---
    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <Header
                title="AI Assistant"
                avatarUrl={`https://i.pravatar.cc/150?u=${dashboardType.toLowerCase()}`}
                bgColor={theme.mainBg}
                onBack={onBack}
            />

            {/* Mode Tabs */}
            <div className="flex bg-white shadow-sm z-10">
                {[
                    { id: 'chat', label: 'Smart Chat', icon: AIIcon },
                    { id: 'live', label: 'Live Voice', icon: MicrophoneIcon },
                    { id: 'create', label: 'Creative Studio', icon: SparklesIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-3 flex items-center justify-center space-x-2 border-b-4 transition-colors ${activeTab === tab.id ? `border-${theme.iconColor.split('-')[1]}-500 text-gray-800` : 'border-transparent text-gray-500 hover:bg-gray-50'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="font-medium text-sm hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-grow overflow-hidden relative bg-gray-50 flex flex-col">
                {activeTab === 'live' && <LiveSession onClose={() => setActiveTab('chat')} />}

                {activeTab === 'create' && <MediaGenerator />}

                {activeTab === 'chat' && (
                    <div className="flex flex-col h-full">
                        {/* Chat Messages */}
                        <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 pb-24" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm relative ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
                                        {msg.imageUrl && <img src={msg.imageUrl} alt="Upload" className="rounded-lg mb-2 max-h-48 object-cover" />}
                                        <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                        </div>
                                        {msg.role === 'model' && (
                                            <button onClick={() => playTTS(msg.text)} className="absolute -bottom-3 -right-3 p-1.5 bg-gray-200 rounded-full hover:bg-gray-300 shadow-sm text-gray-600">
                                                <PlayIcon className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm"><div className="flex space-x-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div></div></div></div>
                            )}
                        </div>

                        {/* Chat Controls & Input - Fixed at Device Bottom */}
                        <div className="fixed bottom-0 left-0 right-0 w-full max-w-full bg-white border-t border-gray-200 p-3 shadow-lg z-50">
                            {/* Tool Toggles */}
                            <div className="flex space-x-2 overflow-x-auto pb-2 mb-1 no-scrollbar">
                                <button onClick={() => setThinkingMode(!thinkingMode)} className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${thinkingMode ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    <SparklesIcon className="w-3 h-3" /> <span>Deep Thinker</span>
                                </button>
                                <button onClick={() => setUseGrounding(useGrounding === 'search' ? 'none' : 'search')} className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${useGrounding === 'search' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    <SearchIcon className="w-3 h-3" /> <span>Web Search</span>
                                </button>
                                <button onClick={() => setUseGrounding(useGrounding === 'maps' ? 'none' : 'maps')} className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${useGrounding === 'maps' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    <MapIcon className="w-3 h-3" /> <span>Maps</span>
                                </button>
                            </div>

                            {/* Input Bar */}
                            <div className="flex items-end space-x-2">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleSendMessage("", e.target.files[0])} />
                                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><CameraIcon className="w-6 h-6" /></button>

                                <div className="flex-grow bg-gray-100 rounded-2xl flex items-center px-3 py-2">
                                    <textarea
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        placeholder="Ask anything..."
                                        className="bg-transparent w-full outline-none resize-none text-sm max-h-24"
                                        rows={1}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputText); } }}
                                    />
                                </div>

                                {inputText ? (
                                    <button onClick={() => handleSendMessage(inputText)} className={`p-3 rounded-full text-white shadow-md ${theme.mainBg}`}><SendIcon className="w-5 h-5" /></button>
                                ) : (
                                    <button onClick={isRecording ? stopRecording : startRecording} className={`p-3 rounded-full shadow-md ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                        {isRecording ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIChatScreen;
