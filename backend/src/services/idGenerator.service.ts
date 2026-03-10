import { supabase } from '../config/supabase';

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
     * Format: {SCHOOL_CODE}_{BRANCH_CODE}_{ROLE_CODE}_{0001}
     * Numbers restart from 0001 per branch per role.
     *
     * @param schoolId  UUID of the school
     * @param branchId  UUID of the branch
     * @param role      Role string (e.g. 'student', 'teacher', 'admin')
     * @returns         e.g. "EXCEL_MAIN_STU_0001"
     */
    static async generateSchoolId(
        schoolId: string,
        branchId: string,
        role: string
    ): Promise<string> {
        const roleCode = ROLE_CODES[role.toLowerCase()] || role.substring(0, 3).toUpperCase();

        // 1. Get school code
        const { data: school, error: schoolError } = await supabase
            .from('schools')
            .select('code')
            .eq('id', schoolId)
            .single();

        if (schoolError || !school?.code) {
            throw new Error(`IdGenerator: Cannot find school code for school_id=${schoolId}`);
        }

        // 2. Get branch code
        const { data: branch, error: branchError } = await supabase
            .from('branches')
            .select('code')
            .eq('id', branchId)
            .single();

        if (branchError || !branch?.code) {
            throw new Error(`IdGenerator: Cannot find branch code for branch_id=${branchId}`);
        }

        const schoolCode = school.code.toUpperCase();
        const branchCode = branch.code.toUpperCase();

        // 3. Count existing users of this role in this school+branch to get next number
        const nextNumber = await IdGeneratorService.getNextSequence(
            schoolId,
            branchId,
            role.toLowerCase()
        );

        // 4. Pad to 4 digits and build the ID
        const paddedNumber = String(nextNumber).padStart(4, '0');
        return `${schoolCode}_${branchCode}_${roleCode}_${paddedNumber}`;
    }

    /**
     * Gets the next sequence number for a given school/branch/role combination.
     * Counts existing records + 1.
     */
    private static async getNextSequence(
        schoolId: string,
        branchId: string,
        role: string
    ): Promise<number> {
        let count = 0;

        if (role === 'student') {
            const { count: c } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('branch_id', branchId);
            count = c || 0;
        } else if (role === 'teacher') {
            const { count: c } = await supabase
                .from('teachers')
                .select('id', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('branch_id', branchId);
            count = c || 0;
        } else if (role === 'parent') {
            const { count: c } = await supabase
                .from('parents')
                .select('id', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('branch_id', branchId);
            count = c || 0;
        } else {
            // admin, proprietor, inspector, examofficer, complianceofficer, counselor
            const roleCode = ROLE_CODES[role] || role.toUpperCase();
            const { count: c } = await supabase
                .from('users')
                .select('id', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('branch_id', branchId)
                .eq('role', role);
            count = c || 0;
        }

        return count + 1;
    }

    /**
     * Synchronizes the school_generated_id to the users table after it has been
     * set on the role-specific table (students/teachers/parents).
     * Call this after inserting into the role table.
     */
    static async syncToUsersTable(userId: string, schoolGeneratedId: string): Promise<void> {
        const { error } = await supabase
            .from('users')
            .update({ school_generated_id: schoolGeneratedId })
            .eq('id', userId);

        if (error) {
            // Non-fatal: log but do not throw — the role table already has the ID
            console.warn(`[IdGenerator] Failed to sync school_generated_id to users table for user ${userId}:`, error.message);
        }
    }
}
