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
    examofficer: 'EXA',
    complianceofficer: 'COM',
    counselor: 'CNS',
    // Display-name variants
    'Student': 'STU',
    'Teacher': 'TCH',
    'Parent': 'PAR',
    'Admin': 'ADM',
    'Super Admin': 'SADM',
    'Exam Officer': 'EXA',
    'Compliance Officer': 'COM',
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
    // 1. If it's already a valid formatted ID (contains underscores), return as is
    if (schoolGeneratedId && schoolGeneratedId.includes('_')) {
        return schoolGeneratedId.toUpperCase();
    }

    // 2. If it's a non-UUID string, format it
    if (schoolGeneratedId && schoolGeneratedId.trim() !== '') {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolGeneratedId);
        if (!isUUID) {
            return schoolGeneratedId.toUpperCase().replace(/[-\s]/g, '_');
        }
    }

    // 3. Build from parts if we have school/branch codes
    const roleLower = (role || '').toLowerCase();
    const roleCode = ROLE_CODES[roleLower] || ROLE_CODES[role] || (role ? role.substring(0, 3).toUpperCase() : 'USR');

    // Special case for Oliskey Demo
    const effectiveSchoolCode = schoolCode === 'SCHOOL' && (schoolGeneratedId === 'OLISKEY' || roleCode === 'PAR') ? 'OLISKEY' : schoolCode;

    if (effectiveSchoolCode && effectiveSchoolCode !== 'SCHOOL') {
        return `${effectiveSchoolCode.toUpperCase()}_${branchCode.toUpperCase()}_${roleCode}_0001`;
    }

    // 4. Generic placeholder — never expose a UUID
    return `${roleCode}_0001`;
};

/**
 * Validates that a string conforms to the standard ID format.
 * SCHOOL_BRANCH_ROLE_NUMBER — e.g. EXCEL_MAIN_STU_0001
 */
export const isValidSchoolId = (id: string): boolean => {
    return /^[A-Z0-9]+_[A-Z0-9]+_[A-Z]+_\d{4}$/.test(id);
};
