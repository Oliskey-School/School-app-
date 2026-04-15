import prisma from '../config/database';
import { SocketService } from './socket.service';

export class BusService {
    static async getBuses(schoolId: string, branchId: string | undefined) {
        const where: any = { school_id: schoolId };
        
        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        const buses = await prisma.transportBus.findMany({
            where,
            orderBy: { name: 'asc' }
        });

        return buses;
    }

    static async createBus(schoolId: string, branchId: string | undefined, busData: any) {
        // Destructure to prevent conflicts with securely provided IDs
        const { school_id, branch_id, ...data } = busData;
        
        const createData: any = {
            ...data,
            school_id: schoolId,
        };
        
        if (branchId && branchId !== 'all') {
            createData.branch_id = branchId;
        }

        const bus = await prisma.transportBus.create({
            data: createData
        });

        SocketService.emitToSchool(schoolId, 'transport:updated', { action: 'create_bus', busId: bus.id });
        return bus;
    }

    static async updateBus(schoolId: string, branchId: string | undefined, busId: string, updates: any) {
        // Destructure to prevent sensitive field modification
        const { school_id, branch_id, ...data } = updates;

        const where: any = {
            id: busId,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        const bus = await prisma.transportBus.update({
            where: { id: busId },
            data: updates
        });

        SocketService.emitToSchool(schoolId, 'transport:updated', { action: 'update_bus', busId });
        return bus;
    }

    static async deleteBus(schoolId: string, branchId: string | undefined, busId: string) {
        const where: any = {
            id: busId,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        await prisma.transportBus.delete({
            where: { id: busId }
        });

        SocketService.emitToSchool(schoolId, 'transport:updated', { action: 'delete_bus', busId });
        return true;
    }

    static async getStudentBus(schoolId: string, studentId: string) {
        const assignment = await prisma.transportAssignment.findFirst({
            where: { student_id: studentId, status: 'active' },
            include: {
                route: {
                    include: {
                        stops: { orderBy: { stop_order: 'asc' } }
                    }
                }
            }
        });

        if (!assignment) return null;

        const bus = await prisma.transportBus.findFirst({
            where: {
                school_id: schoolId,
                status: 'active',
                OR: [{ route_name: assignment.route.route_name }]
            }
        });

        return {
            id: bus?.id || assignment.route.id,
            name: bus?.name || assignment.route.bus_number,
            routeName: assignment.route.route_name,
            driverName: bus?.driver_name || assignment.route.driver_name,
            driverPhone: assignment.route.driver_phone || '+234 000 000 0000',
            plateNumber: bus?.plate_number || 'N/A',
            capacity: bus?.capacity || assignment.route.capacity,
            status: bus?.status || assignment.route.status,
            stops: assignment.route.stops
        };
    }
}