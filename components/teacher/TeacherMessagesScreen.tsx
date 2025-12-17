import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Conversation } from '../../types';
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

const TeacherMessagesScreen: React.FC<TeacherMessagesScreenProps> = ({ navigateTo }) => {
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
            const enrichedConversations: Conversation[] = await Promise.all(convos.map(async (c: any) => {
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


    const filteredConversations = useMemo(() => {
        return conversations
            .filter(convo => {
                const nameMatch = convo.participant.name.toLowerCase().includes(searchTerm.toLowerCase());
                if (!nameMatch) return false;

                if (activeFilter === 'Unread') {
                    return convo.unreadCount > 0;
                }
                return true;
            });
    }, [searchTerm, activeFilter, conversations]);

    const handleChatClick = (convo: Conversation) => {
        navigateTo('chat', convo.participant.name, {
            conversationId: convo.id,
            participantId: convo.participant.id,
            participantRole: convo.participant.role,
            participantName: convo.participant.name,
            participantAvatar: convo.participant.avatarUrl
        });
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            <header className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Chats</h1>
                    <div className="flex items-center space-x-2">
                        <button className="p-2 rounded-full hover:bg-gray-200 text-gray-600"><PlusIcon /></button>
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
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading chats...</div>
                ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No conversations found.</div>
                ) : (
                    filteredConversations.map(convo => {
                        const hasUnread = convo.unreadCount > 0;
                        return (
                            <button
                                key={convo.id}
                                onClick={() => handleChatClick(convo)}
                                className="w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100"
                            >
                                <img src={convo.participant.avatarUrl} alt={convo.participant.name} className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
                                <div className="flex-grow overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-gray-800 truncate">{convo.participant.name}</p>
                                        <p className={`text-xs flex-shrink-0 ml-2 font-medium ${hasUnread ? 'text-green-600' : 'text-gray-400'}`}>
                                            {formatTimestamp(convo.lastMessage.timestamp)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-start mt-0.5">
                                        <p className={`text-sm truncate pr-2 ${hasUnread ? 'text-gray-700' : 'text-gray-500'}`}>
                                            {convo.lastMessage.text}
                                        </p>
                                        {hasUnread && (
                                            <span className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center bg-green-500 font-bold flex-shrink-0">
                                                {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                                            </span>
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

export default TeacherMessagesScreen;