import prisma from '../config/database';

export class OfflineChannelService {
    // Radio
    static async getRadioContent(schoolId: string) {
        return prisma.radioContent.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createRadioContent(schoolId: string, data: any) {
        return prisma.radioContent.create({
            data: { ...data, school_id: schoolId }
        });
    }

    static async getRadioBroadcasts(schoolId: string) {
        return prisma.radioBroadcast.findMany({
            where: { school_id: schoolId },
            include: {
                radio_content: { select: { content_title: true, duration_minutes: true } },
                radio_partner: { select: { station_name: true, location: true } }
            },
            orderBy: { broadcast_date: 'desc' }
        });
    }

    static async getRadioPartners(schoolId: string) {
        return prisma.radioPartner.findMany({
            where: { school_id: schoolId },
            orderBy: { station_name: 'asc' }
        });
    }

    // IVR
    static async getIVRLessons(schoolId: string) {
        return prisma.iVRLesson.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createIVRLesson(schoolId: string, data: any) {
        return prisma.iVRLesson.create({
            data: { ...data, school_id: schoolId }
        });
    }

    static async getIVRCalls(schoolId: string) {
        return prisma.iVRCall.findMany({
            where: { school_id: schoolId },
            include: {
                ivr_lesson: { select: { lesson_title: true } }
            },
            orderBy: { initiated_at: 'desc' }
        });
    }

    // SMS
    static async getSMSLessons(schoolId: string) {
        return prisma.sMSLesson.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createSMSLesson(schoolId: string, data: any) {
        return prisma.sMSLesson.create({
            data: { ...data, school_id: schoolId }
        });
    }

    static async getSMSSchedules(schoolId: string) {
        return prisma.sMSSchedule.findMany({
            where: { school_id: schoolId },
            include: {
                sms_lesson: { select: { lesson_title: true, content: true } }
            },
            orderBy: { scheduled_date: 'desc' }
        });
    }

    // USSD
    static async getUSSDMenus(schoolId: string) {
        return prisma.uSSDMenuStructure.findMany({
            where: { school_id: schoolId },
            orderBy: [
                { menu_level: 'asc' },
                { menu_option: 'asc' }
            ]
        });
    }

    static async getUSSDSessions(schoolId: string) {
        return prisma.uSSDSession.findMany({
            where: { school_id: schoolId },
            include: {
                ussd_menu: { select: { menu_text: true } }
            },
            orderBy: { started_at: 'desc' },
            take: 50
        });
    }

    static async getUSSDTransactions(schoolId: string) {
        return prisma.uSSDTransaction.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' },
            take: 50
        });
    }
}
