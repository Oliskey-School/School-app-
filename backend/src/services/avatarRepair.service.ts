import prisma from '../config/database';
import { materializeDataUrlImage } from '../middleware/materializeImages.middleware';

/**
 * Repairs avatars that were stored as inline base64 text (see
 * materializeImages.middleware for how they got there): each one is uploaded
 * to storage once and the row is pointed at the resulting URL. Idempotent —
 * rows that already hold a URL are untouched.
 */
export class AvatarRepairService {
    /** Fix the avatar of ONE account (user row + its role row). Returns the URL or null when nothing changed. */
    static async repairUser(userId: string, schoolId: string): Promise<string | null> {
        const user = await prisma.user.findFirst({ where: { id: userId, school_id: schoolId }, select: { avatar_url: true } });
        const current = user?.avatar_url || '';
        if (!current.startsWith('data:image/')) return null;
        const url = await materializeDataUrlImage(current, { schoolId, owner: userId });
        await prisma.user.update({ where: { id: userId }, data: { avatar_url: url } });
        for (const model of ['teacher', 'student', 'parent'] as const) {
            await (prisma as any)[model].updateMany({ where: { user_id: userId, school_id: schoolId }, data: { avatar_url: url } }).catch(() => {});
        }
        return url;
    }

    /** Fix every inline avatar in a school. Returns counts for the caller's report. */
    static async repairSchool(schoolId: string): Promise<{ users: number; teachers: number; students: number; parents: number; failed: number }> {
        const out = { users: 0, teachers: 0, students: 0, parents: 0, failed: 0 };
        const users = await prisma.user.findMany({ where: { school_id: schoolId, avatar_url: { startsWith: 'data:image/' } }, select: { id: true } });
        for (const u of users) {
            try { if (await this.repairUser(u.id, schoolId)) out.users++; } catch { out.failed++; }
        }
        for (const model of ['teacher', 'student', 'parent'] as const) {
            const rows: Array<{ id: string; user_id: string | null; avatar_url: string | null }> = await (prisma as any)[model].findMany({
                where: { school_id: schoolId, avatar_url: { startsWith: 'data:image/' } }, select: { id: true, user_id: true, avatar_url: true },
            });
            for (const r of rows) {
                try {
                    const url = await materializeDataUrlImage(r.avatar_url as string, { schoolId, owner: r.user_id || r.id });
                    await (prisma as any)[model].update({ where: { id: r.id }, data: { avatar_url: url } });
                    if (r.user_id) await prisma.user.updateMany({ where: { id: r.user_id, avatar_url: { startsWith: 'data:image/' } }, data: { avatar_url: url } });
                    (out as any)[`${model}s`]++;
                } catch { out.failed++; }
            }
        }
        return out;
    }
}
