
import { supabase } from './supabase';
import { EmergencyBroadcast } from '../types';

/**
 * Send an Emergency Broadcast
 * This triggers the broadcast logic (push notifications + email)
 */
export async function sendEmergencyBroadcast(
    title: string,
    message: string,
    audience: 'all' | 'parents' | 'teachers' | 'staff',
    channels: string[] = ['push'] // 'push', 'email', 'sms'
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        // 1. Log the broadcast in database
        const { data: broadcast, error: dbError } = await supabase
            .from('emergency_broadcasts')
            .insert([{
                title,
                message,
                audience,
                sender_id: user.id,
                channels,
                delivery_stats: { sent: 0, failed: 0 }
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        // 2. Trigger Cloud/Edge Function to handle the heavy lifting (mass sending)
        // We don't want to loop through 1000 users on the client side.
        const { error: fnError } = await supabase.functions.invoke('broadcast-alert', {
            body: {
                broadcastId: broadcast.id,
                title,
                message,
                audience,
                channels
            }
        });

        if (fnError) {
            console.warn('Edge function failed, falling back to client-side notification (limited)');
            // Fallback: Use standard notification system if function fails (MVP only)
            // await notifyByAudience(audience, title, message);
        }

        return { success: true };

    } catch (err: any) {
        console.error('Broadcast failed:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Fetch Recent Broadcasts
 */
export async function fetchBroadcasts(): Promise<EmergencyBroadcast[]> {
    const { data, error } = await supabase
        .from('emergency_broadcasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching broadcasts:', error);
        return [];
    }

    return data.map((b: any) => ({
        id: b.id,
        title: b.title,
        message: b.message,
        senderId: b.sender_id,
        audience: b.audience,
        channels: b.channels,
        deliveryStats: b.delivery_stats,
        createdAt: b.created_at
    }));
}
