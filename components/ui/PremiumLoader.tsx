import React from 'react';

/**
 * PremiumLoader - A high-end loading component with smooth CSS animations.
 */
const PremiumLoader: React.FC<{ message?: string; fullScreen?: boolean }> = ({ message = 'Loading professional workspace...', fullScreen = true }) => {
    return (
        <div className={`flex flex-col items-center justify-center bg-white ${fullScreen ? 'fixed inset-0 z-[10000]' : 'w-full h-full flex-1 min-h-[60vh] z-50 rounded-2xl my-auto'}`}>
            <div className="relative">
                {/* Main Spinning Ring */}
                <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>

                {/* Secondary Pulsing Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-50 rounded-full animate-pulse flex items-center justify-center">
                    <span className="text-2xl">🎓</span>
                </div>

                {/* Orbital Particle 1 */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-400 rounded-full blur-[1px] animate-[ping_2s_infinite]"></div>
            </div>

            <div className="mt-8 text-center">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-sky-500 animate-pulse">
                    Oliskey School App
                </h3>
                <p className="mt-2 text-slate-500 font-medium tracking-wide flex items-center justify-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></span>
                    {message}
                    <span className="inline-block w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                </p>
            </div>

            <style>{`
                @keyframes ping {
                    75%, 100% {
                        transform: translate(-50%, 40px) scale(2);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default PremiumLoader;
