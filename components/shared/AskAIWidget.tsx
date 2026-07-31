import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

    return (
        <AnimatePresence mode="wait">
            {!open ? (
                <motion.button
                    key="closed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpen(true)}
                    className="fixed bottom-24 right-4 z-40 flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-xl hover:bg-indigo-700 transition-colors">
                    <Sparkles className="w-5 h-5" /> <span className="text-sm font-bold hidden sm:inline">Ask AI</span>
                </motion.button>
            ) : (
                <motion.div
                    key="open"
                    initial={{ opacity: 0, scale: 0.9, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 16 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-4 right-4 z-50 w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[70vh]"
                >
                    <div className="px-5 py-4 bg-indigo-600 text-white rounded-t-3xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            <h3 className="font-bold">Ask AI</h3>
                        </div>
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(false)}><X className="w-5 h-5" /></motion.button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                        {history.length === 0 && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-400 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Try asking:</p>
                                {suggestions.slice(0, 5).map((s, i) => (
                                    <motion.button
                                        key={i}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: i * 0.05 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleAsk(s)}
                                        className="w-full text-left text-sm bg-gray-50 hover:bg-indigo-50 text-gray-700 rounded-xl px-3 py-2 transition-colors"
                                    >
                                        {s}
                                    </motion.button>
                                ))}
                            </div>
                        )}
                        {history.map((h, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-1.5"
                            >
                                <div className="bg-indigo-600 text-white text-sm rounded-2xl rounded-br-sm px-4 py-2 ml-auto max-w-[85%] w-fit">{h.question}</div>
                                <div className="bg-gray-50 text-gray-800 text-sm rounded-2xl rounded-bl-sm px-4 py-2 max-w-[90%] w-fit">{h.answer}</div>
                            </motion.div>
                        ))}
                        {asking && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-gray-50 text-gray-400 text-sm rounded-2xl px-4 py-2 w-fit">
                                Thinking...
                            </motion.div>
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                        <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()}
                            placeholder="Ask a question..." disabled={asking}
                            className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                        <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleAsk()} disabled={asking || !question.trim()} className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0">
                            <Send className="w-4 h-4" />
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AskAIWidget;
