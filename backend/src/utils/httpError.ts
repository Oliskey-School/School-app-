import { Response } from 'express';

/**
 * Send an error response without leaking internals.
 *
 * Controllers used to end their catch blocks with
 *   `res.status(500).json({ message: error.message })`
 * which returns the raw driver error to the client. A Prisma failure that way
 * carries the model shape, the submitted values and the absolute server path
 * (e.g. `C:\dev\school-app-\backend\src\services\...`). The global handler in
 * app.ts DOES sanitise 5xx in production, but a controller that catches its own
 * error and responds directly never reaches it.
 *
 * Deliberate 4xx messages are preserved: services throw plain Errors carrying
 * text written for the user (e.g. "Class not found in your school/branch"), and
 * those are meant to be read. Only unexpected faults become generic. The full
 * error is always logged server-side, so nothing is lost for debugging.
 */
export function sendError(
    res: Response,
    error: any,
    context?: string,
    fallbackMessage = 'An unexpected error occurred.'
): Response {
    const explicit = Number(error?.status || error?.statusCode);
    const message: string = error?.message || '';

    // Anything raised by the DB driver is never safe to forward.
    const isDriverError =
        !!error?.clientVersion ||
        (typeof error?.name === 'string' && error.name.startsWith('PrismaClient'));

    // Only a deliberately thrown `new Error('...')` carries a message written for
    // the user. A TypeError / ReferenceError / RangeError is an internal fault —
    // e.g. "Cannot read properties of undefined (reading 'map')" — and must never
    // be forwarded.
    const isThrownAppError = error instanceof Error && error.name === 'Error';

    let status = explicit || 500;

    // Prisma P2025 = "record required but not found". Under RLS this is also what
    // a policy denial looks like: the row exists but is invisible to this tenant,
    // so update/delete finds nothing. Either way it is a 404, not a server fault —
    // returning 500 made a correctly-blocked cross-tenant write look like a crash.
    // P2003 (FK constraint) is likewise a client-side reference error.
    if (!explicit && (error?.code === 'P2025' || error?.code === 'P2003')) {
        status = 404;
    }

    // Services throw ownership/not-found errors with no status attached. Without
    // this they surface as an opaque 500 and the caller cannot tell "doesn't
    // exist / not yours" from "the server broke".
    if (!explicit && !isDriverError && isThrownAppError && message) {
        if (/not found|does not exist/i.test(message)) status = 404;
        else if (/unauthorized|not authorized|permission|only admins|forbidden|may only/i.test(message)) status = 403;
        else if (/is required|must be|invalid|already exists/i.test(message)) status = 400;
    }

    // Always log the real thing — the client just never sees it.
    if (status >= 500) {
        console.error(`[Error]${context ? ' ' + context : ''}:`, error);
    }

    if (status >= 400 && status < 500) {
        return res.status(status).json({
            message: (isDriverError || !isThrownAppError) ? fallbackMessage : (message || fallbackMessage)
        });
    }

    return res.status(status).json({ message: fallbackMessage });
}
