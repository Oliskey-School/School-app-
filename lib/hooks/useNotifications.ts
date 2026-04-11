import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Notification } from '../../types';

export interface UseNotificationsResult {
    notifications: Notification[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createNotification: (notification: Partial<Notification>) => Promise<Notification | null>;
    updateNotification: (id: string | number, updates: Partial<Notification>) => Promise<Notification | null>;
    deleteNotification: (id: string | number) => Promise<boolean>;
}

export function useNotifications(filters?: { userId?: string | number; isRead?: boolean }): UseNotificationsResult {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const transformNotification = (n: any): Notification => ({
        id: n.id,
        userId: n.user_id,
        category: n.category,
        title: n.title,
        summary: n.summary,
        timestamp: n.timestamp,
        isRead: n.is_read,
        audience: n.audience,
        studentId: n.student_id,
        relatedId: n.related_id
    });

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const schoolId = sessionStorage.getItem('school_id') || undefined;
            const data = await api.getNotifications({ ...filters, schoolId });

            const transformedNotifications: Notification[] = (data || []).map(transformNotification);

            setNotifications(transformedNotifications);
            setError(null);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError(err as Error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const createNotification = async (notificationData: Partial<Notification>): Promise<Notification | null> => {
        try {
            const data = await api.createNotification({
                user_id: notificationData.userId,
                category: notificationData.category,
                title: notificationData.title,
                summary: notificationData.summary,
                is_read: notificationData.isRead,
                audience: notificationData.audience,
                student_id: notificationData.studentId,
                related_id: notificationData.relatedId,
                school_id: sessionStorage.getItem('school_id')
            });

            return transformNotification(data);
        } catch (err) {
            console.error('Error creating notification:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateNotification = async (id: string | number, updates: Partial<Notification>): Promise<Notification | null> => {
        try {
            const data = await api.updateNotification(String(id), {
                is_read: updates.isRead,
            });

            return transformNotification(data);
        } catch (err) {
            console.error('Error updating notification:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteNotification = async (id: string | number): Promise<boolean> => {
        try {
            await api.deleteNotification(String(id));
            return true;
        } catch (err) {
            console.error('Error deleting notification:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        notifications,
        loading,
        error,
        refetch: fetchNotifications,
        createNotification,
        updateNotification,
        deleteNotification,
    };
}
