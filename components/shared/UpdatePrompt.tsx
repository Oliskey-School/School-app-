import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION } from '../../lib/config';

interface UpdatePromptProps {
    forced?: boolean;
    targetVersion?: string;
}

export default function UpdatePrompt({ forced = false, targetVersion }: UpdatePromptProps) {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('✅ Service Worker registered for update checking:', r);
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
        if (forced) return; // Cannot close if forced
        setNeedRefresh(false);
    };

    // Show if PWA needs refresh OR if forced from parent
    const show = needRefresh || forced;
    if (!show) return null;

    const displayVersion = targetVersion || APP_VERSION;
    const isMismatch = targetVersion && targetVersion !== APP_VERSION;

    return (
        <div
            className={`fixed z-[9999] ${forced ? 'inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm' : 'bottom-4 right-4 animate-slide-up'}`}
            style={{
                left: forced ? '0' : 'auto',
                maxWidth: forced ? '100%' : '360px',
                width: forced ? '100%' : 'calc(100% - 2rem)',
            }}
        >
            <div
                style={{
                    background: '#ffffff',
                    borderRadius: forced ? '24px' : '14px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    width: forced ? '90%' : '100%',
                    maxWidth: forced ? '400px' : '360px',
                }}
            >
                {/* Header */}
                <div style={{ padding: forced ? '32px 24px' : '16px 16px 12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: forced ? 'column' : 'row', alignItems: forced ? 'center' : 'flex-start', gap: '16px', textAlign: forced ? 'center' : 'left' }}>
                        {/* Update Icon */}
                        <div
                            style={{
                                flexShrink: 0,
                                width: forced ? '64px' : '44px',
                                height: forced ? '64px' : '44px',
                                background: forced ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                borderRadius: forced ? '16px' : '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: forced ? '12px' : '0',
                            }}
                        >
                            <svg width={forced ? "32" : "22"} height={forced ? "32" : "22"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 1.4 0 2.8.4 4 1.1L21.5 8M22 12c0 4.4-3.6 8-8 8-1.4 0-2.8-.4-4-1.1L2.5 16" />
                            </svg>
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h3
                                style={{
                                    margin: 0,
                                    fontSize: forced ? '20px' : '15px',
                                    fontWeight: 800,
                                    color: '#111827',
                                    lineHeight: 1.3,
                                }}
                            >
                                {forced ? 'Mandatory Update' : 'Update Available'}
                            </h3>
                            <p
                                style={{
                                    margin: '8px 0 0',
                                    fontSize: forced ? '15px' : '13px',
                                    color: '#6b7280',
                                    lineHeight: 1.6,
                                }}
                            >
                                {forced 
                                    ? `Your school has moved to version ${displayVersion}. You must refresh to continue using the application.`
                                    : `A new production version (${displayVersion}) is ready. Update now to get the latest features.`
                                }
                            </p>
                        </div>

                        {/* Close button (only if not forced) */}
                        {!forced && (
                            <button
                                onClick={close}
                                style={{
                                    flexShrink: 0,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    color: '#9ca3af',
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: forced ? 'column' : 'row', alignItems: 'center', gap: '12px', marginTop: forced ? '24px' : '14px' }}>
                        <button
                            onClick={() => {
                                if (needRefresh) {
                                    updateServiceWorker(true);
                                } else {
                                    window.location.reload();
                                }
                            }}
                            style={{
                                width: '100%',
                                flex: 1,
                                background: forced ? '#ef4444' : 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                padding: forced ? '14px 24px' : '10px 16px',
                                fontSize: forced ? '16px' : '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'transform 0.1s',
                            }}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            Update Now
                        </button>
                        
                        {!forced && (
                            <button
                                onClick={close}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6b7280',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    padding: '10px 8px',
                                }}
                            >
                                Not Now
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer badge */}
                <div
                    style={{
                        background: '#f9fafb',
                        borderTop: '1px solid #f3f4f6',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: forced ? 'center' : 'flex-start',
                        gap: '6px',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="#6b7280">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
                        {forced ? 'System wide security & feature synchronization' : 'Refreshing your app with new secure updates'}
                    </span>
                </div>
            </div>
        </div>
    );
}
