import prisma from '../config/database';
import { SocketService } from './socket.service';

export class CalendarService {
    static async getCalendarEvents(schoolId: string, parentId?: string) {
        const events = await prisma.event.findMany({
            where: { school_id: schoolId },
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

    static async rsvpToEvent(eventId: string, parentId: string, status: string) {
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
                status
            }
        });

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (event) {
            SocketService.emitToSchool(event.school_id, 'academic:updated', { action: 'rsvp', eventId, parentId });
        }
        return result;
    }

    static async createCalendarEvent(schoolId: string, eventData: any) {
        const event = await prisma.event.create({
            data: {
                school_id: schoolId,
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
