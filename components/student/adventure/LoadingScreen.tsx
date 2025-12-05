
import React, { useState, useEffect } from 'react';
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
            <div className="relative">
                <SparklesIcon className="w-24 h-24 text-white/50" />
                <SparklesIcon className="w-16 h-16 text-white/80 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mt-4">Crafting Your Adventure...</h1>
            <p className="mt-2 text-white/90 transition-opacity duration-500">{message}</p>
        </div>
    );
};

export default LoadingScreen;
