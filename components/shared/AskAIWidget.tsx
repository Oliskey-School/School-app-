import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Sparkles, Send, X, HelpCircle } from 'lucide-react';

interface AskEntry { question: string; answer: string; data: any; }

const AskAIWidget = () => {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [asking, setAsking] = useState(false);
    const [history, setHistory] = useState<AskEntry[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && suggestions.length === 0) {
            api.getAskAISuggestions().then(res => setSuggestions(res.questions || [])).catch(() => {});
        }
    }, [open, suggestions.length]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [history]);

    const handleAsk = async (q?: string) => {
        const text = (q || question).trim();
        if (!text) return;
        setAsking(true);
        setQuestion('');
        try {
            const res = await api.askAI(text);
            setHistory(h => [...h, { question: text, answer: res.answer, data: res.data }]);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to get an answer');
        } finally {
            setAsking(false);
        }
    };

    if (!open) {
        return (
            <button onClick={() => setOpen(true)}
                className="fixed bottom-24 right-4 z-40 flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-xl hover:bg-indigo-700 transition-colors">
                <Sparkles className="w-5 h-5" /> <span className="text-sm font-bold hidden sm:inline">Ask AI</span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[70vh]">
            <div className="px-5 py-4 bg-indigo-600 text-white rounded-t-3xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold">Ask AI</h3>
                </div>
                <button onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 && (
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Try asking:</p>
                        {suggestions.slice(0, 5).map((s, i) => (
                            <button key={i} onClick={() => handleAsk(s)} className="w-full text-left text-sm bg-gray-50 hover:bg-indigo-50 text-gray-700 rounded-xl px-3 py-2 transition-colors">
                                {s}
                            </button>
                        ))}
                    </div>
                )}
                {history.map((h, i) => (
                    <div key={i} className="space-y-1.5">
                        <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2 ml-auto max-w-[85%] w-fit">{h.question}</div>
                        <div className="bg-gray-50 text-gray-800 text-sm rounded-2xl rounded-bl-sm px-4 py-2 max-w-[90%] w-fit">{h.answer}</div>
                    </div>
                ))}
                {asking && <div className="bg-gray-50 text-gray-400 text-sm rounded-2xl px-4 py-2 w-fit">Thinking...</div>}
            </div>

            <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()}
                    placeholder="Ask a question..." disabled={asking}
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                <button onClick={() => handleAsk()} disabled={asking || !question.trim()} className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0">
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default AskAIWidget;
