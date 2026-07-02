import prisma from '../config/database';
import { SocketService } from './socket.service';

export class BusService {
    static async getBuses(schoolId: string, branchId: string | undefined) {
        const where: any = { school_id: schoolId };
        
        if (branchId && branchId !== 'all') {
            where.branch_id = branchId; // strict branch isolation (untagged → All Branches only)
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
            where.branch_id = branchId; // strict branch isolation (untagged → All Branches only)
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
            where.branch_id = branchId; // strict branch isolation (untagged → All Branches only)
        }

        await prisma.transportBus.delete({
            where: { id: busId }
        });

        SocketService.emitToSchool(schoolId, 'transport:updated', { action: 'delete_bus', busId });
        return true;
    }

    static async getStudentBus(schoolId: string, studentId: string) {
        // First, try to find a direct schoolBusId on the student record
        const student = await (prisma.student.findUnique as any)({
            where: { id: studentId, school_id: schoolId },
            select: { school_bus_id: true }
        });

        if (student && student.school_bus_id) {
            // If direct assignment exists, fetch bus details
            const bus = await prisma.transportBus.findUnique({
                where: { id: student.school_bus_id }
            });
            if (bus) {
                return {
                    id: bus.id,
                    name: bus.name,
                    driverName: bus.driver_name || 'N/A',
                    plateNumber: bus.plate_number || 'N/A',
                    capacity: bus.capacity,
                    status: bus.status,
                    route: null // No route info for direct assignment in this format
                };
            }
            // If bus ID is invalid, proceed to check assignments (fall-through)
        }

        // Fallback to route-based assignment if no direct bus assignment or if bus details are missing
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

        if (!assignment || !assignment.route) return null;

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
