import cron from 'node-cron';
import { NotificationDeliveryService } from './notificationDelivery.service';

/**
 * Sends each user's daily digest at the time they chose on the Notification
 * Digest screen.
 *
 * "Digest" was previously a label with nothing behind it: choosing it changed
 * no behaviour, and digest_time was not even persisted. Items marked for digest
 * are now held (tagged `digest:<category>` on the in-app row) and summarised in
 * one email here.
 *
 * Runs once a minute and matches users whose digest_time equals the current
 * HH:MM in Africa/Lagos — the timezone the rest of the scheduling in this app
 * uses. A minute tick is cheap: it is one indexed query on NotificationSetting
 * and does nothing for the ~1439 minutes a given user does not match.
 */
export class NotificationDigestCron {
    private static started = false;
    private static task: ReturnType<typeof cron.schedule> | null = null;

    static init() {
        if (this.started) return;

        // Follows the same guard as the other cron services: never run against a
        // developer's local database, where it would email real addresses held
        // in test data.
        if (process.env.NODE_ENV !== 'production') {
            console.log('🛡️ [NotificationDigest] disabled: not in production mode.');
            return;
        }

        this.task = cron.schedule('* * * * *', async () => {
            const hhmm = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false,
            }).format(new Date());
            try {
                const { users, sent } = await NotificationDeliveryService.runDigestForTime(hhmm);
                if (users > 0) console.log(`📬 [NotificationDigest] ${hhmm}: ${sent}/${users} digest email(s) sent.`);
            } catch (e: any) {
                console.warn('[NotificationDigest] tick failed:', e?.message);
            }
        });

        this.started = true;
        console.log('🕒 [NotificationDigest] scheduled — checks every minute for users due a digest.');
    }

    static stop() {
        this.task?.stop();
        this.task = null;
        this.started = false;
    }
}
