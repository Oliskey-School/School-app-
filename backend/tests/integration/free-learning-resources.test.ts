/**
 * Every school must get the curated "Free Learning Resources" catalog.
 *
 * The bug: the Learning Hub stores resources PER SCHOOL — getResources filters
 * `school_id = <caller's school> AND is_curated` — but the curated website rows
 * only ever existed for the DEMO school. They were inserted ad hoc; no
 * migration, seeder or onboarding step created them for anyone else. So the
 * screen was full in the demo and completely empty for every real school in
 * production: "No resources match your search", for every student and teacher,
 * since the feature shipped.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { runAsPlatform, runWithTenantContext } from '../../src/lib/tenantContext';
import { LearningHubService } from '../../src/services/learningHub.service';
import { FREE_LEARNING_RESOURCES } from '../../src/services/freeLearningResourcesCatalog';

const S = 'flr-school', B = 'flr-main';

async function cleanup() {
    await runAsPlatform(async () => {
        await prisma.resource.deleteMany({ where: { school_id: S } }).catch(() => {});
        await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
        await prisma.school.delete({ where: { id: S } }).catch(() => {});
    });
}

describe('Free Learning Resources catalog', () => {
    beforeAll(async () => {
        await cleanup();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: S, name: 'FLR School', code: 'FLRS', slug: S, is_active: true } as any });
            await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'FLRM', is_main: true } });
        });
    }, 60000);
    afterAll(cleanup, 60000);

    it('the catalog module is not empty', () => {
        expect(FREE_LEARNING_RESOURCES.length).toBeGreaterThan(0);
        for (const r of FREE_LEARNING_RESOURCES) {
            expect(r.title, 'a catalog entry has no title').toBeTruthy();
            expect(r.url, `${r.title} has no URL`).toBeTruthy();
            expect(r.resource_kind).toBe('website');
        }
    });

    it('a brand-new school starts with an EMPTY catalog (the reported bug)', async () => {
        const before = await runWithTenantContext(
            { schoolId: S, branchId: null, allowedBranchIds: [] },
            () => LearningHubService.getResources(S, undefined, { resource_kind: 'website' }));
        expect(before.length, 'fixture already had resources — the test would prove nothing').toBe(0);
    }, 60000);

    it('seeding gives that school the full catalog, visible through the tenant-scoped read', async () => {
        const { seeded } = await LearningHubService.seedCuratedCatalog(S);
        expect(seeded).toBe(FREE_LEARNING_RESOURCES.length);

        // Read exactly the way the screen does: tenant scope, no platform bypass.
        const after = await runWithTenantContext(
            { schoolId: S, branchId: null, allowedBranchIds: [] },
            () => LearningHubService.getResources(S, undefined, { resource_kind: 'website' }));
        expect(after.length, 'the screen would still be empty for this school').toBe(FREE_LEARNING_RESOURCES.length);

        const titles = after.map((r: any) => r.title).sort();
        expect(titles).toEqual(FREE_LEARNING_RESOURCES.map(r => r.title).sort());
        // Every card needs a working link and a category chip to render.
        for (const r of after as any[]) {
            expect(r.url).toBeTruthy();
            expect(r.category).toBeTruthy();
        }
    }, 60000);

    it('seeding twice does not duplicate the catalog', async () => {
        const second = await LearningHubService.seedCuratedCatalog(S);
        expect(second.seeded).toBe(0);
        const after = await runWithTenantContext(
            { schoolId: S, branchId: null, allowedBranchIds: [] },
            () => LearningHubService.getResources(S, undefined, { resource_kind: 'website' }));
        expect(after.length).toBe(FREE_LEARNING_RESOURCES.length);
    }, 60000);

    it('the catalog stays inside its own school', async () => {
        const otherSchoolRows = await runAsPlatform(() => prisma.resource.count({
            where: { school_id: S, is_curated: true, resource_kind: 'website' },
        }));
        expect(otherSchoolRows).toBe(FREE_LEARNING_RESOURCES.length);
        // A different tenant must not see this school's rows.
        const leaked = await runWithTenantContext(
            { schoolId: 'flr-some-other-school', branchId: null, allowedBranchIds: [] },
            () => LearningHubService.getResources('flr-some-other-school', undefined, { resource_kind: 'website' }));
        expect(leaked.length, 'another school could see this catalog').toBe(0);
    }, 60000);
});
