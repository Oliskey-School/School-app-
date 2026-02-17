import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Notification } from '../../types';

export interface UseNotificationsResult {
    notifications: Notification[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createNotification: (notification: Partial<Notification>) => Promise<Notification | null>;
    updateNotification: (id: number, updates: Partial<Notification>) => Promise<Notification | null>;
    deleteNotification: (id: number) => Promise<boolean>;
}

export function useNotifications(filters?: { userId?: number; isRead?: boolean }): UseNotificationsResult {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            let query = supabase.from('notifications').select('*');

            if (filters?.userId) {
                query = query.eq('user_id', filters.userId);
            }
            if (filters?.isRead !== undefined) {
                query = query.eq('is_read', filters.isRead);
            }

            const { data, error: fetchError } = await query.order('timestamp', { ascending: false });

            if (fetchError) throw fetchError;

            const transformedNotifications: Notification[] = (data || []).map(transformSupabaseNotification);

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

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'notifications' },
                (payload) => {
                    console.log('Notification change detected:', payload);
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchNotifications]);

    const createNotification = async (notificationData: Partial<Notification>): Promise<Notification | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('notifications')
                .insert([{
                    user_id: notificationData.userId,
                    category: notificationData.category,
                    title: notificationData.title,
                    summary: notificationData.summary,
                    is_read: notificationData.isRead,
                    audience: notificationData.audience,
                    student_id: notificationData.studentId,
                    related_id: notificationData.relatedId,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseNotification(data);
        } catch (err) {
            console.error('Error creating notification:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateNotification = async (id: number, updates: Partial<Notification>): Promise<Notification | null> => {
        try {
            const { data, error: updateError } = await supabase
                .from('notifications')
                .update({
                    is_read: updates.isRead,
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return transformSupabaseNotification(data);
        } catch (err) {
            console.error('Error updating notification:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteNotification = async (id: number): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

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

const transformSupabaseNotification = (n: any): Notification => ({
    id: n.id,
    userId: n.user_id,
    category: n.category,
    title: n.title,
    summary: n.summary,
    timestamp: n.timestamp,
    isRead: n.is_read,
    audience: n.audience,
    studentId: n.student_id,
    relatedId: n.related_id,
});
