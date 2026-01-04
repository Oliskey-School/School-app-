
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types';
import { supabase } from '../../lib/supabase';
import { SendIcon, PaperclipIcon, HappyIcon, DotsVerticalIcon } from '../../constants';

interface ChatScreenProps {
    conversationId?: number;
    conversation?: any;
    roomDetails?: any;
    themeColor?: 'indigo' | 'orange' | 'purple' | 'green' | 'blue';
    hideHeader?: boolean;
    currentUserId?: number;
}

const THEME_STYLES = {
    indigo: {
        primary: 'bg-indigo-600',
        secondary: 'bg-indigo-50',
        text: 'text-indigo-600',
        border: 'border-indigo-100',
        ring: 'focus-within:ring-indigo-100',
        userBubble: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white',
        otherBubble: 'bg-white text-gray-800',
        sendButton: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
        timestampUser: 'text-indigo-100',
        timestampOther: 'text-gray-400',
        senderName: 'text-indigo-600',
        icon: 'text-indigo-400'
    },
    orange: {
        primary: 'bg-orange-500',
        secondary: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-100',
        ring: 'focus-within:ring-orange-100',
        userBubble: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white',
        otherBubble: 'bg-white text-gray-800',
        sendButton: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200',
        timestampUser: 'text-orange-100',
        timestampOther: 'text-gray-400',
        senderName: 'text-orange-600',
        icon: 'text-orange-400'
    },
    purple: {
        primary: 'bg-purple-600',
        secondary: 'bg-purple-50',
        text: 'text-purple-600',
        border: 'border-purple-100',
        ring: 'focus-within:ring-purple-100',
        userBubble: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
        otherBubble: 'bg-white text-gray-800',
        sendButton: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200',
        timestampUser: 'text-purple-100',
        timestampOther: 'text-gray-400',
        senderName: 'text-purple-600',
        icon: 'text-purple-400'
    },
    green: {
        primary: 'bg-green-600',
        secondary: 'bg-green-50',
        text: 'text-green-600',
        border: 'border-green-100',
        ring: 'focus-within:ring-green-100',
        userBubble: 'bg-gradient-to-br from-green-500 to-green-600 text-white',
        otherBubble: 'bg-white text-gray-800',
        sendButton: 'bg-green-600 hover:bg-green-700 shadow-green-200',
        timestampUser: 'text-green-100',
        timestampOther: 'text-gray-400',
        senderName: 'text-green-600',
        icon: 'text-green-400'
    },
    blue: {
        primary: 'bg-blue-600',
        secondary: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-100',
        ring: 'focus-within:ring-blue-100',
        userBubble: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
        otherBubble: 'bg-white text-gray-800',
        sendButton: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
        timestampUser: 'text-blue-100',
        timestampOther: 'text-gray-400',
        senderName: 'text-blue-600',
        icon: 'text-blue-400'
    }
};

