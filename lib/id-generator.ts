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
    const sch = options.schoolShortName || 'SCH';
    const branch = options.branch || 'Main';

    // Map roles to short codes
    const roleMap: Record<string, string> = {
        'admin': 'Admin',
        'teacher': 'Teach',
        'student': 'Stud',
        'parent': 'Prnt',
        'superadmin': 'SAdm',
        'proprietor': 'Prop',
        'inspector': 'Insp',
        'examofficer': 'Exam',
        'compliance': 'Comp'
    };

    const roleCode = roleMap[options.role.toLowerCase()] || options.role.substring(0, 4);
    const paddedNumber = options.sequenceNumber.toString().padStart(4, '0');

    return `${sch}-${branch}-${roleCode}-${paddedNumber}`;
}
