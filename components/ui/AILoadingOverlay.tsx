import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '../../constants';

interface AILoadingOverlayProps {
    isVisible: boolean;
    messages?: string[];
}

const defaultMessages = [
    "Analyzing requirements...",
    "Consulting the knowledge base...",
    "Drafting content...",
    "Refining structure...",
    "Applying educational standards...",
    "Finalizing your resources..."
];

export const AILoadingOverlay: React.FC<AILoadingOverlayProps> = ({
    isVisible,
    messages = defaultMessages
}) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        if (!isVisible) return;

        const interval = setInterval(() => {
            setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2500);

        return () => clearInterval(interval);
    }, [isVisible, messages]);

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center overflow-hidden rounded-xl">
            {/* Dynamic Background with Glassmorphism */}
            <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-md transition-all duration-500" />

            {/* Radial Gradient Orbs for vibe */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

            <div className="relative z-10 flex flex-col items-center p-8 max-w-sm w-full text-center">
                {/* Animated Icon Container */}
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative bg-gradient-to-tr from-indigo-500 to-purple-600 p-4 rounded-full shadow-lg shadow-indigo-500/40 animate-bounce-slow">
                        <SparklesIcon className="w-10 h-10 text-white animate-spin-slow" />
                    </div>

                    {/* Orbiting particles */}
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '3s' }}>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-2 h-2 bg-pink-400 rounded-full shadow-glow" />
                    </div>
                    <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-glow" />
                    </div>
                </div>

                {/* Text Content */}
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                    AI is working magic
                </h3>

                {/* Animated Message Switcher */}
                <div className="h-6 overflow-hidden w-full">
                    <p className="text-indigo-100 text-sm font-medium animate-fade-in-up key={currentMessageIndex}">
                        {messages[currentMessageIndex]}
                    </p>
                </div>

                {/* Progress Bar (Indeterminate) */}
                <div className="mt-8 w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 w-1/2 animate-shimmer-slide rounded-full" />
                </div>
            </div>

            <style>{`
        @keyframes shimmer-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shimmer-slide {
          animation: shimmer-slide 2s infinite linear;
        }
        .animate-spin-slow {
          animation: spin 4s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
};
