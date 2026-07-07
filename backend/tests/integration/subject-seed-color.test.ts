import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { SubjectService } from '../../src/services/subject.service';

const S = 'subj-seed-school', B = 'subj-seed-main';

async function cleanup() {
    await prisma.subject.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('School-owned subject list: seeding, colors, deletions stick', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'SS', code: 'SS', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
    }, 120000);

    afterAll(cleanup, 120000);

    it('a school with no subjects gets the standard list seeded once', async () => {
        const first: any[] = await SubjectService.getSubjects(S, B);
        expect(first.length).toBeGreaterThan(20);
        expect(first.map(s => s.name)).toContain('English Language');

        // Second call must NOT duplicate
        const second: any[] = await SubjectService.getSubjects(S, B);
        expect(second.length).toBe(first.length);
    });

    it('deleting a seeded subject stays deleted (no re-seed while list is non-empty)', async () => {
        const target = await prisma.subject.findFirst({ where: { school_id: S, name: 'Music' } });
        expect(target).toBeTruthy();
        await SubjectService.deleteSubject(S, target!.id);

        const after: any[] = await SubjectService.getSubjects(S, B);
        expect(after.map(s => s.name)).not.toContain('Music');
    });

    it('createSubject stores the admin-picked color; updateSubjectColor changes it', async () => {
        const created: any = await SubjectService.createSubject(S, B, 'Robotics', 'bg-rose-100 text-rose-800 border-rose-200');
        expect(created.color).toBe('bg-rose-100 text-rose-800 border-rose-200');

        const listed: any[] = await SubjectService.getSubjects(S, B);
        const robotics = listed.find(s => s.name === 'Robotics');
        expect(robotics?.color).toBe('bg-rose-100 text-rose-800 border-rose-200');

        const updated: any = await SubjectService.updateSubjectColor(S, created.id, 'bg-teal-100 text-teal-800 border-teal-200');
        expect(updated.color).toBe('bg-teal-100 text-teal-800 border-teal-200');
    });
});
