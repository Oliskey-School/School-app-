import prisma from '../config/database';
import { Prisma, PrismaClient } from '../../generated/prisma-client';

/**
 * Role code mapping — canonical list used by both backend and frontend.
 * Format: SCHOOL_CODE_BRANCH_CODE_ROLE_CODE_NUMBER
 * e.g. EXCEL_MAIN_STU_0001
 */
export const ROLE_CODES: Record<string, string> = {
    student: 'STU',
    teacher: 'TCH',
    parent: 'PAR',
    admin: 'ADM',
    superadmin: 'SADM',
    proprietor: 'PRO',
    inspector: 'INS',
    examofficer: 'EXM',
    complianceofficer: 'CMP',
    counselor: 'CNS',
};

export class IdGeneratorService {
    /**
     * Generates the next school_generated_id for a user in a given school/branch/role.
     */
    static async generateSchoolId(
        schoolId: string,
        branchId: string,
        role: string,
        tx?: Prisma.TransactionClient
    ): Promise<string> {
        const roleKey = role.toLowerCase();
        const roleCode = ROLE_CODES[roleKey] || role.substring(0, 3).toUpperCase();

        const db = tx || prisma;

        const school = await db.school.findUnique({
            where: { id: schoolId },
            include: { branches: { take: 1 } } // Fetch first branch as fallback
        });

        if (!school) {
            throw new Error(`IdGenerator: Cannot find school for school_id=${schoolId}`);
        }

        let branch = null;
        let effectiveBranchId = branchId;

        if (branchId) {
            branch = await db.branch.findUnique({
                where: { id: branchId },
                select: { code: true }
            });
        }

        // Fallback to first available branch if branchId is missing or invalid
        if (!branch && school.branches.length > 0) {
            branch = school.branches[0];
            effectiveBranchId = branch.id;
        }

        if (!branch) {
            throw new Error(`IdGenerator: Cannot find or default a branch for school_id=${schoolId}`);
        }

        const schoolCode = school.slug.substring(0, 5).toUpperCase();
        const branchCode = (branch as any).code.substring(0, 10).toUpperCase();

        const nextNumber = await IdGeneratorService.getNextSequence(
            schoolId,
            effectiveBranchId as string,
            roleKey,
            tx
        );

        const paddedNumber = String(nextNumber).padStart(4, '0');
        return `${schoolCode}_${branchCode}_${roleCode}_${paddedNumber}`;
    }

    private static async getNextSequence(
        schoolId: string,
        branchId: string,
        role: string,
        tx?: Prisma.TransactionClient
    ): Promise<number> {
        const db = tx || prisma;
        let count = 0;

        switch (role) {
            case 'student':
                count = await db.student.count({
                    where: { school_id: schoolId, branch_id: branchId }
                });
                break;
            case 'teacher':
                count = await db.teacher.count({
                    where: { school_id: schoolId, branch_id: branchId }
                });
                break;
            case 'parent':
                count = await db.parent.count({
                    where: { school_id: schoolId, branch_id: branchId }
                });
                break;
            default:
                count = await db.user.count({
                    where: { school_id: schoolId, branch_id: branchId, role: role.toUpperCase() as any }
                });
        }

        return count + 1;
    }

    /**
     * Synchronizes the school_generated_id to the users table.
     */
    static async syncToUsersTable(userId: string, schoolGeneratedId: string): Promise<void> {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { school_generated_id: schoolGeneratedId }
            });
        } catch (error: any) {
            console.warn(`[IdGenerator] Failed to sync school_generated_id to users table for user ${userId}:`, error.message);
        }
    }
}
