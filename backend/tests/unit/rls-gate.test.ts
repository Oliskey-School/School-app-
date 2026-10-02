/**
 * Regression: the database role check took the entire production API down.
 *
 * The boot check in config/database.ts called process.exit(1) when the role
 * could bypass RLS. On a long-running server that reads as "refuse to start".
 * On a serverless platform the process IS the request handler, so it instead
 * failed every invocation — /api/health, /api/auth/demo/login, everything,
 * answering 500 FUNCTION_INVOCATION_FAILED — while the condition it had
 * correctly detected was a connection string pointing at a BYPASSRLS role.
 *
 * These lock in the decision made afterwards: report the fault loudly, and let
 * the deployment choose whether it is fatal.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rlsRoleGate, rlsGateAllowsTraffic, rlsEnforcementMode } from '../../src/config/rlsGate';

const ORIGINAL = process.env.RLS_ROLE_ENFORCEMENT;

describe('RLS role gate', () => {
    beforeEach(() => {
        delete process.env.RLS_ROLE_ENFORCEMENT;
        rlsRoleGate.status = 'checking';
        rlsRoleGate.verified = false;
        rlsRoleGate.error = null;
    });

    afterEach(() => {
        if (ORIGINAL === undefined) delete process.env.RLS_ROLE_ENFORCEMENT;
        else process.env.RLS_ROLE_ENFORCEMENT = ORIGINAL;
    });

    it('holds traffic while the check has not finished', () => {
        expect(rlsGateAllowsTraffic()).toBe(false);
    });

    it('serves once the role is proven unable to bypass RLS', () => {
        rlsRoleGate.status = 'verified';
        rlsRoleGate.verified = true;
        expect(rlsGateAllowsTraffic()).toBe(true);
    });

    // The outage case. A misconfigured DATABASE_URL must not read as "take the
    // whole API offline" by default.
    it('still serves when the role CAN bypass RLS, rather than downing the API', () => {
        rlsRoleGate.status = 'insecure';
        rlsRoleGate.error = 'connected as "postgres", which bypasses row level security';
        expect(rlsEnforcementMode()).toBe('warn');
        expect(rlsGateAllowsTraffic()).toBe(true);
    });

    it('still serves when the check could not run at all', () => {
        rlsRoleGate.status = 'unknown';
        rlsRoleGate.error = 'Can\'t reach database server';
        expect(rlsGateAllowsTraffic()).toBe(true);
    });

    // ...but a deployment that would rather be offline than unprotected can say so.
    it('refuses traffic on a bypassing role when RLS_ROLE_ENFORCEMENT=block', () => {
        process.env.RLS_ROLE_ENFORCEMENT = 'block';
        rlsRoleGate.status = 'insecure';
        expect(rlsEnforcementMode()).toBe('block');
        expect(rlsGateAllowsTraffic()).toBe(false);
    });

    it('block mode never withholds traffic from a verified role', () => {
        process.env.RLS_ROLE_ENFORCEMENT = 'block';
        rlsRoleGate.status = 'verified';
        rlsRoleGate.verified = true;
        expect(rlsGateAllowsTraffic()).toBe(true);
    });

    it('treats any unrecognised value as warn, never as block', () => {
        for (const v of ['', 'yes', 'true', 'BLOCKED', 'off']) {
            process.env.RLS_ROLE_ENFORCEMENT = v;
            expect(rlsEnforcementMode(), `value: ${JSON.stringify(v)}`).toBe('warn');
        }
    });
});

describe('the boot check itself', () => {
    it('contains no process.exit — that is what failed every serverless request', async () => {
        const fs = await import('node:fs');
        const src = fs.readFileSync(
            new URL('../../src/config/database.ts', import.meta.url), 'utf8',
        );
        // Strip comments first: the block comment explaining this very rule says
        // "NEVER process.exit() here", which is documentation, not a call.
        const code = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '');
        expect(code).not.toMatch(/process\s*\.\s*exit\s*\(/);
    });
});
