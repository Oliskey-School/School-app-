import prisma from '../config/database';
import { SocketService } from './socket.service';

function notFound(entity: string) {
    const err: any = new Error(`${entity} not found`);
    err.statusCode = 404;
    return err;
}

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

    static async deleteHostel(schoolId: string, id: string) {
        // Tenant-scoped lookup prevents cross-school deletion via known hostel id.
        const hostel = await prisma.hostel.findFirst({ where: { id, school_id: schoolId } });
        if (!hostel) throw notFound('Hostel');

        const result = await prisma.hostel.delete({ where: { id: hostel.id } });
        SocketService.emitToSchool(hostel.school_id, 'hostel:updated', { action: 'delete', hostelId: id });
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

    static async createRoom(schoolId: string, data: any) {
        // Verify parent hostel belongs to the caller's school before creating a room in it.
        const hostelId = data?.hostel_id;
        if (!hostelId) {
            const err: any = new Error('hostel_id is required');
            err.statusCode = 400;
            throw err;
        }
        const hostel = await prisma.hostel.findFirst({ where: { id: hostelId, school_id: schoolId } });
        if (!hostel) throw notFound('Hostel');

        const room = await prisma.hostelRoom.create({ data });
        SocketService.emitToSchool(hostel.school_id, 'hostel:updated', { action: 'room_create', roomId: room.id });
        return room;
    }

    static async deleteRoom(schoolId: string, id: string) {
        // Tenant-scoped lookup via parent hostel.
        const room = await prisma.hostelRoom.findFirst({
            where: { id, hostel: { school_id: schoolId } },
            include: { hostel: true }
        });
        if (!room) throw notFound('Room');

        const result = await prisma.hostelRoom.delete({ where: { id: room.id } });
        if (room.hostel) {
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

    static async createVisitorLog(schoolId: string, data: any) {
        // Verify the hostel the visitor is being logged against is in the caller's school.
        const hostelId = data?.hostel_id;
        if (!hostelId) {
            const err: any = new Error('hostel_id is required');
            err.statusCode = 400;
            throw err;
        }
        const hostel = await prisma.hostel.findFirst({ where: { id: hostelId, school_id: schoolId } });
        if (!hostel) throw notFound('Hostel');

        const log = await prisma.hostelVisitorLog.create({ data });
        SocketService.emitToSchool(hostel.school_id, 'hostel:updated', { action: 'visitor_log', logId: log.id });
        return log;
    }
}
