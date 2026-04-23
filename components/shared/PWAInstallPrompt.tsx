import React from 'react';
import { usePWAInstall, isStandalone } from '../../lib/pwa';
import { useAuth } from '../../context/AuthContext';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function isDismissed(): boolean {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < DISMISS_DURATION_MS;
}

export default function PWAInstallPrompt() {
    const { user } = useAuth();
    const { canInstall, isInstalled, promptInstall } = usePWAInstall();
    const [showPrompt, setShowPrompt] = React.useState(false);

    // Show the prompt immediately when the user logs in on the web (not the installed app)
    React.useEffect(() => {
        if (!user) return;                // Not logged in yet
        if (isStandalone()) return;       // Already running as installed app
        if (isInstalled) return;           // Just got installed
        if (isDismissed()) return;         // User dismissed recently

        // Show right away on login
        setShowPrompt(true);
    }, [user, isInstalled]);

    // Also hide if they install the app mid-session
    React.useEffect(() => {
        if (isInstalled) setShowPrompt(false);
    }, [isInstalled]);

    const handleInstall = async () => {
        if (canInstall) {
            // Native browser install prompt available — use it
            const accepted = await promptInstall();
            if (accepted) {
                setShowPrompt(false);
                return;
            }
        }
        // If native prompt fails or user cancels, don't necessarily dismiss forever
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    };

    if (!showPrompt || !user) return null;

    return (
        <div
            className="fixed z-[9999] animate-slide-up"
            style={{
                bottom: '1rem',
                right: '1rem',
                left: 'auto',
                maxWidth: '360px',
                width: 'calc(100% - 2rem)',
            }}
        >
            <div
                style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    border: '1px solid #f3f4f6',
                    overflow: 'hidden',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px 20px 16px 20px', position: 'relative' }}>
                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        aria-label="Close install prompt"
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#9ca3af',
                            lineHeight: 1,
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        {/* App Icon */}
                        <div
                            style={{
                                flexShrink: 0,
                                width: '48px',
                                height: '48px',
                                background: '#5452F6', // Exact rich blue/indigo from screenshot
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '2px', // Slight optical adjustment
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 20 20" fill="white">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: '#1f2937',
                                    lineHeight: 1.3,
                                }}
                            >
                                Install School App
                            </h3>
                            <p
                                style={{
                                    margin: '6px 0 0',
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    lineHeight: 1.5,
                                }}
                            >
                                Install for quick access and offline use.
                                Works even without internet!
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px' }}>
                        <button
                            id="pwa-install-now-btn"
                            onClick={handleInstall}
                            style={{
                                flex: 1,
                                background: '#5452F6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'background-color 0.15s, opacity 0.15s',
                                boxShadow: '0 2px 4px rgba(84, 82, 246, 0.2)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                            Install Now
                        </button>
                        <button
                            id="pwa-install-later-btn"
                            onClick={handleDismiss}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b7280',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                padding: '12px 8px',
                                whiteSpace: 'nowrap',
                                transition: 'color 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
                        >
                            Not Now
                        </button>
                    </div>
                </div>

                {/* Footer badge */}
                <div
                    style={{
                        background: '#f8fafc',
                        padding: '10px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#6b7280',
                        color: 'white'
                    }}>
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                        Fast, reliable, and works offline
                    </span>
                </div>
            </div>
        </div>
    );
}
