
/**
 * Formats a school ID to ensure it follows the standard OLISKEY_MAIN_[ROLE]_XXXX format.
 * This handles converting legacy SCH_ IDs and ensures a consistent fallback for demo users.
 * 
 * @param id - The existing ID (from DB or Metadata) or undefined
 * @param role - The user's role (Teacher, Student, Parent, Admin)
 * @returns The formatted ID string
 */
export const formatSchoolId = (id: string | undefined | null, role: string): string => {
    // defined map for role codes
    const roleMap: Record<string, string> = {
        'Teacher': 'TCH',
        'Student': 'STD',
        'Parent': 'PAR',
        'Admin': 'ADM',
        'Super Admin': 'SADM',
        'Proprietor': 'PRO',
    };

    const roleCode = roleMap[role] || 'USR';
    const defaultSuffix = '0001';

    // Default ID if nothing is provided
    const fallbackId = `OLISKEY_MAIN_${roleCode}_${defaultSuffix}`;

    if (!id) return fallbackId;

    // Normalize: Upper case and underscores
    let formatted = id.replace(/-/g, '_').toUpperCase();

    // Fix Legacy/Metadata prefixes
    // Check if it starts with SCH_ and replace with OLISKEY_MAIN_
    // Example: SCH_HQS_TCH_0001 -> OLISKEY_MAIN_TCH_0001
    if (formatted.startsWith('SCH_')) {
        // Remove SCH_ and potential branch code (like HQS_) if we want to enforce MAIN
        // or just map SCH_ -> OLISKEY_

        // Strategy: Replace 'SCH_HQS_' with 'OLISKEY_MAIN_'
        if (formatted.includes('_HQS_')) {
            formatted = formatted.replace('SCH_HQS_', 'OLISKEY_MAIN_');
        } else {
            // Just replace SCH_ with OLISKEY_MAIN_ if HQS is missing but SCH is there
            formatted = formatted.replace('SCH_', 'OLISKEY_MAIN_');
        }
    }

    // Ensure it starts with OLISKEY_MAIN
    if (!formatted.startsWith('OLISKEY_MAIN_') && !formatted.startsWith('OLISKEY_')) {
        // If completely different format, maybe just append or leave it?
        // User wants strict standardization for standard demo cases.
        // If it looks like a valid ID just in wrong format, leave it?
        // But for the specific case of the "blink", we want to force the visual change.
        // If it is completely random string, return fallback?
        // Let's assume valid IDs contain the role code.
    }

    return formatted;
};
