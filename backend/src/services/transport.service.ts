import prisma from '../config/database';
import { SocketService } from './socket.service';

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
        const route = await prisma.transportRoute.create({
            data: {
                ...data,
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null
            }
        });

        SocketService.emitToSchool(schoolId, 'transport:updated', { action: 'create_route', routeId: route.id });
        return route;
    }

    static async deleteRoute(id: string) {
        const route = await prisma.transportRoute.findUnique({ where: { id } });
        const result = await prisma.transportRoute.delete({
            where: { id }
        });

        if (route) {
            SocketService.emitToSchool(route.school_id, 'transport:updated', { action: 'delete_route', routeId: id });
        }
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
        return prisma.transportStop.create({
            data
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
        return prisma.transportAssignment.create({
            data
        });
    }

    static async deleteAssignment(id: string) {
        return prisma.transportAssignment.delete({
            where: { id }
        });
    }
}
