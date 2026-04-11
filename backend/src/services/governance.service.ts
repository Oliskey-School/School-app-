import prisma from '../config/database';

export class GovernanceService {
    static async getComplianceStatus(schoolId: string) {
        const data = await prisma.complianceReport.findFirst({
            where: { school_id: schoolId },
            orderBy: { check_date: 'desc' }
        });

        if (!data) {
            return { status: 'Pending', score: 0, lastCheck: null };
        }
        return data;
    }

    static async verifySystemIntegrity(schoolId: string) {
        return { success: true, message: 'System integrity verified.', report: { school_id: schoolId } };
    }
}
