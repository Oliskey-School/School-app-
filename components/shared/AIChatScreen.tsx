
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
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

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
    });
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
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    // --- Audio Recording & Transcription ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];
            
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/wav' });
                const base64Audio = await blobToBase64(audioBlob);
                handleTranscribe(base64Audio);
            };
            
            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
        } catch (e) {
            console.error("Mic error", e);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    const handleTranscribe = async (base64Audio: string) => {
        setIsLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Efficient for transcription
                contents: {
                    parts: [
                        { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
                        { text: "Transcribe this audio accurately." }
                    ]
                }
            });
            if (response.text) {
                setInputText(prev => (prev + " " + response.text).trim());
            }
        } catch (error) {
            console.error("Transcription error", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- TTS Playback ---
    const playTTS = async (text: string) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: { parts: [{ text }] },
                config: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } }
            });
            
            const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audioData) {
                const audioBlob = await (await fetch(`data:audio/mp3;base64,${audioData}`)).blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                audio.play();
            }
        } catch (error) {
            console.error("TTS Error", error);
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
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let modelName = 'gemini-2.5-flash-lite'; // Default fast
            let config: any = {};
            let parts: any[] = [];

            if (text) parts.push({ text });
            if (attachment) {
                const filePart = await fileToGenerativePart(attachment);
                parts.push(filePart);
                modelName = 'gemini-3-pro-preview'; // Switch for vision tasks
            }

            if (thinkingMode) {
                modelName = 'gemini-3-pro-preview';
                config.thinkingConfig = { thinkingBudget: 32768 };
            }

            if (useGrounding === 'search') {
                modelName = 'gemini-2.5-flash';
                config.tools = [{ googleSearch: {} }];
            } else if (useGrounding === 'maps') {
                modelName = 'gemini-2.5-flash';
                config.tools = [{ googleMaps: {} }];
            }

            const response = await ai.models.generateContent({
                model: modelName,
                contents: { parts },
                config: config
            });

            // Handle Grounding Metadata (URLs)
            let responseText = response.text || "No response generated.";
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                const urls = groundingChunks.map((c: any) => c.web?.uri || c.maps?.uri).filter(Boolean);
                if (urls.length > 0) {
                    responseText += "\n\n**Sources:**\n" + urls.map((u: string) => `- ${u}`).join('\n');
                }
            }

            setMessages(prev => [...prev, { role: 'model', text: responseText }]);

        } catch (error: any) {
            console.error("Chat Error", error);
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    // --- Render ---
    return (
        <div className="flex flex-col h-full bg-gray-100">
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
                        className={`flex-1 py-3 flex items-center justify-center space-x-2 border-b-4 transition-colors ${
                            activeTab === tab.id ? `border-${theme.iconColor.split('-')[1]}-500 text-gray-800` : 'border-transparent text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="font-medium text-sm hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-grow overflow-hidden relative bg-gray-50">
                {activeTab === 'live' && <LiveSession onClose={() => setActiveTab('chat')} />}
                
                {activeTab === 'create' && <MediaGenerator />}
                
                {activeTab === 'chat' && (
                    <div className="flex flex-col h-full">
                        {/* Chat Messages */}
                        <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 pb-32" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
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

                        {/* Chat Controls & Input */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3">
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
                                        onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputText); }}}
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
