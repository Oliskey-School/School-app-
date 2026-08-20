import prisma from '../config/database';
import { SocketService } from './socket.service';

export class AnonymousReportService {
    static async create(data: {
        report_hash: string;
        track_code: string;
        school_id: string;
        branch_id?: string | null;
        category: string;
        severity?: string;
        description_encrypted: string;
        location?: string;
        status?: string;
    }) {
        // school_id is NOT NULL on the row. It was previously defaulted to null
        // here, which made every create throw a foreign-key error.
        if (!data.school_id) {
            throw new Error('school_id is required to file an anonymous report');
        }

        const result = await (prisma as any).secureAnonymousReport.create({
            data: {
                report_hash: data.report_hash,
                track_code: data.track_code,
                school_id: data.school_id,
                branch_id: data.branch_id || null,
                category: data.category,
                severity: data.severity || 'Medium',
                description_encrypted: data.description_encrypted,
                location: data.location || null,
                status: data.status || 'New',
            },
        });

        if (data.school_id) {
            SocketService.emitToSchool(data.school_id, 'notice:updated', { action: 'secure_anonymous_report', reportId: result.id });
        }
        return result;
    }

    static async getAll(schoolId?: string) {
        const where: any = {};
        if (schoolId) where.school_id = schoolId;

        return (prisma as any).secureAnonymousReport.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    }

    static async getByTrackCode(trackCode: string) {
        return (prisma as any).secureAnonymousReport.findUnique({
            where: { track_code: trackCode },
        });
    }

    static async updateStatus(schoolId: string, id: string, status: string, adminNotes?: string) {
        const data: any = { status };
        if (adminNotes) data.admin_notes = adminNotes;
        if (status === 'Resolved') data.resolved_at = new Date();

        // Tenant-scoped lookup prevents cross-school mutation via known report id.
        // NOTE: reports with school_id = null are platform-level and only mutable by SuperAdmin
        // (route should enforce role). We require an exact match here to fail closed.
        const report = await (prisma as any).secureAnonymousReport.findFirst({
            where: { id, school_id: schoolId }
        });
        if (!report) {
            const err: any = new Error('Anonymous report not found');
            err.statusCode = 404;
            throw err;
        }
        const result = await (prisma as any).secureAnonymousReport.update({
            where: { id: report.id },
            data,
        });

        if (report.school_id) {
            SocketService.emitToSchool(report.school_id, 'notice:updated', { action: 'secure_report_status', reportId: id });
        }
        return result;
    }
}
