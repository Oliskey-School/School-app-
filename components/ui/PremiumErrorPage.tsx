import React from 'react';
import { AlertCircle, RefreshCcw, Home, MessageCircle, Shield } from 'lucide-react';

interface PremiumErrorPageProps {
    title?: string;
    message?: string;
    error?: Error;
    resetErrorBoundary?: () => void;
    illustration?: string;
}

const PremiumErrorPage: React.FC<PremiumErrorPageProps> = ({
    title = "Oops! Something went wrong",
    message = "Our systems encountered an unexpected hiccup. Don't worry, your data is safe.",
    error,
    resetErrorBoundary,
    illustration = "/error-illustration.png" // Fallback to a default if not provided
}) => {
    const handleGoHome = () => {
        window.location.href = '/';
    };

    const handleContactSupport = () => {
        // Integrate with a support link or chat
        window.open('https://support.oliskey.com', '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row shadow-indigo-100/50">
                {/* Visual Side */}
                <div className="md:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-800 p-12 flex flex-col items-center justify-center text-center">
                    <div className="relative w-full aspect-square flex items-center justify-center">
                        <img
                            src={illustration}
                            alt="Error Illustration"
                            className="w-full h-full object-contain drop-shadow-2xl animate-float"
                            onError={(e) => {
                                // Fallback if image fails to load
                                e.currentTarget.src = 'https://illustrations.popsy.co/blue/crashed-computer.svg';
                            }}
                        />
                    </div>
                    <div className="mt-8 space-y-2">
                        <div className="inline-flex px-3 py-1 bg-white/20 rounded-full backdrop-blur-md border border-white/30 items-center space-x-2">
                            <Shield className="w-4 h-4 text-indigo-100" />
                            <span className="text-indigo-100 text-xs font-bold tracking-wider uppercase">Secure Environment</span>
                        </div>
                        <p className="text-white/60 text-xs italic">Error ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                    </div>
                </div>

                {/* Content Side */}
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                    <div className="inline-flex p-3 bg-red-100 rounded-2xl mb-6">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>

                    <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
                        {title}
                    </h1>

                    <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                        {message}
                    </p>

                    {error && (
                        <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-2 font-bold">Error Technical Details</p>
                            <p className="text-sm font-mono text-gray-500 break-words line-clamp-3">
                                {error.message}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {resetErrorBoundary && (
                            <button
                                onClick={resetErrorBoundary}
                                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
                            >
                                <RefreshCcw className="w-5 h-5" />
                                <span>Try Again Now</span>
                            </button>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleGoHome}
                                className="py-3 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center space-x-2"
                            >
                                <Home className="w-5 h-5" />
                                <span>Home</span>
                            </button>
                            <button
                                onClick={handleContactSupport}
                                className="py-3 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center space-x-2"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span>Support</span>
                            </button>
                        </div>
                    </div>

                    <p className="mt-8 text-sm text-gray-400 text-center">
                        Need help? <a href="mailto:support@oliskey.com" className="text-indigo-600 font-bold hover:underline">Contact our technical team</a>
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
            `}} />
        </div>
    );
};

export default PremiumErrorPage;
