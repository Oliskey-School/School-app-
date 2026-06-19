import { showNotification } from '../components/shared/notifications';
import { api } from '../lib/api';

/**
 * Service to handle background polling for global updates
 * (Socket.IO-based realtime)
 */
class RealtimeService {
    private interval: NodeJS.Timeout | null = null;
    private userId: string | null = null;
    private schoolId: string | null = null;
    private lastNotificationId: string | number | null = null;
    private isInitialized = false;

    initialize(userId: string, schoolId: string) {
        // Skip re-initialization if already initialized with same schoolId
        if (this.isInitialized && this.schoolId === schoolId) {
            return;
        }

        if (this.interval) this.destroy();

        this.userId = userId;
        this.schoolId = schoolId;
        this.isInitialized = true;

        console.log(`ðŸ”Œ Initializing Global Background Polling for School: ${schoolId}`);

        // Initialize WebSocket for real-time instant updates
        import('../lib/socketService').then(({ socketService }) => {
            socketService.initialize(schoolId);
        });

        // Start polling for notifications every 30 seconds as fallback/extra
        this.interval = setInterval(() => this.pollUpdates(), 30000);
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
        this.userId = null;
        this.schoolId = null;
        this.isInitialized = false;
    }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
