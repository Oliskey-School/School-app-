import prisma from '../config/database';
import { SocketService } from './socket.service';

// Thrown for bad input the caller can fix — route handlers show this message
// to the user verbatim. Any other error (e.g. a raw Prisma exception) is
// caught by the route and replaced with a generic message instead, so
// internal details never reach the client.
class ValidationError extends Error {
    isValidation = true;
    constructor(message: string) {
        super(message);
    }
}

function currentAcademicYear(): string {
    // Nigerian school sessions run September–July; before September, the
    // session that started last calendar year is still current.
    const now = new Date();
    const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}/${startYear + 1}`;
}

export class TransportService {
    static async getRoutes(schoolId: string, branchId?: string) {
        return prisma.transportRoute.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            include: {
                _count: {
                    select: { assignments: true }
                }
            },
            orderBy: { route_name: 'asc' }
        });
    }

    static async createRoute(schoolId: string, branchId: string | undefined, data: any) {
        if (!data.route_name?.trim()) throw new ValidationError('Route name is required');
        if (!data.bus_number?.trim()) throw new ValidationError('Bus number is required');
        if (!data.driver_name?.trim()) throw new ValidationError('Driver name is required');

        const route = await prisma.transportRoute.create({
            data: {
                ...data,
                capacity: Number.isFinite(Number(data.capacity)) && Number(data.capacity) > 0 ? Number(data.capacity) : 40,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null
            }
        });

        SocketService.emitToSchool(schoolId, 'transport:updated', { action: 'create_route', routeId: route.id });
        return route;
    }

    static async deleteRoute(schoolId: string, id: string) {
        // Tenant-scoped lookup prevents cross-school deletion via known route id.
        const route = await prisma.transportRoute.findFirst({ where: { id, school_id: schoolId } });
        if (!route) {
            const err: any = new Error('Route not found');
            err.statusCode = 404;
            throw err;
        }
        const result = await prisma.transportRoute.delete({ where: { id: route.id } });
        SocketService.emitToSchool(route.school_id, 'transport:updated', { action: 'delete_route', routeId: id });
        return result;
    }

    static async getStops(schoolId: string, branchId?: string, routeId?: string) {
        return prisma.transportStop.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                ...(routeId ? { route_id: routeId } : {}),
            },
            include: {
                route: {
                    select: { route_name: true }
                }
            },
            orderBy: { stop_order: 'asc' }
        });
    }

    static async createStop(schoolId: string, branchId: string | undefined, data: any) {
        if (!data.stop_name?.trim()) throw new ValidationError('Stop name is required');
        if (!data.route_id) throw new ValidationError('A route is required');

        // Confirm the route this stop attaches to actually belongs to this
        // admin's school/branch — otherwise a stop could be added to another
        // tenant's route by id.
        const route = await prisma.transportRoute.findFirst({
            where: { id: data.route_id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
            select: { id: true, branch_id: true },
        });
        if (!route) throw new ValidationError('Route not found in your school/branch');

        return prisma.transportStop.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: route.branch_id,
                stop_order: Number.isFinite(Number(data.stop_order)) && Number(data.stop_order) > 0 ? Number(data.stop_order) : 1,
            }
        });
    }

    static async deleteStop(schoolId: string, branchId: string | undefined, id: string) {
        const result = await prisma.transportStop.deleteMany({
            where: { id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) }
        });
        if (result.count === 0) {
            const err: any = new Error('Stop not found in your school/branch');
            err.statusCode = 404;
            throw err;
        }
        return { success: true };
    }

    static async getAssignments(schoolId: string, branchId?: string) {
        return prisma.transportAssignment.findMany({
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
                route: {
                    select: { route_name: true, bus_number: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createAssignment(schoolId: string, branchId: string | undefined, data: any) {
        if (!data.route_id) throw new ValidationError('A route is required');
        if (!data.student_id) throw new ValidationError('A student is required');

        // Confirm both the route and the student actually belong to this
        // admin's school/branch before linking them together.
        const [route, student] = await Promise.all([
            prisma.transportRoute.findFirst({
                where: { id: data.route_id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
                select: { id: true, branch_id: true },
            }),
            prisma.student.findFirst({
                where: { id: data.student_id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) },
                select: { id: true },
            }),
        ]);
        if (!route) throw new ValidationError('Route not found in your school/branch');
        if (!student) throw new ValidationError('Student not found in your school/branch');

        return prisma.transportAssignment.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: route.branch_id,
                academic_year: data.academic_year?.trim() || currentAcademicYear(),
            }
        });
    }

    static async deleteAssignment(schoolId: string, branchId: string | undefined, id: string) {
        const result = await prisma.transportAssignment.deleteMany({
            where: { id, school_id: schoolId, ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}) }
        });
        if (result.count === 0) {
            const err: any = new Error('Assignment not found in your school/branch');
            err.statusCode = 404;
            throw err;
        }
        return { success: true };
    }
}
