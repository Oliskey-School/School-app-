/**
 * Sentry initialisation for the backend.
 *
 * Imported as the VERY FIRST module in server.ts so Sentry can auto-instrument
 * http/express before they load. It is completely inert unless SENTRY_DSN is set,
 * so local/dev and any deployment without a key behave exactly as before — no
 * network calls, no overhead, nothing to break.
 *
 * To enable: set SENTRY_DSN (and optionally SENTRY_TRACES_SAMPLE_RATE) in the
 * backend environment.
 */
import './env'; // ensures .env is loaded before we read SENTRY_DSN
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;
export const sentryEnabled = !!dsn;

if (sentryEnabled) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
        sendDefaultPii: false, // never ship user PII by default
        release: process.env.APP_VERSION,
    });
    console.log('🛰️  [Sentry] Backend error tracking enabled');
}

export { Sentry };
