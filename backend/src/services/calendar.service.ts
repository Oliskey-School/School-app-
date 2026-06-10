import prisma from '../config/database';
import { SocketService } from './socket.service';

export class CalendarService {
    static async getCalendarEvents(schoolId: string, branchId?: string, parentId?: string) {
        const where: any = { school_id: schoolId };
        // Branch isolation: this branch's events.
        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }
        const events = await prisma.event.findMany({
            where,
            include: {
                rsvps: parentId ? { where: { parent_id: parentId } } : false
            },
            orderBy: { date: 'asc' }
        });

        return events.map((event) => ({
            ...event,
            date: event.date ? event.date.toISOString().split('T')[0] : null,
            category: event.location || event.type,
            event_rsvps: (event as any).rsvps || []
        }));
    }

    static async rsvpToEvent(schoolId: string, eventId: string, parentUserId: string, status: string) {
        // Verify the event is in the caller's school before allowing RSVP write.
        const event = await prisma.event.findFirst({ where: { id: eventId, school_id: schoolId } });
        if (!event) {
            const err: any = new Error('Event not found');
            err.statusCode = 404;
            throw err;
        }

        // RSVP is keyed by the Parent record id, but the caller passes the user id.
        const parent = await prisma.parent.findFirst({
            where: { OR: [{ user_id: parentUserId }, { id: parentUserId }], school_id: schoolId },
            select: { id: true }
        });
        if (!parent) {
            const err: any = new Error('Parent profile not found');
            err.statusCode = 404;
            throw err;
        }
        const parentId = parent.id;

        const result = await prisma.eventRSVP.upsert({
            where: {
                event_id_parent_id: {
                    event_id: eventId,
                    parent_id: parentId
                }
            },
            update: { status, updated_at: new Date() },
            create: {
                event_id: eventId,
                parent_id: parentId,
                status,
                school_id: event.school_id,
                branch_id: event.branch_id
            }
        });

        SocketService.emitToSchool(event.school_id, 'academic:updated', { action: 'rsvp', eventId, parentId });
        return result;
    }

    static async createCalendarEvent(schoolId: string, branchId: string | undefined, eventData: any) {
        const event = await prisma.event.create({
            data: {
                school_id: schoolId,
                branch_id: branchId && branchId !== 'all' ? branchId : null,
                title: eventData.title,
                date: new Date(eventData.date),
                type: eventData.type || 'General',
                description: eventData.description,
                location: eventData.location || eventData.category,
            }
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'create_event', eventId: event.id });
        return event;
    }
}
