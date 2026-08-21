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
 * Deliberate 4xx messages are preserved: services throw errors carrying
 * `status`/`statusCode` (e.g. 403 "You are not assigned to this student's
 * class"), and those are meant for the user. Only unexpected 5xx are replaced
 * with a generic message. The full error is always logged server-side.
 */
export function sendError(
    res: Response,
    error: any,
    context?: string,
    fallbackMessage = 'An unexpected error occurred.'
): Response {
    const explicit = Number(error?.status || error?.statusCode);
    const message: string = error?.message || '';

    // Anything raised by the DB driver is never safe to forward: its message can
    // carry the model shape, the submitted values and absolute server paths.
    const isDriverError =
        !!error?.clientVersion ||
        typeof error?.name === 'string' && error.name.startsWith('PrismaClient');

    // Only a deliberately thrown `new Error('...')` carries a message written for
    // the user. A TypeError / ReferenceError / RangeError is an internal fault —
    // e.g. "Cannot read properties of undefined (reading 'map')" — and must never
    // be forwarded. (An earlier version of the matching below classified exactly
    // that TypeError as a 400 and echoed it back; caught by a live probe.)
    const isThrownAppError = error instanceof Error && error.name === 'Error';

    let status = explicit || 500;

    // Services throw plain Errors with messages written for the user, e.g.
    // "Class not found in your school/branch" from an ownership check. Those
    // carry no status, so without this they would surface as an opaque 500 and
    // the caller could not tell "doesn't exist / not yours" from "server broke".
    if (!explicit && !isDriverError && isThrownAppError && message) {
        if (/not found|does not exist/i.test(message)) status = 404;
        else if (/unauthorized|not authorized|permission|only admins|forbidden|may only/i.test(message)) status = 403;
        else if (/is required|must be|invalid|already exists/i.test(message)) status = 400;
    }

    // Always log the real thing — the client just never sees it.
    if (status >= 500) {
        console.error(`[Error]${context ? ' ' + context : ''}:`, error);
    }

    // A 4xx carries a message the caller is supposed to read — but only ever our
    // own, never the driver's.
    if (status >= 400 && status < 500) {
        return res.status(status).json({
            message: (isDriverError || !isThrownAppError) ? fallbackMessage : (message || fallbackMessage)
        });
    }

    return res.status(status).json({ message: fallbackMessage });
}
