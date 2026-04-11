import { PrismaClient } from '@prisma/client';
import { SocketService } from './socket.service';

const prisma = new PrismaClient();

export class AnonymousReportService {
    static async create(data: {
        report_hash: string;
        track_code: string;
        school_id?: string;
        category: string;
        severity?: string;
        description_encrypted: string;
        location?: string;
        status?: string;
    }) {
        const result = await (prisma as any).secureAnonymousReport.create({
            data: {
                report_hash: data.report_hash,
                track_code: data.track_code,
                school_id: data.school_id || null,
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

    static async updateStatus(id: string, status: string, adminNotes?: string) {
        const data: any = { status };
        if (adminNotes) data.admin_notes = adminNotes;
        if (status === 'Resolved') data.resolved_at = new Date();

        const report = await (prisma as any).secureAnonymousReport.findUnique({ where: { id } });
        const result = await (prisma as any).secureAnonymousReport.update({
            where: { id },
            data,
        });

        if (report?.school_id) {
            SocketService.emitToSchool(report.school_id, 'notice:updated', { action: 'secure_report_status', reportId: id });
        }
        return result;
    }
}
