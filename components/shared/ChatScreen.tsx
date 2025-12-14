
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatRoom } from '../../types';
import { supabase } from '../../lib/supabase';
import { SendIcon, PaperclipIcon, HappyIcon, DotsVerticalIcon } from '../../constants';

interface ChatScreenProps {
    conversationId?: number; // Provided by new logic
    conversation?: any; // Legacy specific mock object support (deprecated)
    roomDetails?: any; // Passed from navigation
    currentUserId: number;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ conversationId, conversation, roomDetails, currentUserId }) => {
    // If conversationId is missing but conversation object exists, try to fallback (mock data scenario), else use ID.
    // In our new flow, conversationId is passed.
    const roomId = conversationId || (conversation?.id ? parseInt(conversation.id) : null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Initial Fetch
    useEffect(() => {
        if (!roomId) return;

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('chat_messages')
                .select(`
                    *,
                    sender:users!sender_id (id, name, avatar_url, role)
                `)
                .eq('room_id', roomId)
                .order('created_at', { ascending: true });

            if (data) {
                // Map DB columns to frontend type if necessary, though we aligned types closely
                const mappedMessages = data.map((msg: any) => ({
                    id: msg.id,
                    roomId: msg.room_id,
                    senderId: msg.sender_id,
                    content: msg.content,
                    type: msg.type,
                    mediaUrl: msg.media_url,
                    fileName: msg.file_name,
                    fileSize: msg.file_size,
                    replyToId: msg.reply_to_id,
                    isDeleted: msg.is_deleted,
                    isEdited: msg.is_edited,
                    createdAt: msg.created_at,
                    updatedAt: msg.updated_at,
                    sender: msg.sender ? {
                        id: msg.sender.id,
                        name: msg.sender.name,
                        avatarUrl: msg.sender.avatar_url,
                        role: msg.sender.role || 'Member'
                    } : undefined
                }));
                setMessages(mappedMessages);
            }
            setLoading(false);
        };

        fetchMessages();
    }, [roomId]);

    // Real-time Subscription
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`room:${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `room_id=eq.${roomId}`
            }, async (payload) => {
                const newMsg = payload.new;
                // Fetch sender info for the new message
                const { data: userData } = await supabase
                    .from('users')
                    .select('id, name, avatar_url, role')
                    .eq('id', newMsg.sender_id)
                    .single();

                const formattedMsg: ChatMessage = {
                    id: newMsg.id,
                    roomId: newMsg.room_id,
                    senderId: newMsg.sender_id,
                    content: newMsg.content,
                    type: newMsg.type,
                    mediaUrl: newMsg.media_url,
                    fileName: newMsg.file_name,
                    fileSize: newMsg.file_size,
                    replyToId: newMsg.reply_to_id,
                    isDeleted: newMsg.is_deleted,
                    isEdited: newMsg.is_edited,
                    createdAt: newMsg.created_at,
                    updatedAt: newMsg.updated_at,
                    sender: userData ? {
                        id: userData.id,
                        name: userData.name,
                        avatarUrl: userData.avatar_url,
                        role: userData.role || 'Member'
                    } : undefined
                };

                setMessages(prev => [...prev, formattedMsg]);
            })
            .on('broadcast', { event: 'typing' }, (payload) => {
                if (payload.payload.userId !== currentUserId) {
                    setTypingUsers(prev => {
                        const newSet = new Set(prev);
                        if (payload.payload.isTyping) {
                            newSet.add(payload.payload.userId);
                        } else {
                            newSet.delete(payload.payload.userId);
                        }
                        return newSet;
                    });
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, currentUserId]);

    // Auto-scroll and Mark as Read
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });

        const markAsRead = async () => {
            if (messages.length > 0 && roomId) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg.id) {
                    await supabase
                        .from('chat_participants')
                        .update({ last_read_message_id: lastMsg.id })
                        .eq('room_id', roomId)
                        .eq('user_id', currentUserId);
                }
            }
        };

        markAsRead();
    }, [messages, roomId, currentUserId, typingUsers]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim() === '' || !roomId) return;

        const textToSend = inputText.trim();
        setInputText(''); // Optimistic clear

        // 1. Insert into DB
        const { error } = await supabase
            .from('chat_messages')
            .insert({
                room_id: roomId,
                sender_id: currentUserId,
                content: textToSend,
                type: 'text'
            });

        if (error) {
            console.error('Error sending message:', error);
            // Ideally show toast
            setInputText(textToSend); // Revert on failure
            return;
        }

        // 2. Update room's last_message_at
        await supabase
            .from('chat_rooms')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', roomId);

        // Stop typing
        handleTyping(false);
    };

    const handleTyping = async (isTypingNow: boolean) => {
        if (!roomId) return;

        await supabase.channel(`room:${roomId}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { userId: currentUserId, isTyping: isTypingNow }
        });
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputText(e.target.value);

        if (!isTyping) {
            setIsTyping(true);
            handleTyping(true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            handleTyping(false);
        }, 2000);
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center text-gray-500">Loading conversation...</div>;
    }

    if (!roomId) {
        return <div className="h-full flex items-center justify-center text-gray-500">Select a conversation to start chatting</div>;
    }

    return (
        <div className="flex flex-col h-full w-full relative bg-[#efeae2]">
            {/* Messages Area */}
            <div className="flex-grow p-4 space-y-2 overflow-y-auto custom-scrollbar">
                {messages.map((msg, index) => {
                    const isCurrentUser = msg.senderId === currentUserId;
                    // Check if previous message was same sender to group visually
                    const isSequence = index > 0 && messages[index - 1].senderId === msg.senderId;

                    return (
                        <div key={msg.id || index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-3'}`}>
                            {!isCurrentUser && !isSequence && (
                                <div className="w-8 h-8 mr-2 rounded-full bg-gray-300 overflow-hidden flex-shrink-0 self-end mb-1">
                                    {msg.sender?.avatarUrl && <img src={msg.sender.avatarUrl} className="w-full h-full object-cover" />}
                                </div>
                            )}
                            {!isCurrentUser && isSequence && <div className="w-8 mr-2 flex-shrink-0" />}

                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 shadow-sm relative group ${isCurrentUser
                                ? 'bg-[#d9fdd3] rounded-l-xl rounded-tr-xl rounded-br-xl'
                                : 'bg-white rounded-r-xl rounded-tl-xl rounded-bl-xl'
                                }`}>
                                {!isCurrentUser && !isSequence && msg.sender?.name && (
                                    <p className="text-xs font-bold text-orange-600 mb-1">{msg.sender.name}</p>
                                )}

                                {msg.type === 'text' && (
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                )}

                                <div className="flex justify-end items-center gap-1 mt-1">
                                    <span className="text-[10px] text-gray-500 leading-none">
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {typingUsers.size > 0 && (
                    <div className="flex items-center space-x-2 ml-12 mt-2">
                        <div className="flex space-x-1 bg-white p-2 rounded-xl shadow-sm">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                )}

                <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#F0F2F5] border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                    <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                        {/* Placeholder for emojis */}
                        <HappyIcon className="w-6 h-6" />
                    </button>
                    <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                        {/* Placeholder for attachments */}
                        <PaperclipIcon className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={inputText}
                        onChange={onInputChange}
                        placeholder="Type a message"
                        className="flex-grow px-4 py-2 bg-white border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-green-400 focus:border-green-400 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className={`p-3 rounded-full text-white transition-all transform ${inputText.trim() ? 'bg-green-500 hover:scale-105 active:scale-95' : 'bg-gray-300'}`}
                        aria-label="Send message"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatScreen;
