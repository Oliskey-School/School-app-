import prisma from '../config/database';
import { SocketService } from './socket.service';

export class StudentReportService {
    static async createAnonymousReport(schoolId: string, branchId: string | undefined, reportData: any) {
        const insertData: any = {
            ...reportData,
            school_id: schoolId
        };
        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const result = await prisma.anonymousReport.create({
            data: insertData
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'anonymous_report', reportId: result.id });
        return result;
    }

    static async createDiscreetRequest(schoolId: string, branchId: string | undefined, requestData: any) {
        const insertData: any = {
            ...requestData,
            school_id: schoolId
        };
        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const result = await prisma.menstrualSupportRequest.create({
            data: insertData
        });

        SocketService.emitToSchool(schoolId, 'health:updated', { action: 'menstrual_request', requestId: result.id });
        return result;
    }

    static async getReports(schoolId: string, branchId: string | undefined) {
        const where: any = { school_id: schoolId };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        return prisma.anonymousReport.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
    }
}