const ChatScreen: React.FC<ChatScreenProps> = ({ conversationId, conversation, roomDetails, currentUserId, themeColor = 'orange', hideHeader = false }) => {
    const roomId = conversationId || (conversation?.id ? parseInt(conversation.id.replace('conv-', '')) : null) || (conversation?.id ? parseInt(conversation.id) : null);

    const theme = THEME_STYLES[themeColor] || THEME_STYLES.orange;

    // Fallback: if we still don't have a numeric roomId but have a conversation object with an ID that might be the numeric one.
    // If conversation.id is 'conv-123', we parse it. If it is 123 (number), we use it.

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
                .from('messages')
                .select(`
                    *,
                    sender:users!sender_id (id, name, avatar_url, role)
                `)
                .eq('conversation_id', roomId)
                .order('created_at', { ascending: true });

            if (data) {
                const mappedMessages = data.map((msg: any) => ({
                    id: msg.id,
                    roomId: msg.conversation_id, // Map DB 'conversation_id' to frontend 'roomId'
                    senderId: msg.sender_id,
                    content: msg.content,
                    type: msg.type,
                    mediaUrl: msg.media_url,
                    createdAt: msg.created_at,
                    updatedAt: msg.created_at, // Use created_at as fallback
                    isDeleted: false,
                    isEdited: false,
                    sender: msg.sender ? {
                        id: msg.sender.id,
                        name: msg.sender.name,
                        avatarUrl: msg.sender.avatar_url,
                        role: msg.sender.role || 'Member'
                    } : undefined
                }));
                // Limit to last 50 messages for performance and "load more" later
                setMessages(mappedMessages);
            }
            setLoading(false);
        };

        fetchMessages();
    }, [roomId]);

    // Real-time Subscription
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`conversation:${roomId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${roomId}`
            }, async (payload) => {
                const newMsg = payload.new;
                // Fetch sender info 
                const { data: userData } = await supabase
                    .from('users')
                    .select('id, name, avatar_url, role')
                    .eq('id', newMsg.sender_id)
                    .single();

                const formattedMsg: ChatMessage = {
                    id: newMsg.id,
                    roomId: newMsg.conversation_id,
                    senderId: newMsg.sender_id,
                    content: newMsg.content,
                    type: newMsg.type,
                    mediaUrl: newMsg.media_url,
                    createdAt: newMsg.created_at,
                    updatedAt: newMsg.created_at,
                    isDeleted: false,
                    isEdited: false,
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

    // Auto-scroll 
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, roomId, typingUsers]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim() === '' || !roomId) return;

        const textToSend = inputText.trim();
        setInputText('');

        // 1. Insert into DB (messages)
        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: roomId,
                sender_id: currentUserId,
                content: textToSend,
                type: 'text'
            });

        if (error) {
            console.error('Error sending message:', error);
            setInputText(textToSend);
            return;
        }

        // 2. Update conversation's last_message_at
        await supabase
            .from('conversations')
            .update({
                last_message_at: new Date().toISOString(),
                last_message_text: textToSend
            })
            .eq('id', roomId);

        handleTyping(false);
    };

    const handleTyping = async (isTypingNow: boolean) => {
        if (!roomId) return;
        await supabase.channel(`conversation:${roomId}`).send({
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
        return <div className="h-full flex items-center justify-center text-gray-400 bg-slate-50">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full mb-3"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
        </div>;
    }

    if (!roomId) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50">
                <div className={`w-24 h-24 ${theme.secondary} rounded-full flex items-center justify-center mb-6 ring-4 ring-white shadow-sm`}>
                    <SendIcon className={`w-10 h-10 ${theme.icon}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Your Messages</h3>
                <p className="text-gray-500 max-w-xs">Select a conversation to begin.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full relative bg-slate-50">
            {/* Header */}
            {!hideHeader && (
                <div className="bg-white/80 backdrop-blur-md p-3 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                    <div className="flex items-center space-x-3">
                        {roomDetails?.displayAvatar ? (
                            <div className="relative">
                                <img src={roomDetails.displayAvatar} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" alt="" />
                                {/* Online status indicator could go here */}
                            </div>
                        ) : (
                            <div className={`w-10 h-10 rounded-full ${theme.secondary} flex items-center justify-center border-2 border-white shadow-sm`}>
                                <span className={`font-bold ${theme.text}`}>{roomDetails?.displayName?.charAt(0)}</span>
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-gray-800 leading-tight">{roomDetails?.displayName || 'Chat'}</h3>
                            {typingUsers.size > 0 && (
                                <p className={`text-xs ${theme.text} animate-pulse`}>typing...</p>
                            )}
                        </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <DotsVerticalIcon />
                    </button>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-grow p-4 space-y-3 overflow-y-auto custom-scrollbar">
                {messages.map((msg, index) => {
                    const isCurrentUser = msg.senderId === currentUserId;
                    const isSequence = index > 0 && messages[index - 1].senderId === msg.senderId;

                    return (
                        <div key={msg.id || index} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-4'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            {!isCurrentUser && !isSequence && (
                                <div className="w-8 h-8 mr-2 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 self-end mb-1 shadow-sm ring-2 ring-white">
                                    {msg.sender?.avatarUrl ? (
                                        <img src={msg.sender.avatarUrl} className="w-full h-full object-cover" alt={msg.sender.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">?</div>
                                    )}
                                </div>
                            )}
                            {!isCurrentUser && isSequence && <div className="w-8 mr-2 flex-shrink-0" />}

                            <div className={`max-w-[75%] md:max-w-[60%] px-4 py-3 shadow-sm relative text-[15px] ${isCurrentUser
                                ? `${theme.userBubble} rounded-2xl rounded-tr-sm`
                                : `${theme.otherBubble} rounded-2xl rounded-tl-sm border border-gray-100/50`
                                }`}>

                                {!isCurrentUser && !isSequence && msg.sender?.name && (
                                    <p className={`text-[11px] font-bold ${theme.senderName} mb-1 opacity-90`}>{msg.sender.name}</p>
                                )}

                                {msg.type === 'text' && (
                                    <p className="whitespace-pre-wrap break-words leading-relaxed tracking-wide">{msg.content}</p>
                                )}

                                <div className={`flex items-end gap-1 mt-1 ${isCurrentUser ? `justify-end ${theme.timestampUser} opacity-80` : `justify-end ${theme.timestampOther}`}`}>
                                    <span className="text-[10px] leading-none font-medium">
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={endOfMessagesRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                <form onSubmit={handleSendMessage} className="flex items-end space-x-3 max-w-5xl mx-auto">
                    <div className={`flex-grow bg-gray-50 rounded-2xl flex items-center px-4 py-3 transition-all border border-transparent ${theme.ring} focus-within:bg-white focus-within:shadow-sm ring-1 ring-gray-100`}>
                        <input
                            type="text"
                            value={inputText}
                            onChange={onInputChange}
                            placeholder="Type a message..."
                            className="flex-grow bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 h-full py-0 text-base outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className={`p-3.5 rounded-full shadow-lg text-white transition-all transform duration-200 ${inputText.trim()
                            ? `${theme.sendButton} hover:scale-105 active:scale-95`
                            : 'bg-gray-200 cursor-not-allowed'
                            }`}
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatScreen;
