import cron from 'node-cron';
import { ParentWatchdogService } from './parentWatchdog.service';

/**
 * Runs the parent watchdog once a day.
 *
 * 07:00 Africa/Lagos — the same timezone the rest of the scheduling in this app
 * uses, and early enough that "homework due tomorrow" and "a fee falls due this
 * week" still leave the family time to act.
 *
 * Each alert is delivered through the user's notification preferences, so this
 * cannot become a source of noise for someone who turned a category off.
 */
export class ParentWatchdogCron {
    private static started = false;
    private static task: ReturnType<typeof cron.schedule> | null = null;

    static init() {
        if (this.started) return;

        // Same guard as the other cron services: never run against a developer's
        // local database, where it would notify real people held in test data.
        if (process.env.NODE_ENV !== 'production') {
            console.log('🛡️ [ParentWatchdog] disabled: not in production mode.');
            return;
        }

        this.task = cron.schedule('0 7 * * *', async () => {
            try {
                const { parents, alerts, sent } = await ParentWatchdogService.run();
                console.log(`👀 [ParentWatchdog] ${parents} parent(s) checked, ${alerts} alert(s) found, ${sent} delivered.`);
            } catch (e: any) {
                console.warn('[ParentWatchdog] run failed:', e?.message);
            }
        }, { timezone: 'Africa/Lagos' });

        this.started = true;
        console.log('🕒 [ParentWatchdog] scheduled — daily at 07:00 Africa/Lagos.');
    }

    static stop() {
        this.task?.stop();
        this.task = null;
        this.started = false;
    }
}
