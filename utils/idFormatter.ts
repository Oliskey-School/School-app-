
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
        'Inspector': 'INS',
        'Exam Officer': 'EXM',
        'Compliance Officer': 'CMP',
        'Counselor': 'CNS',
    };

    const roleCode = roleMap[role] || 'USR';
    const defaultSuffix = '00000';

    // Default ID if nothing is provided
    const fallbackId = `OLISKEY_MAIN_${roleCode}_${defaultSuffix}`;

    if (!id) return fallbackId;

    // Check if it's a UUID (contains multiple hyphens and matches UUID pattern)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
        // If it's a UUID, we don't want to show it as an ID.
        // Instead, we return a fallback that indicates it's pending a real ID
        // or uses a shortened version of the UUID if absolutely necessary.
        // User said "i don't want the ID should look like this ID: 4062b039...",
        // so we must avoid showing the UUID string entirely.
        return `OLISKEY_MAIN_${roleCode}_PENDING`;
    }

    // Normalize: Upper case and underscores
    let formatted = id.replace(/-/g, '_').toUpperCase();

    // Fix Legacy/Metadata prefixes
    if (formatted.startsWith('SCH_')) {
        if (formatted.includes('_HQS_')) {
            formatted = formatted.replace('SCH_HQS_', 'OLISKEY_MAIN_');
        } else {
            formatted = formatted.replace('SCH_', 'OLISKEY_MAIN_');
        }
    }

    // Ensure it starts with OLISKEY_MAIN_ or OLISKEY_
    if (!formatted.startsWith('OLISKEY_MAIN_') && !formatted.startsWith('OLISKEY_')) {
        // If it doesn't look like our standard ID, it might be a partial ID (like '0001')
        // or a different system ID. We prefix it.
        if (/^\d+$/.test(formatted)) {
            // It's just a number
            return `OLISKEY_MAIN_${roleCode}_${formatted.padStart(5, '0')}`;
        }
        
        // If it's something else, try to make it look like our standard
        return `OLISKEY_MAIN_${roleCode}_${formatted}`;
    }

    return formatted;
};
