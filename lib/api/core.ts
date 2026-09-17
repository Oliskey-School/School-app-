import { API_BASE_URL } from '../config';
import { getJwtExpiryMs, getJwtSubject } from '../tokenUtils';
import { networkManager } from '../networkManager';
import { offlineDB } from '../dexie-db';

// Real-money endpoints must never be silently queued offline — the user has
// no way to know if a queued charge actually succeeded once replayed later,
// which risks double-charges or payments that quietly never happen. These
// are blocked while offline with a clear "reconnect to pay" error instead.
const OFFLINE_BLOCKED_ENDPOINTS = [
    '/fees/record-payment',
    '/fees/notify-payment',
    '/fees/payments/',
];
function isOfflineBlockedEndpoint(endpoint: string): boolean {
    return OFFLINE_BLOCKED_ENDPOINTS.some((p) => endpoint.startsWith(p));
}

console.log(`ðŸ“¡ [API-TEST] Base URL: ${API_BASE_URL}`);

const getAuthToken = async (): Promise<string | null> => {
    // Tab-scoped session token. No app code path writes tokens to localStorage
    // anymore, so a leftover localStorage.auth_token is stale/foreign and must
    // not be silently adopted here (that previously let a stale token from
    // another source hijack the active tab's session — see AuthContext.tsx).
    const token = sessionStorage.getItem('auth_token');
    if (!token) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
    }
    return token;
};

/**
 * Express API Client
 * Pure Express/Prisma backend client.
 */
type ApiRequestInit = RequestInit & {
    _retryWithoutBranch?: boolean;
    _revalidate?: boolean;
};

/**
 * Shared API infrastructure: the request pipeline (auth header, CSRF, offline
 * queueing, 30s timeout, in-flight dedup, response cache), the token-refresh
 * lock, and the chainable query shim.
 *
 * Split out of lib/api.ts so the eager/critical path (login, session restore,
 * offline sync replay) can import ONLY what it needs. lib/api.ts's 600+
 * domain methods are class methods on a singleton, which a bundler cannot
 * tree-shake per-method, so importing `api` anywhere eager forced all of
 * them onto the first-paint bundle.
 *
 * There must only ever be ONE instance of this: the CSRF token, refresh lock,
 * response cache and in-flight dedup map are shared state, and two copies
 * would double-refresh tokens and serve each other stale reads. lib/api.ts
 * delegates to this same singleton rather than owning any of it.
 */
class ApiCore {
    private baseUrl: string = API_BASE_URL;
    private cache = new Map<string, { data: any; timestamp: number }>();
    private CACHE_TTL = 30000; // 30 seconds
    private csrfToken: string | null = null;
    private inFlightRequests = new Map<string, Promise<any>>();

    private refreshPromise: Promise<any> | null = null;
    private logoutHandler: (() => void) | null = null;

    constructor() {}

    setLogoutHandler(handler: () => void): void {
        this.logoutHandler = handler;
    }

    private triggerLogout(reason: string, endpoint?: string): void {
        console.warn(`[API] Forcing logout due to ${reason}${endpoint ? ` on ${endpoint}` : ''}`);
        if (this.logoutHandler) {
            try {
                this.logoutHandler();
            } catch (err) {
                console.error('[API] Logout handler failed:', err);
            }
        }

        try {
            window.dispatchEvent(new CustomEvent('force-logout', { detail: { reason, endpoint } }));
        } catch (err) {
            console.warn('[API] Failed to dispatch force-logout event:', err);
        }
    }

    // The server drops the CSRF token straight into a readable XSRF-TOKEN cookie
    // on the first response — read it from there (no extra round-trip). The
    // /auth/csrf-token endpoint remains only as a fallback for environments
    // where the cookie can't be read (e.g. blocked third-party cookies).
    private readCsrfCookie(): string | null {
        try {
            const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
            return match ? decodeURIComponent(match[1]) : null;
        } catch { return null; }
    }

