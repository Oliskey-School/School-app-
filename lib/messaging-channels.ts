/**
 * Messaging Channels Service
 * Handles channel creation, message posting, and read receipts
 */

import { supabase } from './supabase';

export interface MessagingChannel {
    id: string;
    name: string;
    description: string;
    type: 'class' | 'school' | 'grade' | 'department' | 'custom';
    class_id?: string;
    grade?: string;
    school_id?: number;
    created_by: string;
    is_active: boolean;
    created_at: string;
}

export interface ChannelMessage {
    id: string;
    channel_id: string;
    sender_id: string;
    content: string;
    message_type: 'text' | 'announcement' | 'alert' | 'poll';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    attachments?: any;
    is_pinned: boolean;
    created_at: string;
    sender?: {
        full_name: string;
        role: string;
        avatar_url?: string;
    };
    read_by?: number;
    total_members?: number;
}

/**
 * Create a new messaging channel
 */
export async function createChannel(params: {
    name: string;
    description?: string;
    type: string;
    class_id?: string;
    grade?: string;
}): Promise<MessagingChannel | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('messaging_channels')
            .insert({
                ...params,
                created_by: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Create channel error:', error);
        return null;
    }
}

/**
 * Get all channels for current user
 */
export async function getUserChannels(): Promise<MessagingChannel[]> {
    try {
        const { data, error } = await supabase
            .from('messaging_channels')
            .select(`
        *,
        channel_members!inner(user_id)
      `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get channels error:', error);
        return [];
    }
}

/**
 * Post message to channel
 */
export async function postChannelMessage(params: {
    channel_id: string;
    content: string;
    message_type?: string;
    priority?: string;
    notify?: boolean;
}): Promise<ChannelMessage | null> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('channel_messages')
            .insert({
                channel_id: params.channel_id,
                sender_id: user.id,
                content: params.content,
                message_type: params.message_type || 'text',
                priority: params.priority || 'normal'
            })
            .select()
            .single();

        if (error) throw error;

        // Send notifications if requested
        if (params.notify && (params.priority === 'high' || params.priority === 'urgent')) {
            await notifyChannelMembers(params.channel_id, data.id, params.content);
        }

        return data;
    } catch (error) {
        console.error('Post message error:', error);
        return null;
    }
}

/**
 * Get messages for a channel
 */
export async function getChannelMessages(
    channel_id: string,
    limit: number = 50
): Promise<ChannelMessage[]> {
    try {
        const { data, error } = await supabase
            .from('channel_messages')
            .select(`
        *,
        sender:sender_id (
          full_name,
          role,
          avatar_url
        ),
        message_read_receipts(count)
      `)
            .eq('channel_id', channel_id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get messages error:', error);
        return [];
    }
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(message_id: string): Promise<boolean> {
    try {
        const { error } = await supabase.rpc('mark_message_read', {
            msg_id: message_id
        });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Mark read error:', error);
        return false;
    }
}

/**
 * Get read receipts for a message
 */
export async function getMessageReadReceipts(message_id: string) {
    try {
        const { data, error } = await supabase
            .from('message_read_receipts')
            .select(`
        *,
        user:user_id (
          full_name,
          role,
          avatar_url
        )
      `)
            .eq('message_id', message_id)
            .order('read_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get read receipts error:', error);
        return [];
    }
}

/**
 * Get delivery status for a message
 */
export async function getMessageDeliveryStatus(message_id: string) {
    try {
        const { data, error } = await supabase
            .from('message_delivery')
            .select('*')
            .eq('message_id', message_id);

        if (error) throw error;

        const stats = {
            total: data.length,
            sent: data.filter(d => d.status === 'sent' || d.status === 'delivered').length,
            delivered: data.filter(d => d.status === 'delivered').length,
            failed: data.filter(d => d.status === 'failed').length,
            by_channel: {
                push: data.filter(d => d.channel === 'push').length,
                sms: data.filter(d => d.channel === 'sms').length,
                email: data.filter(d => d.channel === 'email').length
            }
        };

        return stats;
    } catch (error) {
        console.error('Get delivery status error:', error);
        return null;
    }
}

/**
 * Notify channel members (via Edge Function)
 */
async function notifyChannelMembers(
    channel_id: string,
    message_id: string,
    content: string
): Promise<void> {
    try {
        // Get channel members
        const { data: members } = await supabase
            .from('channel_members')
            .select('user_id')
            .eq('channel_id', channel_id);

        if (!members || members.length === 0) return;

        const userIds = members.map(m => m.user_id);

        // Send notification via Edge Function
        await supabase.functions.invoke('send-notification', {
            body: {
                userIds,
                title: 'New Channel Message',
                body: content.substring(0, 100),
                urgency: 'normal',
                channel: 'push',
                url: `/messages?channel=${channel_id}`
            }
        });
    } catch (error) {
        console.error('Notify members error:', error);
    }
}

/**
 * Subscribe to realtime channel messages
 */
export function subscribeToChannel(
    channel_id: string,
    callback: (message: ChannelMessage) => void
) {
    const channel = supabase
        .channel(`channel-${channel_id}`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'channel_messages',
                filter: `channel_id=eq.${channel_id}`
            },
            (payload) => {
                callback(payload.new as ChannelMessage);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
