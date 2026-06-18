import { useEffect, useRef } from 'react';
import { api } from '../api';

/**
 * Idle session keep-alive.
 *
 * When a signed-in user stops interacting (no clicks/keys/scroll) the tab can sit
 * for a long time with no network traffic. Two things then happen that we want to
 * avoid: (1) the short-lived access token silently expires, so the very next action
 * bounces them to the login screen, and (2) idle connections through the reverse
 * proxy / load balancer get reaped.
 *
 * So while the tab is OPEN but the user is IDLE, we quietly refresh the session on a
 * fixed cadence — a lightweight "keep-alive packet". As soon as they're active again
 * their normal requests keep the session warm and we stand down. We never keep-alive
 * a hidden/background tab (no point spending the user's data) or a logged-out app.
 */

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

// How long without interaction before we consider the user "idle".
const IDLE_AFTER_MS = 2 * 60 * 1000; // 2 minutes
// How often to send a keep-alive while idle.
const KEEPALIVE_EVERY_MS = 4 * 60 * 1000; // 4 minutes

export function useIdleKeepAlive(isAuthenticated: boolean): void {
    const lastActivityRef = useRef<number>(Date.now());
    const lastKeepAliveRef = useRef<number>(0);

    useEffect(() => {
        if (!isAuthenticated) return;

        const markActive = () => { lastActivityRef.current = Date.now(); };
        ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActive, { passive: true }));

        const tick = async () => {
            // Only while the tab is actually visible.
            if (typeof document !== 'undefined' && document.hidden) return;
            if (!navigator.onLine) return;

            const now = Date.now();
            const idleFor = now - lastActivityRef.current;
            const sinceLastKeepAlive = now - lastKeepAliveRef.current;

            if (idleFor >= IDLE_AFTER_MS && sinceLastKeepAlive >= KEEPALIVE_EVERY_MS) {
                lastKeepAliveRef.current = now;
                try {
                    await api.refreshToken();
                } catch {
                    // Non-fatal: a failed keep-alive just means the next real request
                    // will handle re-auth as usual.
                }
            }
        };

        const intervalId = setInterval(tick, 60 * 1000); // evaluate once a minute

        return () => {
            clearInterval(intervalId);
            ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActive));
        };
    }, [isAuthenticated]);
}
