import prisma from '../config/database';
import { SocketService } from './socket.service';

export class HostelService {
    static async getHostels(schoolId: string, branchId?: string) {
        return prisma.hostel.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            include: {
                rooms: true
            },
            orderBy: { name: 'asc' }
        });
    }

    static async createHostel(schoolId: string, branchId: string | undefined, data: any) {
        const hostel = await prisma.hostel.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null
            }
        });

        SocketService.emitToSchool(schoolId, 'hostel:updated', { action: 'create', hostelId: hostel.id });
        return hostel;
    }

    static async deleteHostel(id: string) {
        const hostel = await prisma.hostel.findUnique({ where: { id } });
        const result = await prisma.hostel.delete({
            where: { id }
        });

        if (hostel) {
            SocketService.emitToSchool(hostel.school_id, 'hostel:updated', { action: 'delete', hostelId: id });
        }
        return result;
    }

    static async getRooms(hostelId?: string) {
        return prisma.hostelRoom.findMany({
            where: hostelId ? { hostel_id: hostelId } : {},
            include: {
                hostel: {
                    select: { name: true }
                }
            },
            orderBy: { room_number: 'asc' }
        });
    }

    static async createRoom(data: any) {
        const room = await prisma.hostelRoom.create({
            data
        });

        const hostel = await prisma.hostel.findUnique({ where: { id: data.hostel_id } });
        if (hostel) {
            SocketService.emitToSchool(hostel.school_id, 'hostel:updated', { action: 'room_create', roomId: room.id });
        }
        return room;
    }

    static async deleteRoom(id: string) {
        const room = await prisma.hostelRoom.findUnique({ where: { id }, include: { hostel: true } });
        const result = await prisma.hostelRoom.delete({
            where: { id }
        });

        if (room?.hostel) {
            SocketService.emitToSchool(room.hostel.school_id, 'hostel:updated', { action: 'room_delete', roomId: id });
        }
        return result;
    }

    static async getAllocations(schoolId: string) {
        return prisma.hostelAllocation.findMany({
            where: {
                student: {
                    school_id: schoolId
                }
            },
            include: {
                student: {
                    select: { full_name: true }
                },
                room: {
                    include: {
                        hostel: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { check_in_date: 'desc' }
        });
    }

    static async getVisitorLogs(schoolId: string) {
        return prisma.hostelVisitorLog.findMany({
            where: {
                student: {
                    school_id: schoolId
                }
            },
            include: {
                student: {
                    select: { full_name: true }
                },
                hostel: {
                    select: { name: true }
                }
            },
            orderBy: { visit_date: 'desc' }
        });
    }

    static async createVisitorLog(data: any) {
        const log = await prisma.hostelVisitorLog.create({
            data
        });

        const hostel = await prisma.hostel.findUnique({ where: { id: data.hostel_id } });
        if (hostel) {
            SocketService.emitToSchool(hostel.school_id, 'hostel:updated', { action: 'visitor_log', logId: log.id });
        }
        return log;
    }
}
