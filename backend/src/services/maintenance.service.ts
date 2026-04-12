import prisma from '../config/database';
import { SocketService } from './socket.service';

export class MaintenanceService {
    static async getTickets(schoolId: string, branchId?: string) {
        return (prisma as any).maintenanceTicket.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {})
            },
            include: {
                asset: {
                    select: {
                        name: true,
                        code: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    static async createTicket(schoolId: string, data: any) {
        const ticketCount = await (prisma as any).maintenanceTicket.count({
            where: { school_id: schoolId }
        });
        
        const ticketNumber = `TKT-${(ticketCount + 1).toString().padStart(4, '0')}`;
        
        const ticket = await (prisma as any).maintenanceTicket.create({
            data: {
                ...data,
                school_id: schoolId,
                ticket_number: ticketNumber
            }
        });

        SocketService.emitToSchool(schoolId, 'maintenance:updated', { action: 'create', ticketId: ticket.id });
        return ticket;
    }

    static async updateTicket(schoolId: string, id: string, data: any) {
        const ticket = await (prisma as any).maintenanceTicket.update({
            where: { id, school_id: schoolId },
            data: {
                ...data,
                updated_at: new Date()
            }
        });

        SocketService.emitToSchool(schoolId, 'maintenance:updated', { action: 'update', ticketId: id });
        return ticket;
    }

    static async deleteTicket(schoolId: string, id: string) {
        const result = await (prisma as any).maintenanceTicket.delete({
            where: { id, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'maintenance:updated', { action: 'delete', ticketId: id });
        return result;
    }
}
