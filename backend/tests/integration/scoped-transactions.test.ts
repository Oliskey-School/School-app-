/**
 * P0 #7 — `prisma.$transaction(...)` on the tenant-scoped client must be a
 * REAL transaction: one connection, scope applied, atomic, and safe under
 * concurrency.
 *
 * ROOT CAUSE covered: the query extension used to open its own nested
 * transaction for every statement, so statements issued through `tx` ran on
 * OTHER connections — nothing was atomic, and each outer transaction held a
 * pooled connection idle while its statements queued for more. Under a
 * burst of admin edits the pool drained and Prisma failed with P2028
 * "Unable to start a transaction in the given time" (20s).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { runAsPlatform, runWithTenantContext } from '../../src/lib/tenantContext';

const S = '7d5f1c1e-7777-4777-8777-777777777777';
const OTHER = '7d5f1c1e-7777-4777-8777-777777777778';

async function cleanup() {
    await runAsPlatform(async () => {
        await prisma.user.deleteMany({ where: { school_id: { in: [S, OTHER] } } });
        await prisma.school.deleteMany({ where: { id: { in: [S, OTHER] } } });
    });
}

describe('scoped transactions', () => {
    beforeAll(async () => {
        await cleanup();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: S, name: 'TX', code: 'TXS', slug: 'tx-school', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.school.create({ data: { id: OTHER, name: 'TX2', code: 'TXO', slug: 'tx-other', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.user.create({ data: { email: 'other@tx.com', password_hash: 'x', full_name: 'Other', role: 'ADMIN' as any, school_id: OTHER } as any });
        });
    }, 60000);
    afterAll(cleanup, 60000);

    it('every statement inside an interactive transaction runs on the same connection with the scope applied', async () => {
        await runWithTenantContext({ schoolId: S }, () => prisma.$transaction(async (tx) => {
            const [a]: any[] = await tx.$queryRawUnsafe(`SELECT pg_backend_pid() AS pid, current_setting('app.current_school_id', true) AS school`);
            const [b]: any[] = await tx.$queryRawUnsafe(`SELECT pg_backend_pid() AS pid`);
            expect(a.pid).toBe(b.pid);
            expect(a.school).toBe(S);
            // RLS holds inside the transaction: the other school's user is invisible.
            expect(await tx.user.count({ where: { school_id: OTHER } })).toBe(0);
        }));
    });

    it('a failing transaction rolls back everything it wrote', async () => {
        await expect(runWithTenantContext({ schoolId: S }, () => prisma.$transaction(async (tx) => {
            await tx.user.create({ data: { email: 'rollback-1@tx.com', password_hash: 'x', full_name: 'R1', role: 'ADMIN' as any, school_id: S } as any });
            await tx.user.create({ data: { email: 'rollback-2@tx.com', password_hash: 'x', full_name: 'R2', role: 'ADMIN' as any, school_id: S } as any });
            throw new Error('boom');
        }))).rejects.toThrow('boom');
        const left = await runWithTenantContext({ schoolId: S }, () => prisma.user.count({ where: { email: { startsWith: 'rollback-' } } }));
        expect(left).toBe(0);
    });

    it('the batch form applies the scope too', async () => {
        const [rows] = await runWithTenantContext({ schoolId: S }, () => prisma.$transaction([
            prisma.$queryRawUnsafe(`SELECT current_setting('app.current_school_id', true) AS school`),
        ]));
        expect((rows as any[])[0].school).toBe(S);
    });

    it('a burst of concurrent multi-statement transactions completes without P2028', async () => {
        const started = Date.now();
        await Promise.all(Array.from({ length: 30 }, (_, i) => runWithTenantContext({ schoolId: S }, () => prisma.$transaction(async (tx) => {
            const u = await tx.user.create({ data: { email: `burst-${i}@tx.com`, password_hash: 'x', full_name: `B${i}`, role: 'TEACHER' as any, school_id: S } as any });
            await tx.user.update({ where: { id: u.id }, data: { full_name: `B${i}!` } });
            await tx.user.count({ where: { school_id: S } });
        }))));
        expect(Date.now() - started).toBeLessThan(15000);
        const n = await runWithTenantContext({ schoolId: S }, () => prisma.user.count({ where: { email: { startsWith: 'burst-' } } }));
        expect(n).toBe(30);
    }, 30000);
});
