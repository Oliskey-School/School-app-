import React, { useState, useMemo, useEffect } from 'react';
import { Conversation } from '../../types';
import ChatScreen from '../shared/ChatScreen';
import { mockConversations } from '../../data';
import { SearchIcon, PlusIcon, DotsVerticalIcon, FilterIcon, MessagesIcon } from '../../constants';

const ADMIN_ID = 0;

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

interface AdminMessagesScreenProps {
    onSelectChat: (conversation: Conversation) => void;
    onNewChat?: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const AdminMessagesScreen: React.FC<AdminMessagesScreenProps> = ({ onSelectChat, onNewChat, navigateTo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Groups' | 'Favourites'>('All');

    // Map mock conversations to UI structure
    const rooms = useMemo(() => {
        return (mockConversations as any[]).map(c => ({
            id: c.id,
            displayName: c.participant.name,
            displayAvatar: c.participant.avatarUrl,
            lastMessage: {
                content: c.lastMessage.text,
                created_at: c.lastMessage.timestamp,
                sender_id: c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1].senderId : 0
            },
            unreadCount: c.unreadCount,
            updated_at: c.lastMessage.timestamp,
            is_group: false
        }));
    }, []);

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
            })
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }, [searchTerm, activeFilter, rooms]);

    const handleChatClick = (convo: any) => {
        // Find original or use mapped
        if (onSelectChat) {
            // Find original for type safety if needed, or cast
            const original = (mockConversations as any[]).find(c => c.id === convo.id);
            if (original) {
                onSelectChat(original);
                setSelectedConversation(original); // For desktop highlighting
            }
            return;
        }

        if (isDesktop) {
            const original = (mockConversations as any[]).find(c => c.id === convo.id);
            setSelectedConversation(original);
        } else {
            // For admin navigateTo might not be fully set up for mobile detail view?
            // Assuming current generic handler works if we pass new structure
            navigateTo?.('chat', convo.displayName, {
                conversationId: convo.id,
                participantName: convo.displayName,
                participantAvatar: convo.displayAvatar
            });
        }
    };

    return (
        <div className="flex h-full bg-white border-r border-gray-200 overflow-hidden">
            {/* Sidebar / List - Full width on mobile, 1/3 on desktop if standalone */}
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

                <main className="flex-grow flex flex-col overflow-y-auto custom-scrollbar">
                    {filteredConversations.length === 0 ? (
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
                                const hasUnread = room.unreadCount > 0;
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
                                                <span className={`text-[10px] flex-shrink-0 ml-2 font-medium ${hasUnread ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                    {formatTimestamp(ts)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs truncate pr-2 ${hasUnread ? 'text-gray-900 font-bold' : 'text-gray-500'}`}>
                                                    {room.lastMessage?.sender_id === ADMIN_ID && <span className="text-gray-400 font-normal">You: </span>}
                                                    {room.lastMessage?.content || 'Started a conversation'}
                                                </p>
                                                {hasUnread && (
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 shadow-sm shadow-indigo-200"></div>
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
                    {selectedConversation ? (
                        <div className="h-full">
                            <ChatScreen
                                currentUserId={ADMIN_ID}
                                conversationId={selectedConversation.id}
                                roomDetails={rooms.find(r => r.id === selectedConversation.id)}
                                themeColor="indigo"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50/50">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                <SearchIcon className="w-10 h-10 text-indigo-300" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Select a conversation</h2>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminMessagesScreen;