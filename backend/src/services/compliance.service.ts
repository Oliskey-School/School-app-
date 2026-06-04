import prisma from '../config/database';

/**
 * Compliance Checks engine. The ComplianceCheck rows are managed via raw SQL (the
 * table isn't in the currently-generated client), while the actual evaluations use
 * typed Prisma counts against existing models (Student, Class, Fee, Backup).
 */
const CHECK_DEFS = [
    { key: 'student_records', name: 'Student Records', description: 'Every student has a valid ID and is assigned to a class.', frequency: 'Daily' },
    { key: 'staff_assignment', name: 'Staff Assignment', description: 'Every class has an assigned teacher.', frequency: 'Daily' },
    { key: 'finance', name: 'Finance Setup', description: 'Fee structures are configured for the school.', frequency: 'Weekly' },
    { key: 'data_protection', name: 'Data Protection (NDPR)', description: 'A recent database backup exists (last 30 days).', frequency: 'Weekly' },
];

export class ComplianceService {
    static async getChecks(schoolId: string) {
        for (const c of CHECK_DEFS) {
            await prisma.$executeRawUnsafe(
                `INSERT INTO "ComplianceCheck"
                   (id, school_id, check_key, check_name, description, check_frequency, last_result, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'Pending', NOW(), NOW())
                 ON CONFLICT (school_id, check_key) DO NOTHING`,
                schoolId, c.key, c.name, c.description, c.frequency
            );
        }
        return prisma.$queryRawUnsafe(
            `SELECT id, check_key, check_name, description, check_frequency, last_result, last_run_at, details
             FROM "ComplianceCheck" WHERE school_id = $1 ORDER BY check_name ASC`,
            schoolId
        );
    }

    static async runChecks(schoolId: string) {
        await this.getChecks(schoolId); // ensure rows exist

        const results: Record<string, { result: string; details: any }> = {};

        // 1. Student records — every student needs an ID and a class.
        const studentsMissingId = await prisma.student.count({
            where: { school_id: schoolId, OR: [{ school_generated_id: null }, { school_generated_id: '' }] },
        });
        const studentsNoClass = await prisma.student.count({
            where: { school_id: schoolId, enrollments: { none: {} } },
        });
        results['student_records'] = {
            result: studentsMissingId + studentsNoClass === 0 ? 'Pass' : 'Fail',
            details: { students_missing_id: studentsMissingId, students_without_class: studentsNoClass },
        };

        // 2. Staff assignment — every class needs a teacher.
        const classesNoTeacher = await prisma.class.count({
            where: { school_id: schoolId, teachers: { none: {} } },
        });
        results['staff_assignment'] = {
            result: classesNoTeacher === 0 ? 'Pass' : 'Fail',
            details: { classes_without_teacher: classesNoTeacher },
        };

        // 3. Finance — fee structures must exist.
        const feeCount = await prisma.fee.count({ where: { school_id: schoolId } });
        results['finance'] = {
            result: feeCount > 0 ? 'Pass' : 'Fail',
            details: { fee_structures: feeCount },
        };

        // 4. Data protection — a backup within the last 30 days.
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentBackup = await prisma.backup.count({
            where: { school_id: schoolId, created_at: { gte: thirtyDaysAgo } },
        });
        results['data_protection'] = {
            result: recentBackup > 0 ? 'Pass' : 'Fail',
            details: { recent_backups: recentBackup },
        };

        for (const [key, r] of Object.entries(results)) {
            await prisma.$executeRawUnsafe(
                `UPDATE "ComplianceCheck"
                   SET last_result = $1, last_run_at = NOW(), details = $2::jsonb, updated_at = NOW()
                 WHERE school_id = $3 AND check_key = $4`,
                r.result, JSON.stringify(r.details), schoolId, key
            );
        }

        return this.getChecks(schoolId);
    }
}
