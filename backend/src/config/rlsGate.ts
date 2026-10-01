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
export const rlsRoleGate: { verified: boolean; error: string | null } = {
    verified: process.env.NODE_ENV !== 'production',
    error: null,
};
