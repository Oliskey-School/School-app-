import prisma from '../config/database';
import { SocketService } from './socket.service';

export class DepartmentService {
    static async getDepartments(schoolId: string, branchId: string | undefined) {
        const where: any = { school_id: schoolId, deleted_at: null };
        if (branchId && branchId !== 'all') where.branch_id = branchId;

        const departments = await (prisma as any).department.findMany({
            where,
            include: {
                head_teacher: { select: { id: true, full_name: true } },
                teachers: { select: { id: true, full_name: true } },
                budgets: { select: { id: true, fiscal_year: true, allocated_amount: true, spent_amount: true } },
                _count: { select: { meetings: true } },
            },
            orderBy: { name: 'asc' },
        });

        return departments.map((d: any) => ({
            ...d,
            teacher_count: d.teachers.length,
            total_allocated: d.budgets.reduce((s: number, b: any) => s + b.allocated_amount, 0),
            total_spent: d.budgets.reduce((s: number, b: any) => s + b.spent_amount, 0),
            meeting_count: d._count.meetings,
        }));
    }

    static async createDepartment(schoolId: string, branchId: string | undefined, data: any) {
        if (!data.name?.trim()) throw new Error('A department name is required');
        const department = await (prisma as any).department.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                name: data.name.trim(), head_teacher_id: data.head_teacher_id || null,
            },
        });
        SocketService.emitToSchool(schoolId, 'department:updated', { action: 'create', departmentId: department.id });
        return department;
    }

    static async updateDepartment(schoolId: string, id: string, data: any) {
        const department = await (prisma as any).department.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!department) throw new Error('Department not found');
        const updated = await (prisma as any).department.update({
            where: { id },
            data: { name: data.name?.trim(), head_teacher_id: data.head_teacher_id !== undefined ? data.head_teacher_id || null : undefined },
        });
        SocketService.emitToSchool(schoolId, 'department:updated', { action: 'update', departmentId: id });
        return updated;
    }

    static async assignTeacher(schoolId: string, departmentId: string, teacherId: string) {
        const department = await (prisma as any).department.findFirst({ where: { id: departmentId, school_id: schoolId, deleted_at: null } });
        if (!department) throw new Error('Department not found');
        const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, school_id: schoolId, deleted_at: null } });
        if (!teacher) throw new Error('Teacher not found');
        return prisma.teacher.update({ where: { id: teacherId }, data: { department_id: departmentId } });
    }

    static async removeTeacher(schoolId: string, teacherId: string) {
        const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, school_id: schoolId, deleted_at: null } });
        if (!teacher) throw new Error('Teacher not found');
        return prisma.teacher.update({ where: { id: teacherId }, data: { department_id: null } });
    }

    static async addBudget(schoolId: string, branchId: string | undefined, departmentId: string, data: any) {
        const department = await (prisma as any).department.findFirst({ where: { id: departmentId, school_id: schoolId, deleted_at: null } });
        if (!department) throw new Error('Department not found');
        if (!data.fiscal_year?.trim()) throw new Error('A fiscal year is required');
        if (!data.allocated_amount || Number(data.allocated_amount) <= 0) throw new Error('An allocated amount is required');
        return prisma.budget.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                department_id: departmentId, fiscal_year: data.fiscal_year.trim(),
                category: data.category || department.name, allocated_amount: Number(data.allocated_amount),
                spent_amount: Number(data.spent_amount) || 0,
            },
        });
    }

    static async createMeeting(schoolId: string, branchId: string | undefined, departmentId: string, data: any, actorId: string) {
        const department = await (prisma as any).department.findFirst({ where: { id: departmentId, school_id: schoolId, deleted_at: null } });
        if (!department) throw new Error('Department not found');
        if (!data.title?.trim()) throw new Error('A meeting title is required');
        if (!data.date) throw new Error('A meeting date is required');
        return (prisma as any).departmentMeeting.create({
            data: {
                school_id: schoolId, branch_id: branchId && branchId !== 'all' ? branchId : null,
                department_id: departmentId, title: data.title.trim(), date: new Date(data.date),
                time: data.time || null, agenda: data.agenda || null, minutes: data.minutes?.trim() || null,
                created_by: actorId,
            },
        });
    }

    static async updateMeetingMinutes(schoolId: string, id: string, minutes: string) {
        const meeting = await (prisma as any).departmentMeeting.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!meeting) throw new Error('Meeting not found');
        return (prisma as any).departmentMeeting.update({ where: { id }, data: { minutes } });
    }

    static async getReport(schoolId: string, departmentId: string) {
        const department = await (prisma as any).department.findFirst({
            where: { id: departmentId, school_id: schoolId, deleted_at: null },
            include: {
                head_teacher: { select: { id: true, full_name: true } },
                teachers: { select: { id: true, full_name: true, subject_specialty: true } },
                budgets: true,
                meetings: { orderBy: { date: 'desc' }, take: 10 },
            },
        });
        if (!department) throw new Error('Department not found');
        return {
            ...department,
            total_allocated: department.budgets.reduce((s: number, b: any) => s + b.allocated_amount, 0),
            total_spent: department.budgets.reduce((s: number, b: any) => s + b.spent_amount, 0),
        };
    }
}
