import React, { useState, useMemo, useEffect } from 'react';
import { Conversation } from '../../types';
import ChatScreen from '../shared/ChatScreen';
import { SearchIcon, PlusIcon, MessagesIcon } from '../../constants';
import { supabase } from '../../lib/supabase';

const formatTimestamp = (isoDate: string): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    if (date >= startOfToday) {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (date >= startOfYesterday) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-GB');
    }
};

interface AdminMessagesScreenProps {
    onSelectChat: (conversation: Conversation) => void;
    onNewChat?: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
    currentUserId?: string;
}

const AdminMessagesScreen: React.FC<AdminMessagesScreenProps> = ({ onSelectChat, onNewChat, navigateTo, currentUserId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Groups' | 'Favourites'>('All');

    // Real Data State
    const [rooms, setRooms] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 1. Fetch Conversations
    useEffect(() => {
        if (currentUserId === undefined || currentUserId === null) return;

        const fetchConversations = async () => {
            setIsLoading(true);
            try {
                // Get IDs of conversations I'm in
                const { data: participation, error: pError } = await supabase
                    .from('conversation_participants')
                    .select('conversation_id')
                    .eq('user_id', currentUserId);

                if (pError) throw pError;

                const conversationIds = participation?.map(p => p.conversation_id) || [];

                if (conversationIds.length === 0) {
                    setRooms([]);
                    setIsLoading(false);
                    return;
                }

                // Fetch conversations details + participants to find the "other" person
                const { data: convs, error: cError } = await supabase
                    .from('conversations')
                    .select(`
                        *,
                        participants:conversation_participants(
                            user:users(id, name, avatar_url, role)
                        )
                    `)
                    .in('id', conversationIds)
                    .order('last_message_at', { ascending: false });

                if (cError) throw cError;

                // Format for UI
                const formattedRooms = convs?.map(c => {
                    // Find other participant for DM name/avatar
                    const otherPart = c.participants?.find((p: any) => p.user?.id !== currentUserId)?.user;
                    // Or if self-chat or fallback
                    const displayUser = otherPart || c.participants?.[0]?.user;

                    return {
                        id: c.id,
                        displayName: c.name || displayUser?.name || 'Unknown',
                        displayAvatar: c.name ? null : (displayUser?.avatar_url || 'https://via.placeholder.com/40'), // Group avatar logic if needed
                        lastMessage: {
                            content: c.last_message_text || 'No messages yet',
                            created_at: c.last_message_at || c.created_at,
                            // sender_id not easily available without fetching messages, but harmless for list preview usually
                        },
                        unreadCount: 0, // Simplified for now
                        updated_at: c.last_message_at || c.created_at,
                        is_group: c.type === 'group'
                    };
                }) || [];

                setRooms(formattedRooms);
            } catch (err) {
                console.error("Error fetching conversations:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversations();

        // 2. Realtime Subscriptions
        const channel = supabase.channel(`admin_chat_list_${currentUserId}`)
            // Listen for new messages (updates conversation last_message)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
                // Re-fetch or optimistically update. Re-fetch is safer for order changes.
                fetchConversations();
            })
            // Listen for new conversations (inserts into participants)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${currentUserId}` }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId]);


    const filteredConversations = useMemo(() => {
        return rooms
            .filter(convo => {
                const nameMatch = convo.displayName.toLowerCase().includes(searchTerm.toLowerCase());
                if (!nameMatch) return false;

                if (activeFilter === 'Unread') {
                    return convo.unreadCount > 0;
                }
                return true;
            })
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }, [searchTerm, activeFilter, rooms]);

    const handleChatClick = (convo: any) => {
        if (onSelectChat) {
            const conversationObj: Conversation = {
                id: convo.id,
                participants: [],
                type: convo.is_group ? 'group' : 'direct',
                isGroup: convo.is_group,
                creatorId: 0,
                createdAt: convo.updated_at,
                updatedAt: convo.updated_at,
                lastMessageAt: convo.updated_at,
                unreadCount: convo.unreadCount
            };
            onSelectChat(conversationObj);
            setSelectedConversation(convo);
            return;
        }

        if (isDesktop) {
            setSelectedConversation(convo);
        } else {
            navigateTo?.('chat', convo.displayName, {
                conversationId: convo.id,
                participantName: convo.displayName,
                participantAvatar: convo.displayAvatar
            });
        }
    };

    return (
        <div className="flex h-full bg-white border-r border-gray-200 overflow-hidden">
            <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${isDesktop && !onSelectChat ? 'w-2/5 max-w-sm' : 'w-full'}`}>
                <header className="p-4 bg-gray-50/50 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Messages</h1>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={onNewChat}
                                className="p-2 rounded-full hover:bg-indigo-100 text-indigo-600 transition-colors"
                                title="New Message">
                                <PlusIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="relative mb-4">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="text-gray-400 w-4 h-4" />
                        </span>
                        <input
                            type="search"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm text-gray-700 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all outline-none placeholder-gray-400"
                        />
                    </div>
                </header>

                <main className="flex-grow flex flex-col overflow-y-auto custom-scrollbar pb-32 lg:pb-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-400">Loading chats...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex-grow p-8 text-center bg-gray-50/30 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                <MessagesIcon className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No conversations found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredConversations.map(room => {
                                const ts = room.updated_at;
                                const isSelected = isDesktop && selectedConversation?.id === room.id;

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => handleChatClick(room)}
                                        className={`w-full text-left px-4 py-3 flex items-center space-x-4 transition-all hover:bg-gray-50 active:bg-gray-100 ${isSelected ? 'bg-indigo-50/60 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            {room.displayAvatar ? (
                                                <img src={room.displayAvatar} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 border border-gray-100 shadow-sm">
                                                    <span className="font-bold">{room.displayName.charAt(0)}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h4 className={`font-bold truncate text-sm text-gray-900`}>{room.displayName}</h4>
                                                <span className={`text-[10px] flex-shrink-0 ml-2 font-medium text-gray-400`}>
                                                    {formatTimestamp(ts)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs truncate pr-2 text-gray-500`}>
                                                    {room.lastMessage?.content || 'Started a conversation'}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* Desktop Only: Chat Area */}
            {isDesktop && !onSelectChat && (
                <div className="flex-grow h-full bg-gray-50 hidden md:block">
                    {selectedConversation ? (
                        <div className="h-full">
                            <ChatScreen
                                currentUserId={currentUserId}
                                conversationId={selectedConversation.id}
                                roomDetails={rooms.find(r => r.id === selectedConversation.id)}
                                themeColor="indigo"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50/50">
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a conversation</h2>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminMessagesScreen;