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

    static async updateHostel(schoolId: string, id: string, data: any) {
        // Tenant-scoped lookup prevents cross-school updates via known hostel id.
        const hostel = await prisma.hostel.findFirst({ where: { id, school_id: schoolId } });
        if (!hostel) throw notFound('Hostel');

        const { school_id: _sid, branch_id, ...rest } = data;
        const updated = await prisma.hostel.update({
            where: { id },
            data: {
                ...rest,
                ...(branch_id !== undefined ? { branch_id: branch_id || null } : {}),
            }
        });
        SocketService.emitToSchool(schoolId, 'hostel:updated', { action: 'update', hostelId: id });
        return updated;
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

        // school_id/branch_id are set from the verified hostel, never trusted from the
        // client body — otherwise a caller could spoof school_id and create a room that
        // looks like it belongs to another tenant while still hanging off this hostel.
        const { school_id: _sid, branch_id: _bid, ...rest } = data;
        const room = await prisma.hostelRoom.create({
            data: { ...rest, hostel_id: hostelId, school_id: hostel.school_id, branch_id: hostel.branch_id }
        });
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

    static async getAllocations(schoolId: string, branchId?: string) {
        return prisma.hostelAllocation.findMany({
            where: {
                student: {
                    school_id: schoolId,
                    ...(branchId ? { branch_id: branchId } : {})
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

    static async createAllocation(schoolId: string, data: any) {
        const roomId = data?.room_id;
        const studentId = data?.student_id;
        if (!roomId) {
            const err: any = new Error('room_id is required');
            err.statusCode = 400;
            throw err;
        }
        if (!studentId) {
            const err: any = new Error('student_id is required');
            err.statusCode = 400;
            throw err;
        }

        // Confirm the room (via its parent hostel) and the student both belong to the
        // caller's school before linking them together.
        const [room, student] = await Promise.all([
            prisma.hostelRoom.findFirst({
                where: { id: roomId, hostel: { school_id: schoolId } },
                include: { hostel: true },
            }),
            prisma.student.findFirst({ where: { id: studentId, school_id: schoolId } }),
        ]);
        if (!room) throw notFound('Room');
        if (!student) throw notFound('Student');
        if (room.occupied_beds >= room.bed_count) {
            const err: any = new Error('This room is already at full capacity');
            err.statusCode = 400;
            throw err;
        }

        const { school_id: _sid, branch_id: _bid, room_id: _rid, student_id: _stid, ...rest } = data;
        const [allocation] = await prisma.$transaction([
            prisma.hostelAllocation.create({
                data: {
                    ...rest,
                    room_id: roomId,
                    student_id: studentId,
                    bed_number: Number.isFinite(Number(data.bed_number)) && Number(data.bed_number) > 0 ? Number(data.bed_number) : room.occupied_beds + 1,
                    academic_year: data.academic_year || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
                    school_id: room.school_id,
                    branch_id: room.branch_id,
                }
            }),
            prisma.hostelRoom.update({
                where: { id: roomId },
                data: { occupied_beds: { increment: 1 } }
            }),
        ]);

        SocketService.emitToSchool(schoolId, 'hostel:updated', { action: 'allocation_create', allocationId: allocation.id });
        return allocation;
    }

    static async deleteAllocation(schoolId: string, id: string) {
        const allocation = await prisma.hostelAllocation.findFirst({
            where: { id, room: { hostel: { school_id: schoolId } } },
            include: { room: true },
        });
        if (!allocation) throw notFound('Allocation');

        const [result] = await prisma.$transaction([
            prisma.hostelAllocation.delete({ where: { id: allocation.id } }),
            prisma.hostelRoom.update({
                where: { id: allocation.room_id },
                data: { occupied_beds: { decrement: allocation.room.occupied_beds > 0 ? 1 : 0 } }
            }),
        ]);

        SocketService.emitToSchool(schoolId, 'hostel:updated', { action: 'allocation_delete', allocationId: id });
        return result;
    }

    static async getVisitorLogs(schoolId: string, branchId?: string) {
        return prisma.hostelVisitorLog.findMany({
            where: {
                student: {
                    school_id: schoolId,
                    ...(branchId ? { branch_id: branchId } : {})
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

        if (!data?.student_id) {
            const err: any = new Error('student_id is required');
            err.statusCode = 400;
            throw err;
        }
        const student = await prisma.student.findFirst({ where: { id: data.student_id, school_id: schoolId } });
        if (!student) throw notFound('Student');

        const { school_id: _sid, branch_id: _bid, ...rest } = data;
        const log = await prisma.hostelVisitorLog.create({
            data: { ...rest, hostel_id: hostelId, school_id: hostel.school_id, branch_id: hostel.branch_id }
        });
        SocketService.emitToSchool(hostel.school_id, 'hostel:updated', { action: 'visitor_log', logId: log.id });
        return log;
    }

    static async deleteVisitorLog(schoolId: string, id: string) {
        const log = await prisma.hostelVisitorLog.findFirst({ where: { id, school_id: schoolId } });
        if (!log) throw notFound('Visitor log');

        const result = await prisma.hostelVisitorLog.delete({ where: { id: log.id } });
        SocketService.emitToSchool(schoolId, 'hostel:updated', { action: 'visitor_log_delete', logId: id });
        return result;
    }
}
