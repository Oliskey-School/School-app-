import React from 'react';
import { usePWAInstall } from '../../lib/pwa';

export function PWAInstallPrompt() {
    const { canInstall, isInstalled, promptInstall } = usePWAInstall();
    const [showPrompt, setShowPrompt] = React.useState(false);
    const [dismissed, setDismissed] = React.useState(false);

    React.useEffect(() => {
        // Show prompt after 30 seconds if not installed and not dismissed
        const timer = setTimeout(() => {
            if (canInstall && !dismissed) {
                setShowPrompt(true);
            }
        }, 30000);

        return () => clearTimeout(timer);
    }, [canInstall, dismissed]);

    const handleInstall = async () => {
        const accepted = await promptInstall();
        if (accepted) {
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setDismissed(true);
        // Remember dismissal for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    if (isInstalled || !canInstall || !showPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:bottom-4 md:left-4 md:right-auto md:max-w-md">
            <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden animate-slide-up">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                Install School App
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Install for quick access and offline use. Works even without internet!
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleInstall}
                                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
                                >
                                    Install Now
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                                >
                                    Not Now
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span>Fast, reliable, and works offline</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
