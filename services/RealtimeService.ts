import { showNotification } from '../components/shared/notifications';
import { api } from '../lib/api';
import { isLowDataMode, LOW_DATA_EVENT } from '../lib/lowDataMode';

/**
 * Service to handle background polling for global updates
 * (Socket.IO-based realtime)
 */
class RealtimeService {
    private interval: NodeJS.Timeout | null = null;
    private userId: string | null = null;
    private schoolId: string | null = null;
    private lastNotificationId: string | number | null = null;
    private branchId: string | null = null;
    private isInitialized = false;
    private lowDataListener: (() => void) | null = null;

    // Low Data Mode: no persistent socket (its keep-alives and per-event
    // traffic are what an expensive connection can't afford) and half the
    // polling frequency; the poll below is the fallback that keeps
    // notifications flowing either way.
    // 20s is the "near-live" fallback cadence on hosts with no socket server
    // (serverless production): an admin's change shows on a teacher's open
    // screen within ~20s instead of ~30s. Low Data Mode keeps the slow cadence.
    private pollIntervalMs() { return isLowDataMode() ? 60000 : 20000; }

    private applyRealtimeTransport() {
        if (!this.schoolId) return;
        const schoolId = this.schoolId;
        import('../lib/socketService').then(({ socketService }) => {
            if (isLowDataMode()) socketService.disconnect();
            else socketService.initialize(schoolId);
        });
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => { this.pollUpdates(); this.refreshScreensIfNoSocket(); }, this.pollIntervalMs());
        if (!this.visibilityListener && typeof document !== 'undefined') {
            // Coming back to the tab is the moment stale data is most visible.
            this.visibilityListener = () => { if (document.visibilityState === 'visible') this.refreshScreensIfNoSocket(true); };
            document.addEventListener('visibilitychange', this.visibilityListener);
        }
    }

    private lastScreenRefresh = 0;
    private visibilityListener: (() => void) | null = null;

    /**
     * Without a live socket (serverless hosting, Low Data Mode, or a socket
     * that is down) nothing would ever tell open screens that data changed.
     * Fire the same global refresh signal a socket event would — every
     * useAutoSync consumer re-fetches — but only while the tab is visible and
     * at most once per poll interval, so background tabs cost nothing.
     */
    private refreshScreensIfNoSocket(onReturn = false) {
        if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
        import('../lib/socketService').then(({ socketService }) => {
            if (socketService.getStatus() === 'connected') return;
            const minGap = onReturn ? 15_000 : this.pollIntervalMs() - 1000;
            if (Date.now() - this.lastScreenRefresh < minGap) return;
            this.lastScreenRefresh = Date.now();
            window.dispatchEvent(new CustomEvent('realtime-update', { detail: { table: '__all__', reason: onReturn ? 'tab-visible' : 'poll' } }));
        });
    }

    initialize(userId: string, schoolId: string, branchId?: string) {
        // useRealtimeSync re-invokes this whenever the active branch changes and
        // has always passed a third argument, but the signature only accepted two
        // — so the branch was dropped and the guard below then treated the call as
        // a no-op re-init. Switching branch left this service bound to the branch
        // the session started on.
        const nextBranch = branchId ?? null;
        if (this.isInitialized && this.schoolId === schoolId && this.branchId === nextBranch) {
            return;
        }

        if (this.interval) this.destroy();

        this.userId = userId;
        this.schoolId = schoolId;
        this.branchId = nextBranch;
        this.isInitialized = true;

        console.log(`ðŸ”Œ Initializing Global Background Polling for School: ${schoolId}`);

        // WebSocket for instant updates + polling fallback (or polling only, in
        // Low Data Mode) — re-applied whenever the mode is toggled.
        this.applyRealtimeTransport();
        if (!this.lowDataListener && typeof window !== 'undefined') {
            this.lowDataListener = () => this.applyRealtimeTransport();
            window.addEventListener(LOW_DATA_EVENT, this.lowDataListener);
        }
        // Non-blocking initial poll: fire and forget after a small delay
        setTimeout(() => this.pollUpdates(), 500);
    }

    private async pollUpdates() {
        if (!this.schoolId) return;

        try {
            // Guard: Check if we have an auth token before polling
            if (typeof window !== 'undefined' && !sessionStorage.getItem('auth_token') && !localStorage.getItem('auth_token')) {
                return;
            }

            // Check for new notifications via centralized API with school context
            // Use Promise.race with timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Notification fetch timeout')), 5000)
            );
            
            const notifications = await Promise.race([
                api.getMyNotifications(this.schoolId),
                timeoutPromise
            ]) as any[];
            
            if (notifications && notifications.length > 0) {
                const latest = notifications[0];
                if (latest.id !== this.lastNotificationId) {
                    this.lastNotificationId = latest.id;
                    showNotification(latest.title || 'New Notification', {
                        body: latest.message || 'You have a new update'
                    });
                }
            }
        } catch (err) {
            // Silent failure for background polling - don't log timeouts
            if ((err as Error)?.message?.includes('timeout')) {
                // Silently ignore timeout
            } else {
                // Log other errors for debugging
            }
        }
    }

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        if (this.visibilityListener && typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', this.visibilityListener);
            this.visibilityListener = null;
        }
        if (this.lowDataListener && typeof window !== 'undefined') {
            window.removeEventListener(LOW_DATA_EVENT, this.lowDataListener);
            this.lowDataListener = null;
        }
        this.userId = null;
        this.schoolId = null;
        this.branchId = null;
        this.isInitialized = false;
    }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
