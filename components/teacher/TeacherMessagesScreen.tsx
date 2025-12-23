import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Conversation } from '../../types';
import ChatScreen from '../shared/ChatScreen';
import { SearchIcon, PlusIcon, DotsVerticalIcon } from '../../constants';
import { THEME_CONFIG } from '../../constants';

const LOGGED_IN_TEACHER_ID = 2; // Temporary mock ID until Auth is fully ready

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
}

const TeacherMessagesScreen: React.FC<TeacherMessagesScreenProps> = ({ navigateTo, onSelectChat }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread'>('All');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchConversations = async () => {
            setLoading(true);
            const { data: convos, error } = await supabase
                .from('conversations')
                .select('*')
                .order('last_message_time', { ascending: false });

            if (error) {
                console.error("Error fetching conversations:", error);
                setLoading(false);
                return;
            }

            if (!convos) {
                setConversations([]);
                setLoading(false);
                return;
            }

            // Enrich with participant details
            const enrichedConversations: any[] = await Promise.all(convos.map(async (c: any) => {
                let participantName = 'Unknown';
                let participantAvatar = '';

                if (c.participant_role === 'Student') {
                    const { data: student } = await supabase.from('students').select('name, avatar_url').eq('id', c.participant_id).single();
                    if (student) {
                        participantName = student.name;
                        participantAvatar = student.avatar_url;
                    }
                } else if (c.participant_role === 'Parent') {
                    const { data: parent } = await supabase.from('parents').select('name, avatar_url').eq('id', c.participant_id).single();
                    if (parent) {
                        participantName = parent.name;
                        participantAvatar = parent.avatar_url;
                    }
                }

                return {
                    id: c.id,
                    participant: {
                        id: c.participant_id,
                        name: participantName,
                        avatarUrl: participantAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participantName)}&background=random`,
                        role: c.participant_role as any
                    },
                    lastMessage: {
                        text: c.last_message || 'No messages yet',
                        timestamp: c.last_message_time || new Date().toISOString()
                    },
                    unreadCount: c.unread_count || 0,
                    messages: [] // We fetch messages only when opening the chat
                };
            }));

            setConversations(enrichedConversations);
            setLoading(false);
        };

        fetchConversations();
    }, []);


    // Map for UI consistency
    const rooms = useMemo(() => {
        return conversations.map(c => ({
            id: c.id,
            displayName: c.participant.name,
            displayAvatar: c.participant.avatarUrl,
            lastMessage: {
                content: c.lastMessage.text,
                created_at: c.lastMessage.timestamp,
                sender_id: c.lastMessage.senderId || 0
            },
            unreadCount: c.unreadCount,
            is_group: false // Default
        }));
    }, [conversations]);

    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

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
        // Find original conversation object if needed or just use the mapped one
        // We'll reconstruct a basic conversation object for the callback
        const originalConvo = conversations.find(c => c.id === convo.id);

        if (onSelectChat && originalConvo) {
            onSelectChat(originalConvo);
            setSelectedConversation(originalConvo);
            return;
        }

        if (isDesktop && originalConvo) {
            setSelectedConversation(originalConvo);
        } else {
            navigateTo('chat', convo.displayName, {
                conversationId: convo.id,
                participantId: originalConvo?.participant.id, // Fallback
                participantRole: originalConvo?.participant.role,
                participantName: convo.displayName,
                participantAvatar: convo.displayAvatar
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
                                            <img src={room.displayAvatar} alt={room.displayName} className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
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
                                currentUserId={LOGGED_IN_TEACHER_ID}
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