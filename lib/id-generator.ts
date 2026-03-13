/**
 * Generates a custom ID in the format: SCH-branch-role-number
 * Example: CHS-Osapa-Teach-0001
 */
export function generateCustomId(options: {
    schoolShortName?: string;
    branch?: string;
    role: string;
    sequenceNumber: number;
}): string {
    const sch = options.schoolShortName || 'OLISKEY';
    const branch = options.branch || 'MAIN';

    // Map roles to standard short codes (uppercase)
    const roleMap: Record<string, string> = {
        'admin': 'ADM',
        'teacher': 'TCH',
        'student': 'STU',
        'parent': 'PAR',
        'superadmin': 'SADM',
        'proprietor': 'PRO',
        'inspector': 'INS',
        'examofficer': 'EXA',
        'compliance': 'COM',
        'complianceofficer': 'COM'
    };

    const roleCode = roleMap[options.role.toLowerCase()] || options.role.substring(0, 3).toUpperCase();
    const paddedNumber = options.sequenceNumber.toString().padStart(5, '0');

    return `${sch}_${branch}_${roleCode}_${paddedNumber}`;
}