    async getCsrfToken(): Promise<string | null> {
        const fromCookie = this.readCsrfCookie();
        if (fromCookie) {
            this.csrfToken = fromCookie;
            return fromCookie;
        }
        if (this.csrfToken) return this.csrfToken;
        try {
            const response = await fetch(`${this.baseUrl}/auth/csrf-token`, { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrfToken;
                return this.csrfToken;
            }
        } catch (e) {
            console.error('Failed to fetch CSRF token', e);
        }
        return null;
    }

    clearCsrfToken(): void {
        this.csrfToken = null;
    }

    invalidateCache(): void {
        this.cache.clear();
        this.inFlightRequests.clear();
        this.clearCsrfToken();
        // Defense in depth on top of the per-user cache key: a shared device
        // shouldn't keep a logged-out user's cached data sitting in IndexedDB
        // at all once they've signed out.
        offlineDB.roster_cache.clear().catch((err) => console.warn('[API] Failed to clear offline cache on logout:', err));
    }

    /**
     * Core Fetch Engine with Request Deduplication
     */

    async fetch<T>(endpoint: string, options: ApiRequestInit = {}): Promise<T> {
        const method = options.method?.toUpperCase() || 'GET';
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        // Namespace every cache/dedup key by WHO is asking, not just the URL. Two
        // different users on the same device (a shared school computer, or a role
        // switch in demo mode) must never have one user's offline-cached response
        // served to the other — the key must not survive a login as someone else.
        const userScope = getJwtSubject(await getAuthToken()) || 'anon';

        // Lead DevSecOps: Deduplicate concurrent identical GET requests
        const isGet = method === 'GET';
        const selectedBranchIdForCache = localStorage.getItem('selected_branch_id') || '';
        const requestKey = `${userScope}:${selectedBranchIdForCache}:${method}:${url}${options._retryWithoutBranch ? ':retry' : ''}`;

        if (isGet && this.inFlightRequests.has(requestKey)) {
            return this.inFlightRequests.get(requestKey) as Promise<T>;
        }

        // Serve recently loaded data synchronously on revisited pages. Stale
        // entries remain useful on slow networks while one background request
        // refreshes them for the next visit.
        if (isGet && !options._revalidate) {
            const cached = this.cache.get(requestKey);
            if (cached) {
                if (Date.now() - cached.timestamp < this.CACHE_TTL) {
                    return cached.data as T;
                }
                void this.fetch<T>(endpoint, { ...options, _revalidate: true }).catch(() => {
                    // Stale data is already being returned to the page. A failed
                    // background refresh must not create an unhandled rejection.
                });
                return cached.data as T;
            }
        }

        // Offline handling. This is the single chokepoint nearly every screen's
        // api.getX()/postX() calls funnel through, so making IT offline-aware
        // gives every page offline reads + queued writes without touching each
        // screen individually.
        if (networkManager.isOffline() && !endpoint.includes('/auth/')) {
            if (isGet) {
                const cached = await offlineDB.roster_cache.get(requestKey);
                if (cached) {
                    this.cache.set(requestKey, { data: cached.data, timestamp: Date.now() });
                    console.log(`ðŸ“¦ [API-OFFLINE] Serving cached response for ${endpoint}`);
                    return cached.data as T;
                }
                throw new Error("You're offline and this hasn't been loaded before.");
            }

            if (isOfflineBlockedEndpoint(endpoint)) {
                throw new Error('Payments require an internet connection. Please reconnect and try again.');
            }

            let parsedBody: any = {};
            if (typeof options.body === 'string') {
                try { parsedBody = JSON.parse(options.body); } catch { parsedBody = {}; }
            } else if (options.body && !(options.body instanceof FormData)) {
                parsedBody = options.body;
            }

            await offlineDB.sync_queue.add({
                action_type: 'HTTP_OP',
                endpoint,
                method,
                payload: parsedBody,
                created_at: new Date().toISOString(),
                synced: 0,
                retry_count: 0,
                user_scope: userScope,
            });
            console.log(`ðŸ“¦ [API-OFFLINE] Queued ${method} ${endpoint} for sync`);

            // Optimistic response so calling screens (which expect a resolved
            // promise, not a special "queued" branch) keep working normally.
            return {
                ...parsedBody,
                id: parsedBody.id || `offline-${crypto.randomUUID()}`,
                _offlineQueued: true,
            } as T;
        }

        const fetchPromise = (async () => {
            try {
                let token = await getAuthToken();

                // Pre-flight refresh: if the access token is already expired (or within a
                // 15s skew), refresh BEFORE sending so the request doesn't go out with a
                // dead token, get a 401, and log a console error before recovering. The
                // reactive 401â†’refresh path below remains as a safety net for tokens that
                // expire mid-flight or get revoked server-side. Single-flight refreshToken()
                // dedupes concurrent callers (e.g. the notifications poller + a page load).
                if (token && !endpoint.includes('/auth/') &&
                    (sessionStorage.getItem('auth_refresh_token') || localStorage.getItem('auth_refresh_token'))) {
                    const expMs = getJwtExpiryMs(token);
                    if (expMs !== null && expMs - Date.now() < 15000) {
                        try {
                            const refreshed = await this.refreshToken();
                            if (refreshed?.token) token = refreshed.token;
                        } catch {
                            // Fall through with the old token; the reactive 401 path handles it.
                        }
                    }
                }

                const selectedBranchId = localStorage.getItem('selected_branch_id');
                const shouldAttachBranchHeader = !!selectedBranchId &&
                    selectedBranchId !== 'all' &&
                    selectedBranchId !== 'null' &&
                    selectedBranchId !== 'undefined' &&
                    !endpoint.startsWith('/auth') &&
                    !endpoint.startsWith('/branches') &&
                    !endpoint.startsWith('/schools') &&
                    !endpoint.startsWith('/health');

                // Lead DevSecOps: Attach CSRF token for mutating requests
                const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
                
                if (isMutation && !this.csrfToken) {
                    await this.getCsrfToken();
                }

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    ...(this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {}),
                    ...((options.headers as any) || {}),
                };

                if (shouldAttachBranchHeader && !headers['X-Branch-Id']) {
                    headers['X-Branch-Id'] = selectedBranchId as string;
                }

                const unauthenticatedAuthEndpoints = [
                    '/auth/login',
                    '/auth/signup',
                    '/auth/forgot-password',
                    '/auth/reset-password',
                    '/auth/google-login',
                    '/auth/demo/login',
                    '/auth/verify-email',
                    '/auth/resend-verification',
                    '/auth/update-email',
                    '/auth/update-username',
                    '/auth/update-password',
                    // Public onboarding + verification â€” anyone signing up a new school
                    // reaches these endpoints before they have a session token.
                    '/schools/onboard',
                    '/onboard',
                    '/verification/verify',
                    '/verification/resend'
                ];
                const isPublicAuthEndpoint = unauthenticatedAuthEndpoints.some((path) => endpoint.startsWith(path));

                if (!token && !endpoint.includes('/health') && !isPublicAuthEndpoint) {
                    console.warn(`ðŸ”’ [API-WARN] Missing token for protected endpoint: ${endpoint}`);
                    this.triggerLogout('missing_token', endpoint);
                    throw new Error(`Missing token for protected endpoint: ${endpoint}`);
                }

                // Auto-remove Content-Type for FormData
                if (options.body instanceof FormData) {
                    delete headers['Content-Type'];
                }

                // Diagnostic: Log full URL trying to be hit
                if (process.env.NODE_ENV !== 'production' || endpoint.includes('/students')) {
                    console.log(`ðŸ”Œ [API-DEBUG] Fetching: ${url} | Method: ${method} | Headers:`, JSON.stringify(headers));
                }

                let response;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                try {
                    response = await fetch(url, { 
                        ...options, 
                        headers, 
                        credentials: 'include',
                        signal: controller.signal 
                    });
                    clearTimeout(timeoutId);
                } catch (fetchErr: any) {
                    clearTimeout(timeoutId);

                    // The connection can drop mid-request even when navigator.onLine
                    // still said true (flaky wifi, captive portal, etc). Degrade the
                    // same way a detected-offline GET does, rather than surfacing a
                    // hard error for data the user has already seen before.
                    if (isGet) {
                        const cached = await offlineDB.roster_cache.get(requestKey);
                        if (cached) {
                            this.cache.set(requestKey, { data: cached.data, timestamp: Date.now() });
                            console.warn(`[API-OFFLINE] Network request failed, serving stale cache for ${endpoint}:`, fetchErr.message);
                            return cached.data as T;
                        }
                    }

                    if (fetchErr.name === 'AbortError') {
                        console.error(`â±ï¸ [API-TIMEOUT] Request to ${url} timed out after 30s`);
                        throw new Error('Connection timed out. Please check your internet or try again.');
                    }
                    console.error(`ðŸ’¥ [API-FATAL] Network error hitting ${url}:`, fetchErr.message);
                    throw fetchErr;
                }

                // Pick up the rotated single-use CSRF token (server burns the old one
                // after each mutation and hands back a fresh one) so the next mutation
                // doesn't reuse a spent token.
                const rotatedCsrf = response.headers.get('X-CSRF-Token');
                if (rotatedCsrf) this.csrfToken = rotatedCsrf;

                if (!response.ok) {
                    const errorText = await response.text();
                    
                    let error = { message: '' };
                    try {
                        if (errorText) {
                            const parsed = JSON.parse(errorText);
                            error.message = parsed.message || parsed.error || '';
                        }
                    } catch (e) {
                        console.warn(`[API] Could not parse error response as JSON from ${endpoint}`);
                    }

                    // Handle JWT Expiration
                    if (response.status === 401 && (error.message === 'jwt expired' || error.message.includes('expired')) && !endpoint.includes('/auth/refresh')) {
                        console.log(`[API] Token expired for ${endpoint}, attempting refresh...`);
                        try {
                            const refreshResult = await this.refreshToken();
                            if (refreshResult && refreshResult.token) {
                                console.log(`[API] Refresh successful, retrying ${endpoint}`);
                                // Retry with new token
                                const newHeaders = {
                                    ...headers,
                                    'Authorization': `Bearer ${refreshResult.token}`
                                };
                                return this.fetch<T>(endpoint, { ...options, headers: newHeaders });
                            }
                        } catch (refreshErr) {
                            console.error('[API] Secondary error during token refresh:', refreshErr);
                        }
                    }

                    const errorMessage = error.message || `Error ${response.status}: ${response.statusText}`;
                    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
                        this.triggerLogout('unauthorized', endpoint);
                    }
                    console.error(`[API] Error Response from ${endpoint}:`, {
                        status: response.status,
                        statusText: response.statusText,
                        body: errorText
                    });

                    // Only drop the active branch when the server says the SELECTED branch
                    // itself is unauthorized/stale ("User not authorized to access this
                    // branch"). A generic permission 403 that merely mentions "branch"
                    // (e.g. "managed by their home branch", "only the main admin can manage
                    // branches") must NOT wipe the user's branch selection â€” doing so used to
                    // bounce a branch admin back to the Main branch after a denied action.
                    const isUnauthorizedBranch = /not authorized to access this branch/i.test(errorMessage);
                    if (response.status === 403 && isUnauthorizedBranch && selectedBranchId && !options._retryWithoutBranch) {
                        console.warn('[API] Clearing stale selected_branch_id due to branch authorization failure and retrying without branch scope.');
                        localStorage.removeItem('selected_branch_id');
                        const retryHeaders = { ...((options.headers as any) || {}) } as Record<string, string>;
                        delete retryHeaders['X-Branch-Id'];
                        return this.fetch<T>(endpoint, {
                            ...options,
                            headers: retryHeaders,
                            _retryWithoutBranch: true
                        });
                    }

                    throw new Error(errorMessage);
                }

                const contentType = response.headers.get('content-type');
                if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
                    return {} as T;
                }

                const parsed = await response.json();

                if (isGet) {
                    this.cache.set(requestKey, { data: parsed, timestamp: Date.now() });
                    // Best-effort persistent cache so this data stays visible offline
                    // and other pages relying on the same endpoint benefit too. Never
                    // let a caching failure break the actual request.
                    offlineDB.roster_cache.put({
                        key: requestKey,
                        data: parsed,
                        updated_at: new Date().toISOString(),
                    }).catch((err) => console.warn('[API] Failed to cache response for offline use:', err));
                } else {
                    // Mutations can affect several list/detail endpoints. Clearing
                    // the short-lived memory cache avoids showing a pre-mutation
                    // response while keeping GET deduplication intact.
                    this.cache.clear();
                }

                return parsed;
            } finally {
                if (isGet) this.inFlightRequests.delete(requestKey);
            }
        })();

        if (isGet) {
            this.inFlightRequests.set(requestKey, fetchPromise);
        }

        return fetchPromise;
    }

    async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, { method: 'GET', ...options });
    }

    async post<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
    }

    async put<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'PUT',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
    }

    async patch<T>(endpoint: string, body: any, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body),
            ...options
        });
    }

    async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
        return this.fetch<T>(endpoint, { method: 'DELETE', ...options });
    }


    async refreshToken(): Promise<any> {
        // Single-flight: if a refresh is already running, every caller awaits the
        // SAME promise. Without this, the many requests that fire when you return
        // to an idle tab each try to refresh at once â€” and because the backend
        // rotates the refresh token (invalidating the previous one) on first use,
        // every refresh after the first fails with "session revoked" and logs you
        // out. De-duplicating means exactly one refresh happens per expiry.
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = (async () => {
            const refreshToken = sessionStorage.getItem('auth_refresh_token') || localStorage.getItem('auth_refresh_token');
            const result = await this.post<any>('/auth/refresh', { refreshToken });
            if (!result || !result.token) {
                throw new Error('Failed to refresh session');
            }
            sessionStorage.setItem('auth_token', result.token);
            if (result.refreshToken) {
                sessionStorage.setItem('auth_refresh_token', result.refreshToken);
            }
            return result;
        })();

        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    from(table: string) {
        const endpoint = `/${table.replace(/_/g, '-')}`;
        const queryParams = new URLSearchParams();
        // The mutation is deferred until the chain is awaited (then()), so filters
        // chained AFTER it â€” query-builder style `.update(data).eq('id', x)` â€” are applied.
        let pendingOp: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
        let pendingPayload: any = undefined;

        const builder = {
            select: (columns: string = '*') => {
                if (columns !== '*') queryParams.append('columns', columns);
                return builder;
            },
            eq: (column: string, value: any) => {
                queryParams.append(column, String(value));
                return builder;
            },
            ilike: (column: string, pattern: string) => {
                queryParams.append(column, `ilike:${pattern}`);
                return builder;
            },
            not: (column: string, op: string, value: any) => {
                queryParams.append(column, `not:${op}:${value}`);
                return builder;
            },
            gte: (column: string, value: any) => {
                queryParams.append(column, `gte:${value}`);
                return builder;
            },
            lte: (column: string, value: any) => {
                queryParams.append(column, `lte:${value}`);
                return builder;
            },
            gt: (column: string, value: any) => {
                queryParams.append(column, `gt:${value}`);
                return builder;
            },
            lt: (column: string, value: any) => {
                queryParams.append(column, `lt:${value}`);
                return builder;
            },
            in: (column: string, values: any[]) => {
                queryParams.append(column, `in:${(values || []).join(',')}`);
                return builder;
            },
            or: (pattern: string) => {
                queryParams.append('or', pattern);
                return builder;
            },
            order: (column: string, { ascending = true } = {}) => {
                queryParams.append('order', `${column}:${ascending ? 'asc' : 'desc'}`);
                return builder;
            },
            limit: (count: number) => {
                queryParams.append('limit', String(count));
                return builder;
            },
            single: () => {
                queryParams.append('single', 'true');
                return builder;
            },
            maybeSingle: () => {
                queryParams.append('single', 'true');
                queryParams.append('maybe', 'true');
                return builder;
            },
            
            // Execution â€” runs on await. Dispatches the right HTTP verb based on the
            // pending operation so a mutation followed by .eq(...) filters works.
            then: async (onfulfilled?: (value: { data: any; error: any }) => any) => {
                let result: { data: any; error: any };
                try {
                    let data: any;
                    if (pendingOp === 'insert') {
                        data = await this.post(endpoint, pendingPayload);
                    } else if (pendingOp === 'upsert') {
                        data = await this.post(`${endpoint}/upsert`, pendingPayload);
                    } else if (pendingOp === 'update') {
                        const id = queryParams.get('id');
                        data = await this.put(id ? `${endpoint}/${id}` : endpoint, pendingPayload);
                    } else if (pendingOp === 'delete') {
                        const id = queryParams.get('id');
                        data = await this.delete(id ? `${endpoint}/${id}` : endpoint);
                    } else {
                        const url = `${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
                        data = await this.get(url);
                    }
                    result = { data, error: null };
                } catch (error: any) {
                    result = { data: null, error };
                }
                return onfulfilled ? onfulfilled(result) : result;
            },

            // Mutations â€” record the op + payload and return the builder so callers can
            // chain filters afterward (e.g. .update({...}).eq('id', x)). The HTTP call
            // fires when the chain is awaited via then() above.
            insert: (data: any) => { pendingOp = 'insert'; pendingPayload = data; return builder; },
            update: (data: any) => { pendingOp = 'update'; pendingPayload = data; return builder; },
            upsert: (data: any) => { pendingOp = 'upsert'; pendingPayload = data; return builder; },
            delete: () => { pendingOp = 'delete'; return builder; },
        };

        return builder as any;
    }
}

export const apiCore = new ApiCore();
export type { ApiRequestInit };
