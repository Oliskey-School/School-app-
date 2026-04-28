import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('✅ Service Worker registered for update checking:', r);
            // Check for updates every 60 minutes
            if (r) {
                setInterval(() => {
                    r.update();
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.error('❌ Service Worker registration error:', error);
        },
    });

    const close = () => {
        setNeedRefresh(false);
    };

    if (!needRefresh) return null;

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
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {/* Header */}
                <div style={{ padding: '16px 16px 12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Update Icon */}
                        <div
                            style={{
                                flexShrink: 0,
                                width: '44px',
                                height: '44px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // Emerald gradient
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 1.4 0 2.8.4 4 1.1L21.5 8M22 12c0 4.4-3.6 8-8 8-1.4 0-2.8-.4-4-1.1L2.5 16" />
                            </svg>
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    color: '#111827',
                                    lineHeight: 1.3,
                                }}
                            >
                                Update Available
                            </h3>
                            <p
                                style={{
                                    margin: '4px 0 0',
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    lineHeight: 1.5,
                                }}
                            >
                                A new production version (0.5.29) is ready. Update now to get the latest features and security fixes.
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={close}
                            aria-label="Close update prompt"
                            style={{
                                flexShrink: 0,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#9ca3af',
                                lineHeight: 1,
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px' }}>
                        <button
                            id="pwa-update-now-btn"
                            onClick={() => updateServiceWorker(true)}
                            style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 16px',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                            Update Now
                        </button>
                        <button
                            id="pwa-update-later-btn"
                            onClick={close}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b7280',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                padding: '10px 8px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Not Now
                        </button>
                    </div>
                </div>

                {/* Footer badge */}
                <div
                    style={{
                        background: '#f9fafb',
                        borderTop: '1px solid #f3f4f6',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="#6b7280">
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                        />
                    </svg>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        Refreshing your app with new secure updates
                    </span>
                </div>
            </div>
        </div>
    );
}
