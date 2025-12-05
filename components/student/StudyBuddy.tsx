
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CameraIcon } from '../../constants';
import { THEME_CONFIG } from '../../constants';
import { DashboardType } from '../../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
}

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

const LoadingBubble = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
    </div>
);

const StudyBuddy: React.FC = () => {
    const theme = THEME_CONFIG[DashboardType.Student];
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: "Hello! I'm your Study Buddy. Ask me anything about your school subjects, or upload a picture of a problem you're stuck on." }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a friendly and encouraging study buddy for a high school student. Help them understand concepts without giving away the direct answer. Use simple language and lots of examples. Format your responses with markdown.',
            },
        });
    }, []);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = useCallback(async (text: string, imageFile?: File) => {
        if (!text && !imageFile) return;

        setIsLoading(true);
        setInputText('');
        
        let userMessage: Message;
        if (imageFile) {
            const imageUrl = URL.createObjectURL(imageFile);
            userMessage = { role: 'user', text, imageUrl };
        } else {
            userMessage = { role: 'user', text };
        }

        setMessages(prev => [...prev, userMessage, { role: 'model', text: '' }]);

        try {
            if (!chatRef.current) {
                throw new Error("Chat not initialized");
            }

            const parts: any[] = [];
            if (text) {
                parts.push({ text });
            }
            if (imageFile) {
                const imagePart = await fileToGenerativePart(imageFile);
                parts.push(imagePart);
            }

            const stream = await chatRef.current.sendMessageStream({ message: parts });

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text += chunkText;
                    return newMessages;
                });
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1].text = "Sorry, something went wrong. Please try again.";
              return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(inputText);
    };

    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleSendMessage("Can you help me with this problem?", file);
        }
    };
    
    return (
        <div className="flex flex-col h-full" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundRepeat: 'repeat', backgroundSize: 'auto' }}>
            {/* Chat Area */}
            <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 shadow flex flex-col ${msg.role === 'user' ? 'bg-orange-200 text-gray-800 rounded-t-xl rounded-bl-xl' : 'bg-white text-gray-800 rounded-t-xl rounded-br-xl'}`}>
                           {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="User upload" className="rounded-lg mb-2 max-h-48" />
                           )}
                           <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                                {msg.role === 'model' && !msg.text && index === messages.length - 1 && isLoading ? (
                                    <LoadingBubble />
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.text || ''}
                                    </ReactMarkdown>
                                )}
                           </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Form */}
            <div className="p-4 bg-gray-100 border-t border-gray-200">
                <form onSubmit={handleFormSubmit} className="flex items-center space-x-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                        disabled={isLoading}
                    />
                    <button type="button" onClick={handleCameraClick} disabled={isLoading} className="p-2 text-gray-500 hover:text-orange-500 disabled:opacity-50" aria-label="Upload image">
                        <CameraIcon className="h-6 w-6" />
                    </button>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-grow px-4 py-2 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !inputText} className={`px-4 py-2 rounded-full font-semibold text-white ${theme.mainBg} disabled:bg-orange-300 transition-colors`}>
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudyBuddy;
