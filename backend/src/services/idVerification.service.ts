import prisma from '../config/database';

/**
 * ID Verification — "auto-queue from students" model. Every student gets a pending
 * verification row; the admin approves/rejects, which stamps the student's
 * verification_status. Uses raw SQL so it works without regenerating the Prisma
 * client (the new table isn't in the currently-generated client on Windows).
 */
export class IdVerificationService {
    static async getRequests(schoolId: string, branchId?: string) {
        // Lazily create a pending verification row for any student missing one.
        if (branchId) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "IdVerificationRequest"
                   (id, school_id, branch_id, student_id, user_id, full_name, document_type, status, created_at, updated_at)
                 SELECT gen_random_uuid(), s.school_id, s.branch_id, s.id, s.user_id, s.full_name, 'Student ID', 'pending', NOW(), NOW()
                 FROM "Student" s
                 WHERE s.school_id = $1 AND s.branch_id = $2
                   AND NOT EXISTS (SELECT 1 FROM "IdVerificationRequest" r WHERE r.school_id = s.school_id AND r.student_id = s.id)`,
                schoolId, branchId
            );
        } else {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "IdVerificationRequest"
                   (id, school_id, branch_id, student_id, user_id, full_name, document_type, status, created_at, updated_at)
                 SELECT gen_random_uuid(), s.school_id, s.branch_id, s.id, s.user_id, s.full_name, 'Student ID', 'pending', NOW(), NOW()
                 FROM "Student" s
                 WHERE s.school_id = $1
                   AND NOT EXISTS (SELECT 1 FROM "IdVerificationRequest" r WHERE r.school_id = s.school_id AND r.student_id = s.id)`,
                schoolId
            );
        }

        const params: any[] = [schoolId];
        let where = `r.school_id = $1`;
        if (branchId) { where += ` AND r.branch_id = $2`; params.push(branchId); }

        return prisma.$queryRawUnsafe(
            `SELECT r.id, r.student_id, r.user_id, r.full_name, r.document_type, r.status,
                    r.notes, r.reviewed_at, r.created_at, s.school_generated_id
             FROM "IdVerificationRequest" r
             LEFT JOIN "Student" s ON s.id = r.student_id
             WHERE ${where}
             ORDER BY (r.status = 'pending') DESC, r.created_at DESC`,
            ...params
        );
    }

    static async review(schoolId: string, id: string, status: string, notes: string | undefined, reviewerId?: string) {
        const normalized = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';

        const rows: any[] = await prisma.$queryRawUnsafe(
            `UPDATE "IdVerificationRequest"
               SET status = $1, notes = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
             WHERE id = $4 AND school_id = $5
             RETURNING student_id`,
            normalized, notes ?? null, reviewerId ?? null, id, schoolId
        );
        if (!rows || rows.length === 0) throw new Error('Verification request not found');

        // Mirror the decision onto the student record.
        const studentStatus = normalized === 'approved' ? 'verified' : normalized === 'rejected' ? 'rejected' : 'pending';
        await prisma.$executeRawUnsafe(
            `UPDATE "Student" SET verification_status = $1 WHERE id = $2 AND school_id = $3`,
            studentStatus, rows[0].student_id, schoolId
        );

        return { success: true, status: normalized };
    }
}
