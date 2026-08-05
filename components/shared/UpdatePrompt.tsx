import React, { useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION } from '../../lib/config';
import { api } from '../../lib/api';

interface UpdatePromptProps {
    forced?: boolean;
    targetVersion?: string;
}

export default function UpdatePrompt({ forced = false, targetVersion }: UpdatePromptProps) {
    // Holds the live ServiceWorkerRegistration so "Update Now" can force an
    // immediate check for a new build instead of waiting for the hourly poll.
    const registrationRef = React.useRef<ServiceWorkerRegistration | undefined>(undefined);
    const [updating, setUpdating] = useState(false);
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('✅ Service Worker registered for update checking:', r);
            registrationRef.current = r;
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

    // Local dismissed flag — needed for the forced variant where setNeedRefresh(false)
    // is a no-op (needRefresh was already false). Without this useState the sessionStorage
    // write below would not trigger a re-render and the prompt would stay visible.
    const [locallyDismissed, setLocallyDismissed] = useState<boolean>(() =>
        !!(targetVersion && sessionStorage.getItem(`update_dismissed_${targetVersion}`) === 'true')
    );

    // Pull the REAL latest published version from the backend so the prompt always
    // reflects the actual current release (not a stale hard-coded string).
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    React.useEffect(() => {
        if (forced) return; // forced already carries the authoritative targetVersion
        let active = true;
        api.getAppVersions()
            .then((list: any[]) => {
                if (active && Array.isArray(list) && list[0]?.version) setLatestVersion(list[0].version);
            })
            .catch(() => { /* non-blocking — fall back to APP_VERSION */ });
        return () => { active = false; };
    }, [forced]);

    // "needRefresh" only becomes true once the browser's own service-worker
    // lifecycle has already noticed a new build sitting in "waiting" — but
    // this banner (especially the forced/mandatory variant) can appear before
    // that check has run. Clicking through to `updateServiceWorker(true)`
    // straight away was frequently a no-op: nothing was waiting yet, so
    // nothing got skip-activated, and the plain `window.location.reload()`
    // fallback often just re-served the same old cached build. Forcing a
    // fresh `registration.update()` first gives the browser a real chance to
    // find and install the new worker before we try to activate it.
    const handleUpdateNow = async () => {
        setUpdating(true);
        try {
            if (registrationRef.current) {
                await registrationRef.current.update();
                // Give the install/"waiting" event a moment to land — it fires
                // asynchronously after update() resolves.
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            await updateServiceWorker(true);
        } catch (error) {
            console.error('❌ Update check failed:', error);
        } finally {
            // Always reload: if a new worker WAS found, it's now controlling
            // the page and this loads the new build. If there genuinely was
            // nothing new, this is a harmless refresh — either way the user
            // sees the button actually do something instead of sitting dead.
            window.location.reload();
        }
    };

    const close = () => {
        setNeedRefresh(false);
        if (forced && targetVersion) {
            sessionStorage.setItem(`update_dismissed_${targetVersion}`, 'true');
        }
        setLocallyDismissed(true);
        window.dispatchEvent(new CustomEvent('update_prompt_closed'));
    };

    // Show if PWA needs refresh OR if forced from parent AND not dismissed
    const show = (needRefresh || forced) && !locallyDismissed;

    // Coordinate with the install prompt so the two cards never stack on top of
    // each other — while any update prompt is visible we bump a global counter the
    // install prompt watches, so prompts appear one after the other.
    React.useEffect(() => {
        if (!show) return;
        const w = window as any;
        w.__updatePromptCount = (w.__updatePromptCount || 0) + 1;
        window.dispatchEvent(new Event('update_prompt_changed'));
        return () => {
            w.__updatePromptCount = Math.max(0, (w.__updatePromptCount || 1) - 1);
            window.dispatchEvent(new Event('update_prompt_changed'));
        };
    }, [show]);

    if (!show) return null;

    const displayVersion = targetVersion || latestVersion || APP_VERSION;

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
                                    : `A new version (v${displayVersion}) with the latest improvements is ready.`
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
                            onClick={handleUpdateNow}
                            disabled={updating}
                            style={{
                                flex: 1,
                                background: forced ? '#ef4444' : '#111827',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '10px 16px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: updating ? 'default' : 'pointer',
                                opacity: updating ? 0.75 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                            }}
                            className="hover:opacity-90 active:scale-[0.98] transition-all"
                        >
                            {updating && (
                                <span
                                    className="animate-spin"
                                    style={{
                                        width: '13px',
                                        height: '13px',
                                        border: '2px solid rgba(255,255,255,0.4)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        display: 'inline-block',
                                    }}
                                />
                            )}
                            {updating ? 'Updating…' : 'Update Now'}
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
                        {forced ? `Mandatory platform sync (v${targetVersion})` : `Latest release v${displayVersion} ready to install`}
                    </span>
                </div>
            </div>
        </div>
    );
}
