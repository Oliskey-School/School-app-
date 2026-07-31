
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon } from '../../../constants';

const messages = [
    "Summoning the AI oracle...",
    "Decoding ancient scrolls...",
    "Polishing the quiz questions...",
    "Crafting magical illustrations...",
    "Building your quest map...",
    "Waking up the knowledge sprites..."
];

const LoadingScreen: React.FC = () => {
    const [message, setMessage] = useState(messages[0]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMessage(prevMessage => {
                let newMessage = prevMessage;
                while (newMessage === prevMessage) {
                    newMessage = messages[Math.floor(Math.random() * messages.length)];
                }
                return newMessage;
            });
        }, 2500);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-teal-400 to-blue-500 text-white p-4 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="relative"
            >
                <SparklesIcon className="w-24 h-24 text-white/50" />
                <SparklesIcon className="w-16 h-16 text-white/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-2xl font-bold mt-4">Crafting Your Adventure...</motion.h1>
            <AnimatePresence mode="wait">
                <motion.p
                    key={message}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="mt-2 text-white/90"
                >
                    {message}
                </motion.p>
            </AnimatePresence>
        </div>
    );
};

export default LoadingScreen;
