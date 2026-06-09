import prisma from '../config/database';
import { Prisma, PrismaClient } from '@prisma/client';

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
        tx?: any
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

        const schoolCode = school.code.toUpperCase();
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

    /**
     * Generates a unique student admission number.
     * Format: PREFIX/YEAR/SEQUENCE (e.g., CHS/2026/0001)
     */
    static async generateAdmissionNumber(
        schoolId: string,
        tx?: any
    ): Promise<string> {
        const db = tx || prisma;

        // 1. Get school info
        const school = await db.school.findUnique({
            where: { id: schoolId },
            select: { name: true }
        });

        if (!school) {
            throw new Error(`IdGenerator: Cannot find school for school_id=${schoolId}`);
        }

        // 2. Generate Acronym Prefix
        const prefix = school.name
            .split(/\s+/)
            .filter(word => word.length > 0)
            .map(word => word[0].toUpperCase())
            .join('');

        // 3. Get current year
        const currentYear = new Date().getFullYear().toString();

        // 4. Find students for this school in this year to get the next sequence
        const students = await db.student.findMany({
            where: {
                school_id: schoolId,
                admission_number: {
                    startsWith: `${prefix}/${currentYear}/`
                }
            },
            select: { admission_number: true }
        });

        let nextSequence = 1;
        if (students.length > 0) {
            let maxSequence = 0;
            students.forEach(s => {
                if (s.admission_number) {
                    const parts = s.admission_number.split('/');
                    const sequencePart = parts[parts.length - 1];
                    const num = parseInt(sequencePart);
                    if (!isNaN(num) && num > maxSequence) {
                        maxSequence = num;
                    }
                }
            });
            nextSequence = maxSequence + 1;
        }

        // 5. Format: PREFIX/YEAR/SEQUENCE
        const paddedSequence = String(nextSequence).padStart(4, '0');
        return `${prefix}/${currentYear}/${paddedSequence}`;
    }

    private static async getNextSequence(
        schoolId: string,
        branchId: string,
        role: string,
        tx?: any
    ): Promise<number> {
        const db = tx || prisma;
        const roleKey = role.toLowerCase();
        const roleCode = ROLE_CODES[roleKey] || role.substring(0, 3).toUpperCase();

        // Instead of count(), we search for the highest existing number in the IDs
        // This avoids collisions when records are deleted.
        const users = await db.user.findMany({
            where: {
                school_id: schoolId,
                branch_id: branchId,
                school_generated_id: {
                    contains: `_${roleCode}_`
                }
            },
            select: { school_generated_id: true }
        });

        if (users.length === 0) return 1;

        let maxNum = 0;
        users.forEach(u => {
            if (u.school_generated_id) {
                const parts = u.school_generated_id.split('_');
                const lastPart = parts[parts.length - 1];
                const num = parseInt(lastPart);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });

        return maxNum + 1;
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
