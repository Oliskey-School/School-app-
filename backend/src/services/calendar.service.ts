import prisma from '../config/database';
import { SocketService } from './socket.service';
import { NotificationService } from './notification.service';

// Every event type maps to who should be notified when it's created or
// changed. 'all' matches every audience via NotificationService's `has('all')`
// check, so broadcast-style events (holidays, resumption) reach everyone
// without needing a per-role fan-out.
const AUDIENCE_BY_TYPE: Record<string, string[]> = {
    'Sports Day': ['all'],
    'PTA': ['parent', 'admin'],
    'Resumption': ['all'],
    'Holiday': ['all'],
    'CA Week': ['student', 'teacher', 'parent'],
    'Exam Week': ['student', 'teacher', 'parent'],
    'Graduation': ['all'],
    'Open Day': ['all'],
    'General': ['all'],
};

function audienceFor(type: string): string[] {
    return AUDIENCE_BY_TYPE[type] || ['all'];
}

export class CalendarService {
    static async getCalendarEvents(schoolId: string, branchId?: string, parentId?: string) {
        const where: any = { school_id: schoolId, deleted_at: null };
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
        await NotificationService.createNotification(schoolId, event.branch_id ?? undefined, {
            audience: audienceFor(event.type), title: `New Event: ${event.title}`,
            message: `${event.title} is scheduled for ${event.date.toISOString().slice(0, 10)}${event.location ? ` at ${event.location}` : ''}.`,
            category: 'System',
        }).catch(err => console.warn('⚠️ [Calendar] event-created notification failed:', err.message));

        return event;
    }

    static async updateCalendarEvent(schoolId: string, id: string, eventData: any) {
        const existing = await prisma.event.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!existing) throw new Error('Event not found');

        const event = await prisma.event.update({
            where: { id },
            data: {
                title: eventData.title ?? existing.title,
                date: eventData.date ? new Date(eventData.date) : existing.date,
                type: eventData.type ?? existing.type,
                description: eventData.description ?? existing.description,
                location: eventData.location ?? eventData.category ?? existing.location,
            },
        });

        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'update_event', eventId: id });
        await NotificationService.createNotification(schoolId, event.branch_id ?? undefined, {
            audience: audienceFor(event.type), title: `Event Updated: ${event.title}`,
            message: `${event.title} has changed — now ${event.date.toISOString().slice(0, 10)}${event.location ? ` at ${event.location}` : ''}.`,
            category: 'System',
        }).catch(err => console.warn('⚠️ [Calendar] event-updated notification failed:', err.message));

        return event;
    }

    static async deleteCalendarEvent(schoolId: string, id: string) {
        const existing = await prisma.event.findFirst({ where: { id, school_id: schoolId, deleted_at: null } });
        if (!existing) throw new Error('Event not found');
        await prisma.event.update({ where: { id }, data: { deleted_at: new Date() } });
        SocketService.emitToSchool(schoolId, 'academic:updated', { action: 'delete_event', eventId: id });
        await NotificationService.createNotification(schoolId, existing.branch_id ?? undefined, {
            audience: audienceFor(existing.type), title: `Event Cancelled: ${existing.title}`,
            message: `${existing.title} (originally ${existing.date.toISOString().slice(0, 10)}) has been cancelled.`,
            category: 'System',
        }).catch(err => console.warn('⚠️ [Calendar] event-deleted notification failed:', err.message));
        return { success: true };
    }
}
