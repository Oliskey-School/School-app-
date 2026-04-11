/**
 * Oliskey ID Formatter
 * Format: school_branch_role_numbers (e.g., oliskey_main_STU_0001)
 */

export type UserRolePrefix = 'ADM' | 'TCH' | 'STU' | 'PAR' | 'PRN';

export async function generateOliskeyId(
    schoolSlug: string,
    branchSlug: string,
    role: UserRolePrefix,
    count: number
): Promise<string> {
    const paddedNumber = String(count).padStart(4, '0');
    return `${schoolSlug.toLowerCase()}_${branchSlug.toLowerCase()}_${role}_${paddedNumber}`;
}

/**
 * Utility to format a raw ID or number into the Oliskey standard format.
 * Synchronous version for UI formatting.
 */
export function formatSchoolId(
    id: string | number | null | undefined,
    role: string,
    schoolCode: string = 'OLISKEY',
    branchCode: string = 'MAIN'
): string {
    if (id === null || id === undefined || id === '') return '';
    const idStr = String(id);
    
    // If it's already a full standard ID with 3 underscores, return it
    if (idStr.split('_').length >= 4) return idStr;
    
    // Map various role strings to standard prefixes
    const getRoleCode = (r: string): UserRolePrefix => {
        const lower = r.toLowerCase();
        if (lower.includes('admin') || lower === 'superadmin') return 'ADM';
        if (lower.includes('teacher')) return 'TCH';
        if (lower.includes('student')) return 'STU';
        if (lower.includes('parent')) return 'PAR';
        if (lower.includes('principal') || lower.includes('proprietor')) return 'PRN';
        return 'ADM'; // Default fallback
    };
    
    const roleCode = getRoleCode(role);
    
    // Extract numbers from ID if it's not purely numeric, or just use it
    const numericPart = idStr.replace(/[^0-9]/g, '');
    const paddedId = (numericPart || idStr).padStart(4, '0');
    
    return `${schoolCode.toLowerCase()}_${branchCode.toLowerCase()}_${roleCode}_${paddedId}`;
}

/**
 * Extracts info from a formatted ID for verification.
 */
export function parseOliskeyId(id: string) {
    if (!id) return null;
    const parts = id.split('_');
    if (parts.length < 4) return null;
    return {
        school: parts[0],
        branch: parts[1],
        role: parts[2],
        number: parts[3]
    };
}
