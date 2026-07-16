import crypto from 'crypto';
import prisma from '../config/database';

export class ClassroomService {
    static async getClassrooms(schoolId: string, branchId?: string) {
        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }
        return await (prisma as any).classroom.findMany({
            where,
            include: { branch: { select: { name: true, code: true } } },
            orderBy: { name: 'asc' }
        });
    }

    static async createClassroom(schoolId: string, data: any, createdBy?: string) {
        if (!data?.name?.trim()) throw new Error('Classroom name is required');
        if (!data?.branch_id) throw new Error('Branch is required');

        // Branch must belong to this school — never trust a raw branch_id.
        const branch = await prisma.branch.findFirst({
            where: { id: data.branch_id, school_id: schoolId },
            select: { id: true }
        });
        if (!branch) throw new Error('Branch not found in this school');

        const classroom = await (prisma as any).classroom.create({
            data: {
                school_id: schoolId,
                branch_id: data.branch_id,
                name: data.name.trim(),
                description: data.description?.trim() || null,
                capacity: data.capacity != null && data.capacity !== '' ? Number(data.capacity) : null,
                // Permanent, unguessable QR payload. Regenerating it would
                // invalidate printed codes, so it is created once and kept.
                qr_token: `OSK-ROOM-${crypto.randomBytes(18).toString('base64url')}`,
                created_by: createdBy ?? null,
            },
            include: { branch: { select: { name: true, code: true } } }
        });

        // Backfill: timetable rows whose free-text room matches this classroom's
        // name become QR-verifiable immediately (school-scoped; branch-scoped or
        // untagged rows only, so another branch's same-named room isn't claimed).
        await prisma.timetable.updateMany({
            where: {
                school_id: schoolId,
                classroom_id: null,
                room: { equals: classroom.name, mode: 'insensitive' },
                OR: [{ branch_id: data.branch_id }, { branch_id: null }],
            },
            data: { classroom_id: classroom.id }
        });

        return classroom;
    }

    static async updateClassroom(schoolId: string, id: string, data: any, updatedBy?: string) {
        const existing = await (prisma as any).classroom.findFirst({
            where: { id, school_id: schoolId, deleted_at: null }
        });
        if (!existing) throw new Error('Classroom not found');

        return await (prisma as any).classroom.update({
            where: { id },
            data: {
                ...(data.name?.trim() ? { name: data.name.trim() } : {}),
                ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
                ...(data.capacity !== undefined ? { capacity: data.capacity != null && data.capacity !== '' ? Number(data.capacity) : null } : {}),
                updated_by: updatedBy ?? null,
            },
            include: { branch: { select: { name: true, code: true } } }
        });
    }

    static async deleteClassroom(schoolId: string, id: string, deletedBy?: string) {
        const existing = await (prisma as any).classroom.findFirst({
            where: { id, school_id: schoolId, deleted_at: null }
        });
        if (!existing) throw new Error('Classroom not found');

        await (prisma as any).classroom.update({
            where: { id },
            data: { deleted_at: new Date(), updated_by: deletedBy ?? null }
        });
        return { success: true };
    }
}
