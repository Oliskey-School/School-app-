import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Conversation } from '../../types';
import ChatScreen from '../shared/ChatScreen';
import { SearchIcon, PlusIcon, DotsVerticalIcon } from '../../constants';
import { THEME_CONFIG } from '../../constants';


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

interface TeacherMessagesScreenProps {
    onSelectChat?: (conversation: Conversation) => void;
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: number | null;
    currentUser?: any;
}

interface LocalConversation {
    id: number;
    participant: {
        id: number;
        name: string;
        avatarUrl: string;
        role: string;
    };
    lastMessage: {
        text: string;
        timestamp: string;
    };
    unreadCount: number;
    messages: any[];
}

const TeacherMessagesScreen: React.FC<TeacherMessagesScreenProps> = ({ navigateTo, onSelectChat, teacherId, currentUser }) => {
    // Determine current user ID logic (fallback to 2 if missing)
    const myId = teacherId || (currentUser?.userId ? parseInt(currentUser.userId) : null) || 2;

    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread'>('All');
    const [conversations, setConversations] = useState<LocalConversation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Get IDs of conversations I am in
            const { data: myParticipations, error: partError } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', myId);

            if (partError) throw partError;
            if (!myParticipations || myParticipations.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const conversationIds = myParticipations.map(p => p.conversation_id);

            // 2. Fetch the conversation metadata (last message, etc.)
            const { data: conversationList, error: convoError } = await supabase
                .from('conversations')
                .select('*')
                .in('id', conversationIds)
                .order('last_message_at', { ascending: false });

            if (convoError) throw convoError;

            // 3. Fetch the OTHER participants for these conversations to get name/avatar
            const { data: otherParticipants, error: otherPartError } = await supabase
                .from('conversation_participants')
                .select(`
                        conversation_id,
                        user:users!user_id (id, name, avatar_url, role)
                    `)
                .in('conversation_id', conversationIds)
                .neq('user_id', myId); // Exclude me

            if (otherPartError) throw otherPartError;

            // 4. Merge Data
            const enrichedConversations: LocalConversation[] = conversationList.map((c: any) => {
                // Find the other participant for this conversation
                const pData = otherParticipants?.find((p: any) => p.conversation_id === c.id);
                // Safely access user, handling potential array return from join
                const userData = (pData as any)?.user;
                const other = Array.isArray(userData) ? userData[0] : userData;

                // Fallback if no other participant (e.g. self chat or formatting error)
                const participantName = other?.name || c.name || 'Unknown User';
                const participantAvatar = other?.avatar_url || '';
                const participantRole = other?.role || 'User';
                const participantId = other?.id || 0;

                return {
                    id: c.id,
                    participant: {
                        id: participantId,
                        name: participantName,
                        avatarUrl: participantAvatar,
                        role: participantRole
                    },
                    lastMessage: {
                        text: c.last_message_text || c.last_message || 'Start a conversation',
                        timestamp: c.last_message_at || new Date().toISOString()
                    },
                    unreadCount: 0, // Need to implement read count logic later
                    messages: []
                };
            });

            setConversations(enrichedConversations);

        } catch (err) {
            console.error("Error fetching conversations:", err);
        } finally {
            setLoading(false);
        }
    }, [myId]);

    useEffect(() => {
        fetchConversations();

        // Realtime Subscription
        const channel = supabase
            .channel('public:conversations')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        fetchConversations();
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new;
                        setConversations(prev => {
                            const exists = prev.find(c => c.id === updated.id);
                            if (exists) {
                                const others = prev.filter(c => c.id !== updated.id);
                                return [{
                                    ...exists,
                                    lastMessage: {
                                        text: updated.last_message_text || exists.lastMessage.text,
                                        timestamp: updated.last_message_at || exists.lastMessage.timestamp
                                    }
                                }, ...others];
                            } else {
                                fetchConversations();
                                return prev;
                            }
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchConversations]);


    // Map for UI consistency
    const rooms = useMemo(() => {
        return conversations.map(c => ({
            id: typeof c.id === 'string' && !isNaN(Number(c.id)) ? Number(c.id) : c.id, // Ensure consistent ID type (number preferred for ChatScreen)
            displayName: c.participant.name,
            displayAvatar: c.participant.avatarUrl,
            lastMessage: {
                content: c.lastMessage.text,
                created_at: c.lastMessage.timestamp,
                sender_id: 0 // Not strictly needed for list view
            },
            unreadCount: c.unreadCount,
            is_group: false
        }));
    }, [conversations]);

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [selectedConversation, setSelectedConversation] = useState<any | null>(null);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const filteredConversations = useMemo(() => {
        return rooms
            .filter(convo => {
                const nameMatch = convo.displayName.toLowerCase().includes(searchTerm.toLowerCase());
                if (!nameMatch) return false;

                if (activeFilter === 'Unread') {
                    return convo.unreadCount > 0;
                }
                return true;
            });
    }, [searchTerm, activeFilter, rooms]);

    const handleChatClick = (convo: any) => {
        const originalConvo = conversations.find(c => (c.id).toString() === (convo.id).toString());

        if (onSelectChat && originalConvo) {
            onSelectChat(originalConvo);
            setSelectedConversation(convo);
            return;
        }

        if (isDesktop && originalConvo) {
            setSelectedConversation(convo);
        } else {
            navigateTo('chat', convo.displayName, {
                conversationId: Number(convo.id), // Ensure it's passed as ID for new ChatScreen logic
                roomDetails: {
                    displayName: convo.displayName,
                    displayAvatar: convo.displayAvatar
                }
            });
        }
    };

    return (
        <div className="flex h-full bg-white border-r border-gray-200 overflow-hidden">
            {/* Sidebar / List */}
            <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${isDesktop && !onSelectChat ? 'w-2/5 max-w-sm' : 'w-full'}`}>
                <header className="p-4 bg-gray-50/50 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Messages</h1>
                        <div className="flex items-center space-x-1">
                            <button onClick={() => navigateTo('newChat', 'New Message', {})} className="p-2 rounded-full hover:bg-purple-100 text-purple-600 transition-colors" title="New Message">
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
                            className="w-full pl-9 pr-4 py-2 text-sm text-gray-700 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all outline-none placeholder-gray-400"
                        />
                    </div>

                    <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                        {(['All', 'Unread', 'Groups'] as const).map(filter => (
                            <button key={filter} onClick={() => setActiveFilter(filter as 'All' | 'Unread')}
                                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${activeFilter === filter
                                    ? 'bg-gray-800 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}>
                                {filter}
                            </button>
                        ))}
                    </div>
                </header>

                <main className="flex-grow overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading chats...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <SearchIcon className="w-6 h-6 text-gray-300" />
                            </div>
                            <p>No conversations found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredConversations.map(room => {
                                const ts = room.lastMessage?.created_at;
                                const hasUnread = room.unreadCount > 0;
                                const isSelected = isDesktop && selectedConversation?.id === room.id;
                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => handleChatClick(room)}
                                        className={`w-full text-left px-4 py-3 flex items-center space-x-4 transition-all hover:bg-gray-50 active:bg-gray-100 ${isSelected ? 'bg-purple-50/60 border-l-4 border-purple-500' : 'border-l-4 border-transparent'}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            {room.displayAvatar ? (
                                                <img src={room.displayAvatar} alt={room.displayName} className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center border border-gray-100 shadow-sm text-indigo-500 font-bold">
                                                    {room.displayName.charAt(0)}
                                                </div>
                                            )}
                                            {room.is_group && (
                                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                    <div className="bg-indigo-100 rounded-full p-1">
                                                        <SearchIcon className="w-2 h-2 text-indigo-500" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h4 className={`font-bold truncate text-sm text-gray-900 ${hasUnread ? '' : ''}`}>{room.displayName}</h4>
                                                <span className={`text-[10px] flex-shrink-0 ml-2 font-medium ${hasUnread ? 'text-purple-600' : 'text-gray-400'}`}>
                                                    {formatTimestamp(ts)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs truncate pr-2 ${hasUnread ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                                    {room.lastMessage.content}
                                                </p>
                                                {hasUnread && (
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 shadow-sm shadow-purple-200"></div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* Desktop Detail View */}
            {isDesktop && !onSelectChat && (
                <div className="flex-grow h-full bg-gray-50 hidden md:block">
                    {selectedConversation ? (
                        <div className="h-full">
                            <ChatScreen
                                currentUserId={myId}
                                conversationId={selectedConversation.id}
                                roomDetails={rooms.find(r => r.id === selectedConversation.id)}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50/50">
                            <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mb-6">
                                <SearchIcon className="w-10 h-10 text-purple-300" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a conversation</h2>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherMessagesScreen;