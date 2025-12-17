
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SearchIcon, PlusIcon, DotsVerticalIcon, ChevronLeftIcon } from '../../constants';
import ChatScreen from '../shared/ChatScreen';
import NewChatScreen from '../shared/NewChatScreen';

const LOGGED_IN_PARENT_ID = 1002;

interface Conversation {
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
        senderId: number;
    };
    unreadCount: number;
}

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

interface ParentMessagesScreenProps {
    onSelectChat?: (conversation: any) => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const ParentMessagesScreen: React.FC<ParentMessagesScreenProps> = ({ onSelectChat, navigateTo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread'>('All');
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewChat, setShowNewChat] = useState(false);

    const fetchConversations = async () => {
        try {
            setLoading(true);

            // 1. Get all rooms I am in
            // utilizing standard explicit join syntax for safety or !inner for filtering
            const { data: myRooms, error: roomsError } = await supabase
                .from('chat_participants')
                .select(`
                    room_id,
                    last_read_message_id,
                    chat_rooms!inner (
                        id,
                        type,
                        last_message_at
                    )
                `)
                .eq('user_id', LOGGED_IN_PARENT_ID)
                .order('last_message_at', { foreignTable: 'chat_rooms', ascending: false });

            if (roomsError) throw roomsError;
            if (!myRooms || myRooms.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            const roomIds = myRooms.map((r: any) => r.room_id);

            // 2. Fetch all participants for these rooms to find the "other" user
            const { data: allParticipants, error: partError } = await supabase
                .from('chat_participants')
                .select(`
                    room_id,
                    user_id,
                    users (
                        id,
                        name,
                        avatar_url,
                        role
                    )
                `)
                .in('room_id', roomIds);

            if (partError) throw partError;

            // 3. Construct conversation objects
            const fetchedConversations: Conversation[] = [];

            for (const room of myRooms) {
                const roomId = room.room_id;

                // Find participants for this room
                const participants = allParticipants?.filter((p: any) => p.room_id === roomId) || [];

                // Determine the "other" participant to display (or self if it's a self-chat)
                let displayParticipant = participants.find((p: any) => p.user_id !== LOGGED_IN_PARENT_ID);

                // Handle Self Chat / Only me in room
                if (!displayParticipant && participants.some((p: any) => p.user_id === LOGGED_IN_PARENT_ID)) {
                    displayParticipant = participants.find((p: any) => p.user_id === LOGGED_IN_PARENT_ID);
                }

                if (!displayParticipant) continue;

                // Get last message info
                // Optimization: In a real app, this should be part of the chat_rooms query or proper view.
                // Here we do a quick fetch for the latest message content if needed, 
                // but we already have last_message_at. We lack the text content in the room object.
                // We'll fetch the single latest message.
                const { data: msgs } = await supabase
                    .from('chat_messages')
                    .select('content, created_at, sender_id')
                    .eq('room_id', roomId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                const lastMsg = msgs && msgs.length > 0 ? msgs[0] : null;

                fetchedConversations.push({
                    id: roomId,
                    participant: {
                        id: displayParticipant.users.id,
                        name: displayParticipant.users.name, // Display name
                        avatarUrl: displayParticipant.users.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayParticipant.users.name)}&background=random`,
                        role: displayParticipant.users.role
                    },
                    lastMessage: {
                        text: lastMsg?.content || 'No messages yet',
                        timestamp: lastMsg?.created_at || room.chat_rooms.last_message_at || new Date().toISOString(),
                        senderId: lastMsg?.sender_id || 0
                    },
                    unreadCount: 0 // Placeholder
                });
            }

            // Sort by latest message
            fetchedConversations.sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

            setConversations(fetchedConversations);

        } catch (err) {
            console.error("Error fetching conversations:", err);
            // Don't clear conversations on error if we had some, just show error? or clear.
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();

        // Subscription for real-time list updates
        const channel = supabase.channel('public:chat_messages_list_updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const filteredConversations = useMemo(() => {
        return conversations.filter(convo => {
            const nameMatch = convo.participant.name.toLowerCase().includes(searchTerm.toLowerCase());
            if (!nameMatch) return false;

            if (activeFilter === 'Unread') {
                return convo.unreadCount > 0;
            }
            return true;
        });
    }, [searchTerm, activeFilter, conversations]);

    const handleChatSelect = (convo: Conversation) => {
        setSelectedConversation(convo);
        if (onSelectChat) onSelectChat(convo);
    };

    const handleBackToMenu = () => {
        setSelectedConversation(null);
        setShowNewChat(false);
    };

    const handleNewChatCreated = (roomId: number) => {
        // Refresh list
        fetchConversations();
        setShowNewChat(false);
        // We optimize by just refreshing for now. The new chat will appear at the top.
        // If we want to auto-open it, we'd need to fetch its details or wait for the list refresh.
        // For simplicity in this step, we just close the new chat screen and the user will see it.
        // Optionally, we could try to select it after a delay.
    };

    return (
        <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] bg-gray-100 overflow-hidden relative">
            {/* Left Sidebar: Chat List OR New Chat */}
            <div className={`flex-col bg-white border-r border-gray-200 h-full flex-shrink-0 z-10 transition-transform duration-300 relative ${selectedConversation ? 'hidden md:flex md:w-80 lg:w-96' : 'flex w-full md:w-80 lg:w-96'}`}>

                {showNewChat ? (
                    <NewChatScreen
                        currentUserId={LOGGED_IN_PARENT_ID}
                        onBack={() => setShowNewChat(false)}
                        onChatCreated={handleNewChatCreated}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <header className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                            <div className="flex justify-between items-center mb-3">
                                <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setShowNewChat(true)}
                                        className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                                        title="New Chat"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                    <button className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"><DotsVerticalIcon className="w-5 h-5" /></button>
                                </div>
                            </div>

                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <SearchIcon className="text-gray-400 w-4 h-4" />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search or start new chat"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-shadow"
                                />
                            </div>
                            <div className="mt-3 flex space-x-2 overflow-x-auto no-scrollbar pb-1">
                                {(['All', 'Unread', 'Favourites', 'Groups'] as const).map(filter => (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter as 'All' | 'Unread')}
                                        className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${activeFilter === filter ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </header>

                        {/* Chat List */}
                        <div className="flex-grow overflow-y-auto">
                            {loading && conversations.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">Loading conversations...</div>
                            ) : filteredConversations.length > 0 ? filteredConversations.map(convo => {
                                const hasUnread = convo.unreadCount > 0;
                                const isSelected = selectedConversation?.id === convo.id;
                                return (
                                    <button
                                        key={convo.id}
                                        onClick={() => handleChatSelect(convo)}
                                        className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-50 transition-colors ${isSelected ? 'bg-green-50 hover:bg-green-50' : ''}`}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img src={convo.participant.avatarUrl} alt={convo.participant.name} className="w-12 h-12 rounded-full object-cover border border-gray-100" />
                                            {/* Online status indicator could be here */}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <p className={`font-semibold truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>{convo.participant.name}</p>
                                                <p className={`text-xs ml-2 flex-shrink-0 ${hasUnread ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
                                                    {formatTimestamp(convo.lastMessage.timestamp)}
                                                </p>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <p className={`text-sm truncate pr-2 ${hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                                                    {convo.lastMessage.text}
                                                </p>
                                                {hasUnread && (
                                                    <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full text-white text-[10px] flex items-center justify-center bg-green-500 font-bold">
                                                        {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            }) : (
                                <div className="p-8 text-center text-gray-500">
                                    <p>No conversations found</p>
                                    <button onClick={() => setShowNewChat(true)} className="text-green-600 font-semibold mt-2 hover:underline">Start a new chat</button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Right Main Content: Chat View or Placeholder */}
            <div className={`flex-col flex-grow bg-[#efeae2] h-full relative z-0 ${selectedConversation ? 'flex w-full' : 'hidden md:flex'}`}>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
                            <div className="flex items-center">
                                <button onClick={handleBackToMenu} className="mr-3 md:hidden p-2 rounded-full hover:bg-gray-200 text-gray-600">
                                    <ChevronLeftIcon className="w-6 h-6" />
                                </button>
                                <img src={selectedConversation.participant.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover mr-3" />
                                <div>
                                    <h2 className="font-bold text-gray-800">{selectedConversation.participant.name}</h2>
                                    <p className="text-xs text-green-600 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                                        Online
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button className="p-2 rounded-full hover:bg-gray-200 text-gray-500"><SearchIcon className="w-5 h-5" /></button>
                                <button className="p-2 rounded-full hover:bg-gray-200 text-gray-500"><DotsVerticalIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        {/* Chat Content */}
                        <div className="flex-grow overflow-hidden relative">
                            {/* Pass selectedConversation.id as conversationId */}
                            <ChatScreen currentUserId={LOGGED_IN_PARENT_ID} conversationId={selectedConversation.id} />
                        </div>
                    </>
                ) : (
                    /* Empty Placeholder State */
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50/50">
                        <div className="bg-gray-100 p-6 rounded-full mb-6">
                            {/* Custom big icon or similar */}
                            <svg className="w-24 h-24 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM20 16H6l-2 2V4h16v12z" /></svg>
                        </div>
                        <h2 className="text-2xl font-light text-gray-700 mb-2">School App Messaging</h2>
                        <p className="text-gray-500 max-w-sm">
                            Send and receive messages with teachers, parents, and students right here on your desktop.
                        </p>
                        <div className="mt-8 flex items-center space-x-2 text-xs text-gray-400">
                            <span className="flex items-center"><span className="w-3 h-3 mr-1 text-gray-400"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" /></svg></span> End-to-end encrypted</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentMessagesScreen;
