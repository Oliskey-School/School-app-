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
        // Whitelist the fields a requester may set. The previous unfiltered
        // `...requestData` spread meant a student could post `status`,
        // `student_id`, `created_by` or `pickup_location` and have them written
        // straight through. pickup_location in particular is the SCHOOL's answer
        // to the request, not the requester's input.
        const quantity = Number(requestData?.quantity_needed);
        const insertData: any = {
            school_id: schoolId,
            request_type: requestData?.request_type ? String(requestData.request_type) : null,
            quantity_needed: Number.isFinite(quantity) && quantity > 0 ? Math.min(Math.floor(quantity), 50) : 1,
            notes: requestData?.notes ? String(requestData.notes) : null,
            is_anonymous: requestData?.is_anonymous !== false
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
