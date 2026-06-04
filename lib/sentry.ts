/**
 * Frontend error tracking (Sentry).
 *
 * Fully inert unless VITE_SENTRY_DSN is set. We load @sentry/react via a dynamic
 * import so it stays in its own lazy chunk and never bloats the main bundle for
 * deployments that don't use a key. Call initSentry() once at app start.
 *
 * To enable: set VITE_SENTRY_DSN (and optionally VITE_SENTRY_TRACES_SAMPLE_RATE).
 */
let sentryClient: typeof import('@sentry/react') | null = null;

export async function initSentry(): Promise<void> {
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
    if (!dsn) return; // no-op without a key

    try {
        const Sentry = await import('@sentry/react');
        Sentry.init({
            dsn,
            environment: import.meta.env.MODE,
            tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
            sendDefaultPii: false,
            release: (import.meta.env.VITE_APP_VERSION as string) || undefined,
        });
        sentryClient = Sentry;
        console.info('[Sentry] Frontend error tracking enabled');
    } catch (err) {
        console.warn('[Sentry] init skipped:', err);
    }
}

/** Report a handled error if Sentry is active; safe no-op otherwise. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
    if (!sentryClient) return;
    try {
        sentryClient.captureException(error, context ? { extra: context } : undefined);
    } catch {
        /* never let reporting break the app */
    }
}
