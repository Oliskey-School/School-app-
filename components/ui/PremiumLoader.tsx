import React from 'react';

/**
 * The one loading screen in the app: the Oliskey wordmark and the school icon.
 *
 * It used to paint twice on every appearance. The first render happened inline,
 * where the component sits in the tree, and a `mounted` state flag then moved it
 * into a portal on `document.body` a frame later — so it appeared, jumped, and
 * settled. That was one of the two flashes people saw while the app started.
 *
 * The portal was only ever there because a retained `transform` on the routed
 * screen wrapper used to trap `position: fixed` inside that wrapper. That
 * wrapper no longer has a transform, so `fixed inset-0` now resolves against the
 * viewport on its own and one render is enough.
 *
 * BOOT_MESSAGE is the single caption every start-up gate uses. Each gate mounts
 * its own loader, so a caption that changes halfway is the one remaining thing
 * that makes a continuous wait read as two separate loading screens.
 */
export const BOOT_MESSAGE = 'Setting up your school workspace...';

const PremiumLoader: React.FC<{ message?: string; fullScreen?: boolean }> = ({ message = BOOT_MESSAGE, fullScreen = true }) => {
    return (
        <div className={`flex flex-col items-center justify-center bg-white ${fullScreen ? 'fixed inset-0 z-[10000]' : 'w-full h-full flex-1 min-h-[60vh] z-50 rounded-2xl my-auto'}`}>
            <div className="relative">
                {/* Main Spinning Ring */}
                <div className="w-24 h-24 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>

                {/* Secondary Pulsing Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-indigo-50 rounded-full animate-pulse flex items-center justify-center">
                    <span className="text-2xl">🎓</span>
                </div>

                {/* Orbital Particle 1 — own keyframe name, see the note by the <style> below */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-400 rounded-full blur-[1px] animate-[oliskeyOrbit_2s_infinite]"></div>
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

            {/*
              * This used to redefine `@keyframes ping`, which is Tailwind's own
              * animation name — so mounting the loader silently changed every
              * `animate-ping` in the app for as long as it was on screen. Renamed
              * so it only affects the particle above.
              */}
            <style>{`
                @keyframes oliskeyOrbit {
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
