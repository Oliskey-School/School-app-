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

    static async createDiscreetRequest(schoolId: string, branchId: string | undefined, requestData: any, actor?: { id?: string; studentId?: string | null }) {
        // Only the columns that exist. Spreading the form body used to send
        // unknown fields (request_type, quantity_needed, pickup_location) and the
        // insert failed with a 500 — the student saw "Failed to submit request".
        const isAnonymous = requestData?.is_anonymous !== false;
        const qty = Number(requestData?.quantity_needed ?? requestData?.quantity);
        const insertData: any = {
            school_id: schoolId,
            is_anonymous: isAnonymous,
            status: 'pending',
            notes: requestData?.notes ? String(requestData.notes).slice(0, 2000) : null,
            request_type: requestData?.request_type ? String(requestData.request_type).slice(0, 100) : null,
            quantity: Number.isFinite(qty) ? Math.max(1, Math.round(qty)) : 1,
            pickup_location: requestData?.pickup_location ? String(requestData.pickup_location).slice(0, 200) : null,
            // an anonymous request never stores who asked
            student_id: isAnonymous ? null : (actor?.studentId || null),
            created_by: isAnonymous ? null : (actor?.id || null),
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

    /** Open and recent discreet support requests for the nurse / counselor / admin. */
    static async getDiscreetRequests(schoolId: string, branchId: string | undefined) {
        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;
        return prisma.menstrualSupportRequest.findMany({ where, orderBy: { created_at: 'desc' }, take: 200 });
    }

    static async updateDiscreetRequestStatus(schoolId: string, id: string, status: string, actorId?: string) {
        const allowed = ['pending', 'ready', 'collected', 'closed'];
        const next = String(status || '').toLowerCase();
        if (!allowed.includes(next)) throw Object.assign(new Error(`status must be one of ${allowed.join(', ')}`), { status: 400 });
        const existing = await prisma.menstrualSupportRequest.findFirst({ where: { id, school_id: schoolId, deleted_at: null }, select: { id: true } });
        if (!existing) throw Object.assign(new Error('Request not found'), { status: 404 });
        return prisma.menstrualSupportRequest.update({ where: { id }, data: { status: next, updated_by: actorId || null } });
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
