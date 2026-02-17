import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { ChatMessage } from '../../types';

export interface UseMessagesResult {
    messages: ChatMessage[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    sendMessage: (message: Partial<ChatMessage>) => Promise<ChatMessage | null>;
}

export function useMessages(conversationId: string | number): UseMessagesResult {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!conversationId) {
            setMessages([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            const transformedMessages: ChatMessage[] = (data || []).map(transformSupabaseMessage);

            setMessages(transformedMessages);
            setError(null);
        } catch (err) {
            console.error('Error fetching messages:', err);
            setError(err as Error);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    useEffect(() => {
        fetchMessages();

        if (!conversationId) return;

        const channel = supabase
            .channel(`messages-room-${conversationId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
                (payload) => {
                    console.log('Message change detected:', payload);
                    fetchMessages();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchMessages, conversationId]);

    const sendMessage = async (messageData: Partial<ChatMessage>): Promise<ChatMessage | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('messages')
                .insert([{
                    conversation_id: conversationId,
                    sender_id: messageData.senderId,
                    content: messageData.content,
                    type: messageData.type,
                    media_url: messageData.mediaUrl,
                    file_name: messageData.fileName,
                    file_size: messageData.fileSize,
                    reply_to_id: messageData.replyToId,
                    school_id: messageData.schoolId // Ensure school_id is passed for multi-tenancy
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseMessage(data);
        } catch (err) {
            console.error('Error sending message:', err);
            setError(err as Error);
            return null;
        }
    };

    return {
        messages,
        loading,
        error,
        refetch: fetchMessages,
        sendMessage,
    };
}

const transformSupabaseMessage = (m: any): ChatMessage => ({
    id: m.id,
    roomId: m.room_id,
    senderId: m.sender_id,
    content: m.content,
    type: m.type,
    mediaUrl: m.media_url,
    fileName: m.file_name,
    fileSize: m.file_size,
    replyToId: m.reply_to_id,
    isDeleted: m.is_deleted,
    isEdited: m.is_edited,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
});
