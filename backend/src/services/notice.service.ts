import prisma from '../config/database';
import { SocketService } from './socket.service';

export class NoticeService {
    static async getNotices(schoolId: string, branchId: string | undefined) {
        const where: any = {
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        return await prisma.announcement.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
    }

    static async createNotice(schoolId: string, branchId: string | undefined, noticeData: any) {
        // Destructure to prevent conflicts with explicitly provided IDs
        const { school_id, branch_id, ...data } = noticeData;

        const notice = await prisma.announcement.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                created_at: new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'create', noticeId: notice.id });
        return notice;
    }

    static async deleteNotice(schoolId: string, branchId: string | undefined, id: string) {
        const where: any = {
            id,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        await prisma.announcement.deleteMany({ where });
        SocketService.emitToSchool(schoolId, 'notice:updated', { action: 'delete' });
        return true;
    }
}
