import { useRealtimeQuery } from './useRealtimeQuery';

/**
 * Real-time hook for messages in a conversation
 * Provides instant message delivery and read receipts
 */
export function useRealtimeMessages(conversationId: string, onNewMessage?: (message: any) => void) {
    return useRealtimeQuery({
        table: 'messages',
        select: '*, sender:users(id, name, avatar_url)',
        filter: (query) => query.eq('conversation_id', conversationId),
        orderBy: { column: 'created_at', ascending: true },
        onInsert: (message) => {
            // Trigger notification sound or visual indicator
            onNewMessage?.(message);
        }
    });
}

/**
 * Real-time hook for user's conversations
 */
export function useRealtimeConversations(userId: string) {
    return useRealtimeQuery({
        table: 'conversation_participants',
        select: 'conversation_id, conversations(*, last_message:messages(content, created_at))',
        filter: (query) => query.eq('user_id', userId),
        orderBy: { column: 'updated_at', ascending: false }
    });
}
