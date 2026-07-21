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

    static async getStops(routeId?: string) {
        return prisma.transportStop.findMany({
            where: routeId ? { route_id: routeId } : {},
            include: {
                route: {
                    select: { route_name: true }
                }
            },
            orderBy: { stop_order: 'asc' }
        });
    }

    static async createStop(data: any) {
        if (!data.stop_name?.trim()) throw new ValidationError('Stop name is required');
        if (!data.route_id) throw new ValidationError('A route is required');

        return prisma.transportStop.create({
            data: {
                ...data,
                stop_order: Number.isFinite(Number(data.stop_order)) && Number(data.stop_order) > 0 ? Number(data.stop_order) : 1,
            }
        });
    }

    static async deleteStop(id: string) {
        return prisma.transportStop.delete({
            where: { id }
        });
    }

    static async getAssignments(schoolId: string) {
        return prisma.transportAssignment.findMany({
            where: {
                student: {
                    school_id: schoolId
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

    static async createAssignment(data: any) {
        if (!data.route_id) throw new ValidationError('A route is required');
        if (!data.student_id) throw new ValidationError('A student is required');

        return prisma.transportAssignment.create({
            data: {
                ...data,
                academic_year: data.academic_year?.trim() || currentAcademicYear(),
            }
        });
    }

    static async deleteAssignment(id: string) {
        return prisma.transportAssignment.delete({
            where: { id }
        });
    }
}
