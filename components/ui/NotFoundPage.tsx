import React from 'react';
import { Home, ArrowLeft, Search, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-3xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row">
                
                {/* Visual Side */}
                <div className="md:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute top-40 -right-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
                    </div>
                    
                    <div className="relative z-10 w-full aspect-square flex items-center justify-center mb-8">
                        <span className="text-[10rem] font-black text-white/90 drop-shadow-2xl tracking-tighter leading-none animate-pulse">
                            404
                        </span>
                        <Map className="absolute w-24 h-24 text-indigo-200/50 -bottom-4 -right-4 rotate-12" />
                    </div>
                    
                    <div className="relative z-10 space-y-2">
                        <div className="inline-flex px-4 py-1.5 bg-white/20 rounded-full backdrop-blur-md border border-white/30 items-center space-x-2">
                            <Search className="w-4 h-4 text-indigo-100" />
                            <span className="text-indigo-100 text-xs font-bold tracking-wider uppercase">Page Not Found</span>
                        </div>
                    </div>
                </div>

                {/* Content Side */}
                <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                    <h1 className="text-3xl font-extrabold text-gray-900 leading-tight mb-4">
                        Looks like you're lost in space.
                    </h1>

                    <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                        We can't find the page you're looking for. It might have been moved, renamed, or perhaps it never existed.
                    </p>

                    <div className="space-y-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-full py-4 bg-indigo-50 text-indigo-700 font-bold rounded-2xl border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all flex items-center justify-center space-x-2 group"
                        >
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span>Go Back</span>
                        </button>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all flex items-center justify-center space-x-2 group"
                        >
                            <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span>Return to Dashboard</span>
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-center space-x-1 text-sm text-gray-400">
                        <span>Need help?</span>
                        <a href="mailto:support@oliskey.com" className="text-indigo-600 font-bold hover:underline">
                            Contact Support
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
