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
    navigateTo: (view: string, title: string, props?: any) => void;
    studentId: number;
}

const StudentMessagesScreen: React.FC<StudentMessagesScreenProps> = ({ navigateTo, studentId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread'>('All');
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            if (!studentId) return;

            try {
                // 1. Get rooms I am in
                const { data: myParticipations, error: partError } = await supabase
                    .from('chat_participants')
                    .select('room_id, last_read_message_id')
                    .eq('user_id', studentId);

                if (partError || !myParticipations) {
                    console.error('Error fetching participations:', partError);
                    return;
                }

                const participationsMap = new Map(myParticipations.map(p => [p.room_id, p]));
                const roomIds = myParticipations.map(p => p.room_id);
                if (roomIds.length === 0) {
                    setRooms([]);
                    setLoading(false);
                    return;
                }

                // 2. Get room details, including last message (via sorting messages)
                const { data: roomsData, error: roomsError } = await supabase
                    .from('chat_rooms')
                    .select(`
                        id, type, name, is_group, last_message_at, updated_at, created_at
                    `)
                    .in('id', roomIds)
                    .order('last_message_at', { ascending: false });

                if (roomsError) {
                    console.error('Error fetching rooms:', roomsError);
                    setLoading(false);
                    return;
                }

                // 3. For each room, get participants (to find the other person in direct chats) AND last message
                const enrichedRooms = await Promise.all(roomsData.map(async (room) => {
                    const { data: participants } = await supabase
                        .from('chat_participants')
                        .select(`
                            user_id,
                            role,
                            users ( id, name, avatar_url, role )
                        `)
                        .eq('room_id', room.id);

                    const { data: lastMsg } = await supabase
                        .from('chat_messages')
                        .select('content, created_at, type, sender_id')
                        .eq('room_id', room.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    // Determine name/avatar for display
                    let displayName = room.name;
                    let displayAvatar = 'https://via.placeholder.com/150';
                    let otherParticipant = null;

                    if (!room.is_group && participants) {
                        const other: any = participants.find((p: any) => p.user_id !== studentId);
                        if (other) {
                            const userObj = Array.isArray(other.users) ? other.users[0] : other.users;
                            if (userObj) {
                                displayName = userObj.name;
                                displayAvatar = userObj.avatar_url || displayAvatar;
                                otherParticipant = userObj;
                            }
                        }
                        if (!otherParticipant) {
                            // Self chat or error
                            displayName = "Me";
                        }
                    } else {
                        // Group chat avatar logic (optional)
                        displayAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName || 'Group');
                    }

                    return {
                        ...room,
                        participants: participants || [],
                        lastMessage: lastMsg || { id: 0, content: 'No messages yet', created_at: room.created_at, type: 'text' },
                        displayName,
                        displayAvatar,
                        otherParticipant,
                        lastReadMessageId: participationsMap.get(room.id)?.last_read_message_id || 0
                    };
                }));

                setRooms(enrichedRooms);

            } catch (e) {
                console.error('Error loading chats:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();

        // Subscribe to new messages system-wide for now to update list order? 
        // Or better, subscribe to changes in 'chat_rooms' (last_message_at update)
        const roomSubscription = supabase
            .channel('public:chat_rooms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, (payload) => {
                fetchRooms(); // Re-fetch on any update for simplicity
            })
            .subscribe();

        return () => {
            supabase.removeChannel(roomSubscription);
        };

    }, [studentId]);

    const filteredConversations = useMemo(() => {
        return rooms
            .filter(room => {
                const nameMatch = room.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
                if (!nameMatch) return false;

                // Simple unread logic (mock for now as we didn't fully impl unread count in step 1 query)
                if (activeFilter === 'Unread') {
                    return false; // TODO: Implement unread count
                }
                return true;
            });
        // .sort handled by database query mostly, but can re-sort here if realtime updates mess it up
    }, [searchTerm, activeFilter, rooms]);

    const handleChatClick = (room: any) => {
        navigateTo('chat', room.displayName, { conversationId: room.id, roomDetails: room });
    };

    const handleNewChat = () => {
        navigateTo('newChat', 'New Message', {}); // We need to ensure newChat view exists and handles creation
    };

    if (loading) {
        return <div className="h-full flex items-center justify-center text-gray-400">Loading chats...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            <header className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Chats</h1>
                    <div className="flex items-center space-x-2">
                        <button onClick={handleNewChat} className="p-2 rounded-full hover:bg-gray-200 text-gray-600"><PlusIcon /></button>
                        <button className="p-2 rounded-full hover:bg-gray-200 text-gray-600"><DotsVerticalIcon /></button>
                    </div>
                </div>
                <div className="relative mt-3">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400 w-5 h-5" />
                    </span>
                    <input
                        type="search"
                        placeholder="Search or start a new chat"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm text-gray-700 bg-gray-200 border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 outline-none"
                    />
                </div>
                <div className="mt-3 flex space-x-2">
                    {(['All', 'Unread', 'Favourites', 'Groups'] as const).map(filter => (
                        <button key={filter} onClick={() => setActiveFilter(filter as 'All' | 'Unread')} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${activeFilter === filter ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                            {filter}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-grow overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No conversations found.</div>
                ) : (
                    filteredConversations.map(room => {
                        // date fallback
                        const ts = room.lastMessage?.created_at || room.updated_at;
                        const hasUnread = room.lastMessage && room.lastMessage.id > room.lastReadMessageId;

                        return (
                            <button
                                key={room.id}
                                onClick={() => handleChatClick(room)}
                                className="w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100"
                            >
                                <img src={room.displayAvatar} alt={room.displayName} className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <p className={`font-semibold truncate ${hasUnread ? 'text-gray-900 font-bold' : 'text-gray-800'}`}>{room.displayName}</p>
                                        <p className={`text-xs flex-shrink-0 ml-2 font-medium ${hasUnread ? 'text-green-600' : 'text-gray-400'}`}>
                                            {formatTimestamp(ts)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-start mt-0.5">
                                        <p className={`text-sm truncate pr-2 ${hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                            {room.lastMessage?.content || 'Started a conversation'}
                                        </p>
                                        {hasUnread && (
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })
                )}
            </main>
        </div>
    );
};

export default StudentMessagesScreen;