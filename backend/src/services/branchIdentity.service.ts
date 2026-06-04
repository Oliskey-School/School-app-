import prisma from '../config/database';
import { ROLE_CODES } from './idGenerator.service';

/**
 * Resolves the Global ID a user carries IN a specific branch.
 *
 * - In the user's HOME branch, this is just their stored school_generated_id.
 * - In any other branch they're authorised for, they get a STABLE per-branch ID:
 *   {SCHOOL}_{BRANCH}_{ROLE}_{NUMBER}. The number reuses their home number when
 *   it is still free in the target branch, otherwise the next available number
 *   for that branch+role. Once allocated it is reserved (BranchUserIdentity) so
 *   it never changes on subsequent visits.
 *
 * Uses raw SQL so it works without regenerating the Prisma client.
 */
export class BranchIdentityService {
    private static pad(n: number): string {
        return String(n).padStart(4, '0');
    }

    private static parseHomeId(homeId: string): { school: string; role: string; number: number } | null {
        const parts = (homeId || '').split('_');
        if (parts.length < 4) return null;
        const number = parseInt(parts[parts.length - 1], 10);
        return {
            school: parts[0],
            role: parts[parts.length - 2],
            number: Number.isFinite(number) ? number : 0,
        };
    }

    /**
     * The canonical role code (STU/TCH/PAR/ADM/...) for a user, taken from their
     * ACTUAL role — never from the (possibly stale/wrong) text in their stored ID.
     * This is why a parent could previously surface a "TCH" id: the old code read
     * the role letters out of the id string instead of the user's real role.
     */
    private static roleCodeFor(user: any, fallback: string): string {
        const key = String(user?.role || '').toLowerCase().replace(/_/g, '');
        return ROLE_CODES[key] || (fallback || 'USR');
    }

    static async resolveForUser(user: any, branchId?: string | null): Promise<string> {
        const homeId: string = user?.school_generated_id || '';

        // No active branch, or sitting in the home branch → the home ID stands.
        if (!branchId || branchId === 'all' || branchId === user?.branch_id) {
            return homeId;
        }

        const parsed = this.parseHomeId(homeId);
        if (!parsed) return homeId; // Can't safely derive — leave the home ID.

        // 1. Already allocated for this (user, branch)? Reuse it.
        const existing = await prisma.$queryRawUnsafe<any[]>(
            `SELECT school_generated_id FROM "BranchUserIdentity" WHERE user_id = $1 AND branch_id = $2 LIMIT 1`,
            user.id, branchId
        );
        if (existing[0]?.school_generated_id) return existing[0].school_generated_id;

        // 2. Branch code for the target branch.
        const branchRows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT code FROM "Branch" WHERE id = $1 LIMIT 1`, branchId
        );
        const branchCode = (branchRows[0]?.code || '').toString().toUpperCase();
        if (!branchCode) return homeId; // Unknown branch — don't fabricate an ID.

        // Role letters come from the user's REAL role, not the stored id string.
        const roleCode = this.roleCodeFor(user, parsed.role);
        const prefix = `${parsed.school}_${branchCode}_${roleCode}_`;

        // 3. Is the user's home NUMBER free in this branch+role?
        const candidate = `${prefix}${this.pad(parsed.number)}`;
        const takenRows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT 1
               FROM "BranchUserIdentity"
              WHERE school_generated_id = $1 AND user_id <> $2
              UNION ALL
             SELECT 1 FROM "User" WHERE school_generated_id = $1 AND id <> $2
              LIMIT 1`,
            candidate, user.id
        ).catch(() => [] as any[]);

        let number = parsed.number;
        if (takenRows.length > 0) {
            // 4. Taken → next available number for this branch+role. Consider both the
            //    reserved per-branch IDs and any home IDs already shaped for this branch.
            const maxRows = await prisma.$queryRawUnsafe<any[]>(
                `SELECT MAX(n) AS max FROM (
                    SELECT number AS n FROM "BranchUserIdentity"
                     WHERE school_id = $1 AND branch_id = $2 AND role = $3
                    UNION ALL
                    SELECT CAST(NULLIF(regexp_replace(split_part(school_generated_id, '_', 4), '\\D', '', 'g'), '') AS INTEGER) AS n
                      FROM "User"
                     WHERE school_generated_id LIKE $4
                 ) t`,
                user.school_id, branchId, roleCode, `${prefix}%`
            ).catch(() => [{ max: parsed.number }]);
            const max = Number(maxRows[0]?.max) || parsed.number;
            number = max + 1;
        }

        const finalId = `${prefix}${this.pad(number)}`;

        // 5. Reserve it (idempotent on the (user, branch) unique key).
        await prisma.$executeRawUnsafe(
            `INSERT INTO "BranchUserIdentity" (id, school_id, branch_id, user_id, role, number, school_generated_id, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, now(), now())
             ON CONFLICT (user_id, branch_id) DO NOTHING`,
            user.school_id, branchId, user.id, roleCode, number, finalId
        ).catch(() => { /* race: another request reserved it — re-read below */ });

        // Re-read to return whatever ended up persisted (handles races).
        const final = await prisma.$queryRawUnsafe<any[]>(
            `SELECT school_generated_id FROM "BranchUserIdentity" WHERE user_id = $1 AND branch_id = $2 LIMIT 1`,
            user.id, branchId
        );
        return final[0]?.school_generated_id || finalId;
    }
}
