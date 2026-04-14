import { showNotification } from '../components/shared/notifications';
import { api } from '../lib/api';

/**
 * Service to handle background polling for global updates
 * (Previously Supabase Realtime)
 */
class RealtimeService {
    private interval: NodeJS.Timeout | null = null;
    private userId: string | null = null;
    private schoolId: string | null = null;
    private lastNotificationId: string | number | null = null;

    initialize(userId: string, schoolId: string) {
        if (this.interval) this.destroy();

        this.userId = userId;
        this.schoolId = schoolId;

        console.log(`🔌 Initializing Global Background Polling for School: ${schoolId}`);

        // Initialize WebSocket for real-time instant updates
        import('../lib/socketService').then(({ socketService }) => {
            socketService.initialize(schoolId);
        });

        // Start polling for notifications every 30 seconds as fallback/extra
        this.interval = setInterval(() => this.pollUpdates(), 30000);
        this.pollUpdates(); // Initial poll
    }

    private async pollUpdates() {
        if (!this.schoolId) return;

        try {
            // Guard: Check if we have an auth token before polling
            if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
                return;
            }

            // Check for new notifications via centralized API with school context
            const notifications = await api.getMyNotifications(this.schoolId);
            
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
            // Silent failure for background polling
        }
    }

    destroy() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.userId = null;
        this.schoolId = null;
    }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
