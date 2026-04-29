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
        setNeedRefresh(false);
        // If it was a forced update from parent, we need to notify parent or use local state
        // For now, we'll use sessionStorage to hide it for this session if it's a version mismatch
        if (forced && targetVersion) {
            sessionStorage.setItem(`update_dismissed_${targetVersion}`, 'true');
            // Force a re-render by reloading or using a state from parent if we had one
            // But since this is a shared component, we'll just hide it locally
        }
        window.dispatchEvent(new CustomEvent('update_prompt_closed'));
    };

    // Check if this specific version update was already dismissed in this session
    const isDismissed = targetVersion && sessionStorage.getItem(`update_dismissed_${targetVersion}`) === 'true';

    // Show if PWA needs refresh OR if forced from parent AND not dismissed
    const show = (needRefresh || forced) && !isDismissed;
    if (!show) return null;

    const displayVersion = targetVersion || (needRefresh ? 'Update Found' : APP_VERSION);

    return (
        <div
            className="fixed z-[9999] bottom-4 right-4 animate-slide-up"
            style={{
                maxWidth: '400px',
                width: 'calc(100% - 2rem)',
            }}
        >
            <div
                style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px 20px 16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        {/* Update Icon */}
                        <div
                            style={{
                                flexShrink: 0,
                                width: '40px',
                                height: '40px',
                                background: forced ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                                    lineHeight: 1.2,
                                }}
                            >
                                {forced ? 'System Update Required' : 'New Update Available'}
                            </h3>
                            <p
                                style={{
                                    margin: '6px 0 0',
                                    fontSize: '13px',
                                    color: '#6b7280',
                                    lineHeight: 1.5,
                                }}
                            >
                                {forced 
                                    ? `Version ${targetVersion} is now available. Please update to stay in sync.`
                                    : "A new version with latest improvements is ready."
                                }
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={close}
                            style={{
                                flexShrink: 0,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#9ca3af',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            className="hover:bg-gray-100 transition-colors"
                        >
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                        <button
                            onClick={() => {
                                if (needRefresh) {
                                    updateServiceWorker(true);
                                } else {
                                    window.location.reload();
                                }
                            }}
                            style={{
                                flex: 1,
                                background: forced ? '#ef4444' : '#111827',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                            className="hover:opacity-90 active:scale-[0.98] transition-all"
                        >
                            Update Now
                        </button>
                        
                        <button
                            onClick={close}
                            style={{
                                flex: 1,
                                background: '#f3f4f6',
                                color: '#374151',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                            className="hover:bg-gray-200 active:scale-[0.98] transition-all"
                        >
                            Not Now
                        </button>
                    </div>
                </div>

                {/* Footer status */}
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
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: forced ? '#ef4444' : '#10b981' }}></div>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
                        {forced ? `Mandatory platform sync (v${targetVersion})` : 'App cache ready for reload'}
                    </span>
                </div>
            </div>
        </div>
    );
}
