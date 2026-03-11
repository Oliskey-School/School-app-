/**
 * Canonical role code mapping — must match backend ROLE_CODES in idGenerator.service.ts
 * Format: SCHOOL_CODE_BRANCH_CODE_ROLE_CODE_NUMBER  e.g. EXCEL_MAIN_STU_0001
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
    // Display-name variants
    'Super Admin': 'SADM',
    'Exam Officer': 'EXM',
    'Compliance Officer': 'CMP',
};

/**
 * Returns the display ID for a user.
 *
 * Priority order:
 * 1. Use the DB-stored school_generated_id directly if it matches the standard format
 * 2. Reconstruct from schoolCode + branchCode + role + number if parts are available
 * 3. Return a "PENDING" placeholder — never show a raw UUID to the user
 *
 * @param schoolGeneratedId  The value of school_generated_id from the DB
 * @param role               User's role string (e.g. 'student', 'teacher')
 * @param schoolCode         The school's code (e.g. 'EXCEL')
 * @param branchCode         The branch's code (e.g. 'MAIN')
 */
export const formatSchoolId = (
    schoolGeneratedId: string | undefined | null,
    role: string,
    schoolCode: string = 'SCHOOL',
    branchCode: string = 'MAIN'
): string => {
    if (schoolGeneratedId && schoolGeneratedId.trim() !== '') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolGeneratedId);
        if (!isUUID) {
            // Return raw ID avoiding PENDING overrides if the DB returned a valid non-UUID value
            return schoolGeneratedId.toUpperCase().replace(/[-\s]/g, '_');
        }
    }

    // 2. Build from parts if we have school/branch codes
    const roleLower = role.toLowerCase();
    const roleCode = ROLE_CODES[roleLower] || ROLE_CODES[role] || role.substring(0, 3).toUpperCase();

    if (schoolCode && schoolCode !== 'SCHOOL') {
        return `${schoolCode.toUpperCase()}_${branchCode.toUpperCase()}_${roleCode}_PENDING`;
    }

    // 3. Generic placeholder — never expose a UUID
    return `${roleCode}_PENDING`;
};

/**
 * Validates that a string conforms to the standard ID format.
 * SCHOOL_BRANCH_ROLE_NUMBER — e.g. EXCEL_MAIN_STU_0001
 */
export const isValidSchoolId = (id: string): boolean => {
    return /^[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d{4}$/.test(id);
};
