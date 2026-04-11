/**
 * Behavior Tracking Service
 * Logs student behavioral incidents and progress milestones.
 */

import { api } from './api';
import { notifyStudentsAndParents } from './notifications';

export interface BehaviorIncident {
    studentId: string;
    teacherId: string;
    type: 'positive' | 'negative' | 'neutral';
    category: string; // e.g., 'Helping Others', 'Lateness', 'Participation'
    notes: string;
    points?: number; // Gamification tie-in
}

/**
 * Logs a behavior incident and optionally notifies the parent.
 */
export async function logBehavior(incident: BehaviorIncident): Promise<boolean> {
    try {
        const { error } = await api
            .from('behavior_notes')
            .insert({
                student_id: incident.studentId,
                teacher_id: incident.teacherId,
                type: incident.type,
                category: incident.category,
                notes: incident.notes,
                points: incident.points || 0
            });

        if (error) throw error;

        // Automatically push notification to parent for immediate visibility
        const isUrgent = incident.type === 'negative' && incident.category === 'Lateness'; // Example of urgent criteria

        await notifyStudentsAndParents({
            studentIds: [Number(incident.studentId)],
            title: `Behavioral Update: ${incident.type === 'positive' ? 'Great News!' : 'Observation'}`,
            message: `Teacher ${incident.teacherId} logged: "${incident.notes}" in ${incident.category}.`,
            isUrgent: isUrgent // Triggers SMS fallback if urgent
        });

        return true;
    } catch (error) {
        console.error('❌ Failed to log behavior:', error);
        return false;
    }
}

