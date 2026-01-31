
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { WifiIcon, WifiOffIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react';

const ConnectionStatus: React.FC = () => {
    const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
    const [latency, setLatency] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const checkConnection = async () => {
        setStatus('checking');
        setErrorMessage(null);
        const start = performance.now();

        try {
            // "Ping" query - lightweight check
            const { count, error } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;

            const end = performance.now();
            setLatency(Math.round(end - start));
            setStatus('connected');
        } catch (err: any) {
            console.error('Supabase Connection Error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to connect');
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300
                ${status === 'connected' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : ''}
                ${status === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' : ''}
                ${status === 'checking' ? 'bg-slate-50/90 border-slate-200 text-slate-600' : ''}
            `}>
                {/* Icon Indicator */}
                <div className="relative">
                    {status === 'checking' && (
                        <div className="animate-spin text-slate-500">
                            <RefreshCwIcon className="w-5 h-5" />
                        </div>
                    )}

                    {status === 'connected' && (
                        <div className="relative">
                            <WifiIcon className="w-5 h-5 text-emerald-600" />
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        </div>
                    )}

                    {status === 'error' && (
                        <WifiOffIcon className="w-5 h-5 text-red-600" />
                    )}
                </div>

                {/* Status Text */}
                <div className="flex flex-col">
                    <span className="text-sm font-bold leading-none">
                        {status === 'checking' && 'Connecting...'}
                        {status === 'connected' && 'System Online'}
                        {status === 'error' && 'Connection Failed'}
                    </span>

                    {status === 'connected' && latency && (
                        <span className="text-[10px] font-mono opacity-80 mt-1">
                            {latency}ms latency • Region: EU
                        </span>
                    )}

                    {status === 'error' && (
                        <span className="text-[10px] font-medium opacity-90 mt-1 max-w-[150px] truncate">
                            {errorMessage}
                        </span>
                    )}
                </div>

                {/* Retry Button (only on error) */}
                {status === 'error' && (
                    <button
                        onClick={checkConnection}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors ml-2"
                        title="Retry Connection"
                    >
                        <RefreshCwIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ConnectionStatus;
