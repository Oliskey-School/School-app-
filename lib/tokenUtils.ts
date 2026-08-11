/**
 * Pure JWT helpers — no side effects, no module mocks — so they're unit-testable
 * independently of the (globally mocked) api client.
 */

/**
 * Returns the expiry time (ms epoch) of a JWT access token, or null when the token
 * is missing / not a decodable JWT (e.g. the static demo token). Used to refresh
 * proactively before a request goes out with an already-expired token.
 */
export const getJwtExpiryMs = (token: string | null): number | null => {
    if (!token || token.split('.').length !== 3) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
};

/**
 * Stable per-user identifier from a JWT (survives token refresh, changes on
 * login/logout as a different user). Used to namespace the offline data cache
 * so a shared device never serves one user's cached data to another user who
 * logs in afterward and goes offline before their own data has loaded.
 */
export const getJwtSubject = (token: string | null): string | null => {
    if (!token || token.split('.').length !== 3) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.sub || payload.user_id || payload.id || null;
    } catch {
        return null;
    }
};
