import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
    Mic,
    MicOff,
    Search,
    X,
    Loader2
} from 'lucide-react';

interface VoiceSearchWidgetProps {
    onSearch: (query: string) => void;
    placeholder?: string;
    showInput?: boolean;
}

const VoiceSearchWidget: React.FC<VoiceSearchWidgetProps> = ({ onSearch, placeholder = 'Search or speak...', showInput = true }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [inputValue, setInputValue] = useState('');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'en-NG';
            recognition.onresult = (event: any) => {
                const current = event.results[event.results.length - 1];
                const text = current[0].transcript;
                setTranscript(text);
                setInputValue(text);
                if (current.isFinal) {
                    setIsListening(false);
                    onSearch(text);
                }
            };
            recognition.onerror = () => {
                setIsListening(false);
                toast.error('Voice search not available. Please type your query.');
            };
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
        return () => { if (recognitionRef.current) recognitionRef.current.abort(); };
    }, [onSearch]);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error('Voice search is not supported in this browser.');
            return;
        }
        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) onSearch(inputValue);
    };

    if (!showInput) {
        return (
            <button type="button" onClick={toggleListening}
                className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-gray-400" />
            <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder={placeholder}
                className="w-full pl-12 pr-14 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" />
            <button type="button" onClick={toggleListening}
                className={`absolute right-2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
        </form>
    );
};

export default VoiceSearchWidget;
