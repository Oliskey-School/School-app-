import prisma from '../config/database';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';

const VALID_TRANSITIONS: Record<string, string[]> = {
    Pending: ['In Progress', 'Completed'],
    'In Progress': ['Completed', 'Pending'],
    Completed: [],
};

export class MaintenanceService {
    static async getTickets(schoolId: string, branchId?: string, reportedBy?: string) {
        return (prisma as any).maintenanceTicket.findMany({
            where: {
                school_id: schoolId,
                ...(branchId && branchId !== 'all' ? { branch_id: branchId } : {}),
                ...(reportedBy ? { reported_by: reportedBy } : {}),
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

    static async createTicket(schoolId: string, branchId: string | undefined, data: any, reportedBy: string) {
        if (!data.issue_title?.trim()) throw new Error('A short description of the issue is required');
        if (!data.asset_id && !data.location?.trim()) throw new Error('Either an asset or a location is required');

        const ticketCount = await (prisma as any).maintenanceTicket.count({
            where: { school_id: schoolId }
        });
        const ticketNumber = `TKT-${(ticketCount + 1).toString().padStart(4, '0')}`;

        const ticket = await (prisma as any).maintenanceTicket.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                asset_id: data.asset_id || null,
                location: data.location?.trim() || null,
                category: data.category || null,
                issue_title: data.issue_title.trim(),
                issue_description: data.issue_description?.trim() || null,
                priority: data.priority || 'Medium',
                status: 'Pending',
                reported_by: reportedBy,
                ticket_number: ticketNumber,
            }
        });

        SocketService.emitToSchool(schoolId, 'maintenance:updated', { action: 'create', ticketId: ticket.id });

        const admins = await prisma.user.findMany({
            where: { school_id: schoolId, role: { in: ['ADMIN', 'PROPRIETOR'] as any } },
            select: { id: true },
        });
        for (const admin of admins) {
            await NotificationService.createNotification(schoolId, branchId, {
                user_id: admin.id, title: 'Maintenance Request',
                message: `New ${ticket.priority.toLowerCase()}-priority issue reported: ${ticket.issue_title}`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Maintenance] admin notify failed:', err.message));
        }

        return ticket;
    }

    static async updateStatus(schoolId: string, id: string, status: string) {
        const ticket = await (prisma as any).maintenanceTicket.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!ticket) throw new Error('Ticket not found');
        if (ticket.status === status) return ticket;
        const allowed = VALID_TRANSITIONS[ticket.status] || [];
        if (!allowed.includes(status)) throw new Error(`Cannot move a ${ticket.status} ticket to ${status}`);

        const updated = await (prisma as any).maintenanceTicket.update({
            where: { id },
            data: { status, updated_at: new Date() },
        });

        SocketService.emitToSchool(schoolId, 'maintenance:updated', { action: 'status', ticketId: id, status });

        if (ticket.reported_by) {
            await NotificationService.createNotification(schoolId, ticket.branch_id ?? undefined, {
                user_id: ticket.reported_by, title: 'Maintenance Update',
                message: `Your report "${ticket.issue_title}" is now ${status}.`,
                category: 'System',
            }).catch(err => console.warn('⚠️ [Maintenance] reporter notify failed:', err.message));
        }

        return updated;
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
        const result = await (prisma as any).maintenanceTicket.deleteMany({
            where: { id, school_id: schoolId }
        });

        SocketService.emitToSchool(schoolId, 'maintenance:updated', { action: 'delete', ticketId: id });
        return result;
    }
}
