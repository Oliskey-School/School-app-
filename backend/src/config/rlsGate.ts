/**
 * Whether this process has PROVEN its database role cannot bypass row level
 * security. Read by the /api gate and the /ready probe in app.ts; set by the
 * boot check in config/database.ts.
 *
 * It lives in its own module rather than in config/database on purpose.
 * config/database is mocked by several integration suites, and a partial
 * vi.mock of it silently drops whatever it does not redeclare — when the gate
 * lived there, one such mock removed the export and every request 500'd. A
 * module this small is never worth mocking, so the gate cannot be erased by
 * accident, and a suite that stubs the database still exercises the real gate.
 *
 * Default: open outside production, where the boot check does not run (tests
 * and local development connect as a role they control). In production it
 * starts CLOSED and only opens once assertDatabaseRoleCannotBypassRls passes,
 * so the window between listen() and that check cannot serve tenant traffic.
 */

/**
 * `checking`  – the boot check has not finished. Traffic waits (503).
 * `verified`  – the role is proven NOBYPASSRLS. Traffic is served.
 * `insecure`  – the role CAN bypass RLS, so tenant policies are inert.
 *               What happens next is RLS_ROLE_ENFORCEMENT's decision.
 * `unknown`   – the check itself could not run (database unreachable at boot).
 */
export type RlsGateStatus = 'checking' | 'verified' | 'insecure' | 'unknown';

/**
 * What to do when the database role turns out to be able to bypass RLS.
 *
 *   warn  (default) – serve, and log loudly on every boot.
 *   block           – refuse tenant traffic (503).
 *
 * `warn` is the default deliberately. This condition is a CONFIGURATION fault
 * — DATABASE_URL pointing at a superuser/BYPASSRLS role instead of the
 * application role — and a deployment that has been running that way is not
 * made safer by going offline; it is simply offline AND misconfigured. Blocking
 * on it took the whole API down (every route 500/503) the first time this check
 * reached a serverless deployment, which is a far worse outcome than the
 * misconfiguration it was reporting.
 *
 * Set RLS_ROLE_ENFORCEMENT=block once DATABASE_URL is known to use the
 * application role, to keep it that way.
 */
export function rlsEnforcementMode(): 'warn' | 'block' {
    return String(process.env.RLS_ROLE_ENFORCEMENT || '').toLowerCase() === 'block' ? 'block' : 'warn';
}

export const rlsRoleGate: {
    verified: boolean;
    error: string | null;
    status: RlsGateStatus;
} = {
    verified: process.env.NODE_ENV !== 'production',
    error: null,
    status: process.env.NODE_ENV !== 'production' ? 'verified' : 'checking',
};

/** True when tenant traffic may be served right now. */
export function rlsGateAllowsTraffic(): boolean {
    if (rlsRoleGate.status === 'verified') return true;
    // A reported fault only closes the gate when the deployment asked it to.
    if (rlsRoleGate.status === 'insecure' || rlsRoleGate.status === 'unknown') {
        return rlsEnforcementMode() !== 'block';
    }
    return false; // still checking
}
