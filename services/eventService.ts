import { api } from '../lib/api';

/**
 * Event Service
 * Handles events, announcements, and notifications via the backend API.
 */

export async function fetchUpcomingEvents(grade?: string | number, section?: string, studentId?: string | number): Promise<any[]> {
    try {
        // The backend /calendar endpoint can handle these as query params if needed
        // For now, we'll fetch all events for the school and filter by class if provided
        const events = await api.getCalendarEvents();
        
        if (!events) return [];
        
        if (grade && section) {
            return events.filter((e: any) => 
                !e.audience || 
                e.audience === 'all' || 
                e.audience === `Grade ${grade}` || 
                e.audience === `Grade ${grade}${section}`
            );
        }
        
        return events;
    } catch (err) {
        console.error('Error fetching upcoming events:', err);
        return [];
    }
}

export async function fetchAnnouncements(schoolId: string): Promise<any[]> {
    try {
        return await api.getNotices(schoolId);
    } catch (err) {
        console.error('Error fetching announcements:', err);
        return [];
    }
}

export async function fetchNotifications(schoolId?: string): Promise<any[]> {
    try {
        return await api.getMyNotifications(schoolId);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        return [];
    }
}

// Aliases for compatibility
export const fetchNotices = fetchAnnouncements;
export const fetchEvents = fetchUpcomingEvents;

export async function notifyClass(className: string, title: string, message: string): Promise<boolean> {
    try {
        // In a real scenario, this would send a notification to all members of a class
        // For now, we'll use the createNotification endpoint if available
        await api.createNotification({
            title,
            content: message,
            target_class: className,
            type: 'announcement'
        });
        return true;
    } catch (err) {
        console.error('Error notifying class:', err);
        return false;
    }
}

