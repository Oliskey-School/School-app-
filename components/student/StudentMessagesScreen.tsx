import React, { useState, useEffect, useMemo } from 'react';
import { ChatRoom, ChatUser, Student } from '../../types';
import { supabase } from '../../lib/supabase';
import { SearchIcon, PlusIcon, DotsVerticalIcon } from '../../constants';

const formatTimestamp = (isoDate: string): string => {
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

interface StudentMessagesScreenProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
    studentId?: string; // Made optional to support MessagingLayout which might need to pass it
    onSelectChat?: (conversation: any) => void;
}

const StudentMessagesScreen: React.FC<StudentMessagesScreenProps> = ({ navigateTo, studentId, onSelectChat }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread'>('All');
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Responsive state
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (studentId === undefined || studentId === null) return;

        const fetchConversations = async () => {
            try {
                // 1. Get IDs of conversations I'm in
                const { data: participation, error: pError } = await supabase
                    .from('conversation_participants')
                    .select('conversation_id, last_read_message_id')
                    .eq('user_id', studentId);

                if (pError) throw pError;

                const conversationIds = participation?.map(p => p.conversation_id) || [];

                if (conversationIds.length === 0) {
                    setRooms([]);
                    setLoading(false);
                    return;
                }

                // 2. Fetch conversations details + participants
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

                // 3. Format for UI
                const formattedRooms = convs?.map(c => {
                    // Find other participant for DM name/avatar
                    const otherPart = c.participants?.find((p: any) => p.user?.id !== studentId)?.user;
                    // Or if self-chat or fallback
                    const displayUser = otherPart || c.participants?.[0]?.user;

                    // Get last read ID
                    const myPart = participation?.find(p => p.conversation_id === c.id);
                    const lastReadId = myPart?.last_read_message_id || 0;

                    return {
                        id: c.id,
                        displayName: c.name || displayUser?.name || 'Unknown',
                        displayAvatar: c.name ? null : (displayUser?.avatar_url || ''),
                        lastMessage: {
                            content: c.last_message_text || 'No messages yet',
                            created_at: c.last_message_at || c.created_at,
                            sender_id: 0, // Not explicitly needed for list list view often
                            id: 0
                        },
                        unreadCount: 0,
                        updated_at: c.last_message_at || c.created_at,
                        is_group: c.type === 'group',
                        lastReadMessageId: lastReadId,
                        participants: c.participants || [],
                        creatorId: c.creator_id,
                        type: c.type
                    };
                }) || [];

                setRooms(formattedRooms);
            } catch (err) {
                console.error("Error fetching conversations:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();

        // Realtime Subscriptions
        const channel = supabase.channel(`student_chat_list_${studentId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, () => {
                fetchConversations();
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${studentId}` }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId]);

    const filteredConversations = useMemo(() => {
        return rooms
            .filter(room => {
                const nameMatch = room.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
                if (!nameMatch) return false;

                // Simple unread logic 
                if (activeFilter === 'Unread') {
                    // TODO: Implement unread count
                    return false;
                }
                return true;
            });
    }, [searchTerm, activeFilter, rooms]);

    const handleChatClick = (room: any) => {
        if (onSelectChat) {
            onSelectChat(room);
            return;
        }

        if (isDesktop) {
            setSelectedRoomId(room.id);
            setSelectedRoom(room);
        } else {
            if (navigateTo) {
                navigateTo('chat', room.displayName, { conversationId: room.id, roomDetails: room });
            }
        }
    };

    const handleNewChat = () => {
        navigateTo && navigateTo('newChat', 'New Message', {});
    };

    return (
        <div className="flex h-full bg-white border-r border-gray-200 overflow-hidden">
            {/* Sidebar / List - Full width on mobile, 1/3 on desktop if standalone */}
            <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${isDesktop && !onSelectChat ? 'w-2/5 max-w-sm' : 'w-full'}`}>
                <header className="p-4 bg-gray-50/50 backdrop-blur-md border-b border-gray-100 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Messages</h1>
                        <div className="flex items-center space-x-1">
                            <button onClick={handleNewChat} className="p-2 rounded-full hover:bg-orange-100 text-orange-500 transition-colors" title="New Message">
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
                            className="w-full pl-9 pr-4 py-2 text-sm text-gray-700 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all outline-none placeholder-gray-400"
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
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <SearchIcon className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No conversations found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredConversations.map(room => {
                                const ts = room.lastMessage?.created_at || room.updated_at;
                                const hasUnread = room.lastMessage && room.lastMessage.id > room.lastReadMessageId;
                                const isSelected = isDesktop && selectedRoomId === room.id;

                                return (
                                    <button
                                        key={room.id}
                                        onClick={() => handleChatClick(room)}
                                        className={`w-full text-left px-4 py-3 flex items-center space-x-4 transition-all hover:bg-gray-50 active:bg-gray-100 ${isSelected ? 'bg-orange-50/60 border-l-4 border-orange-500' : 'border-l-4 border-transparent'
                                            }`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            {room.displayAvatar ? (
                                                <img src={room.displayAvatar} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border border-gray-100 shadow-sm text-blue-600 font-bold">
                                                    {room.displayName?.charAt(0) || 'U'}
                                                </div>
                                            )}
                                            {room.is_group && (
                                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                                    <div className="bg-indigo-100 rounded-full p-1">
                                                        <SearchIcon className="w-2 h-2 text-indigo-500" /> {/* Placeholder group icon */}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h4 className={`font-bold truncate text-sm text-gray-900 ${hasUnread ? '' : ''}`}>{room.displayName}</h4>
                                                <span className={`text-[10px] flex-shrink-0 ml-2 font-medium ${hasUnread ? 'text-orange-600' : 'text-gray-400'}`}>
                                                    {formatTimestamp(ts)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs truncate pr-2 ${hasUnread ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                                    {room.lastMessage?.sender_id === studentId && <span className="text-gray-400 font-normal">You: </span>}
                                                    {room.lastMessage?.content || 'Started a conversation'}
                                                </p>
                                                {hasUnread && (
                                                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 shadow-sm shadow-orange-200"></div>
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

            {/* Desktop Only: Chat Area - Only show if standalone (no onSelectChat prop) */}
            {isDesktop && !onSelectChat && (
                <div className="flex-grow h-full bg-gray-50 hidden md:block">
                    {/* We import React.lazy component so we need Suspense or standard import.
                         Since we are inside StudentMessagesScreen, let's use a standard lazy import or just require it.
                         To avoid top-level cyclic issues if any, we can dynamic import.
                         But simpler is to assume ChatScreen is imported at top.
                         Warning: We didn't import ChatScreen at the top of this file in previous `read`.
                         I need to add the import.
                     */}
                    {/* I will use a dynamic load here just to be safe if I didn't add import top */}
                    <React.Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
                        <ChatScreen
                            conversationId={String(selectedRoomId!)}
                            currentUserId={studentId!}
                            roomDetails={selectedRoom}
                        />
                    </React.Suspense>
                </div>
            )}
        </div>
    );
};

// We need to import ChatScreen. 
// Since I can't easily add import to top without reading again or guessing line numbers safely,
// I'll assume I can add it by replacing the top block or using lazy.
const ChatScreen = React.lazy(() => import('../shared/ChatScreen'));

export default StudentMessagesScreen;