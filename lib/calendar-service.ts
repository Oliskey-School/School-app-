import { api } from './api';

export interface SchoolEvent {
    id?: string;
    title: string;
    description?: string;
    date: string;
    type: 'Academic' | 'Social' | 'Exam' | 'Financial';
    location?: string;
    rsvp_enabled: boolean;
}

export class CalendarService {
    static async getEvents(schoolId: string) {
        return await api.getCalendarEvents();
    }

    static async rsvp(eventId: string, parentId: string, status: 'yes' | 'no' | 'maybe') {
        return await api.rsvpToEvent(eventId, status);
    }

    /**
     * Generates a downloadable .ics string for phone calendar integration.
     */
    static generateICS(event: SchoolEvent) {
        const date = new Date(event.date);
        const dateStr = date.toISOString().replace(/-|:|\.\d+/g, '');
        
        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'BEGIN:VEVENT',
            `URL:https://app.oliskey.com/events/${event.id}`,
            `DTSTART:${dateStr}`,
            `DTEND:${dateStr}`,
            `SUMMARY:${event.title}`,
            `DESCRIPTION:${event.description || ''}`,
            `LOCATION:${event.location || ''}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\n');
    }

    static downloadICS(event: SchoolEvent) {
        const icsContent = this.generateICS(event);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `${event.title.replace(/\s+/g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

