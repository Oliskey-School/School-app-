import React, { useState, useMemo } from 'react';
import { Conversation } from '../../types';
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
    onNewChat: () => void; // Added prop to handle "New Chat" action
}

const AdminMessagesScreen: React.FC<AdminMessagesScreenProps> = ({ onSelectChat, onNewChat }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Groups' | 'Favourites'>('All');

    const filteredConversations = useMemo(() => {
        return mockConversations
            .filter(convo => {
                const isParticipant = convo.messages.some(msg => msg.senderId === ADMIN_ID) || convo.participant.id === ADMIN_ID;
                if (!isParticipant) return false;

                const nameMatch = convo.participant.name.toLowerCase().includes(searchTerm.toLowerCase());
                if (!nameMatch) return false;

                if (activeFilter === 'Unread') {
                    // This logic is slightly different for admin/teacher vs parent/student in mock data
                    const unreadForAdmin = convo.messages.length > 0 && convo.messages[convo.messages.length - 1].senderId !== ADMIN_ID;
                    return unreadForAdmin;
                }
                // Placeholder for other filters if data supported them
                if (activeFilter === 'Groups') return false;
                if (activeFilter === 'Favourites') return false;

                return true;
            })
            .sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [searchTerm, activeFilter]);

    return (
        <div className="flex flex-col h-full bg-white relative">
            {/* Header section */}
            <header className="px-6 py-5 bg-white border-b border-gray-100 flex-shrink-0 z-10 sticky top-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
                        <p className="text-sm text-gray-500 font-medium">Manage your conversations</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onNewChat}
                            className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center gap-2"
                            title="Start New Chat"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span className="hidden sm:inline font-bold text-sm">New Chat</span>
                        </button>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <SearchIcon className="text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
                        </span>
                        <input
                            type="search"
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex bg-gray-100/80 p-1 rounded-xl overflow-x-auto no-scrollbar sm:flex-shrink-0">
                        {(['All', 'Unread', 'Groups'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter as any)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeFilter === filter
                                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Conversation List */}
            <main className="flex-grow overflow-y-auto">
                {filteredConversations.length > 0 ? (
                    <div className="divide-y divide-gray-50">
                        {filteredConversations.map(convo => {
                            const hasUnread = convo.unreadCount > 0;
                            return (
                                <button
                                    key={convo.id}
                                    onClick={() => onSelectChat(convo)}
                                    className={`w-full text-left px-6 py-4 flex items-start gap-4 transition-all hover:bg-gray-50 group ${hasUnread ? 'bg-indigo-50/30' : ''}`}
                                >
                                    {/* Avatar with Status Dot */}
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={convo.participant.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(convo.participant.name)}&background=random`}
                                            alt={convo.participant.name}
                                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:border-indigo-100 transition-colors"
                                        />
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={`font-bold truncate text-base ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {convo.participant.name}
                                            </h3>
                                            <span className={`text-xs ml-2 font-medium flex-shrink-0 ${hasUnread ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                {formatTimestamp(convo.lastMessage.timestamp)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <p className={`text-sm truncate pr-4 ${hasUnread ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                                {convo.messages[convo.messages.length - 1]?.senderId === ADMIN_ID && <span className="text-indigo-500 mr-1">You:</span>}
                                                {convo.lastMessage.text}
                                            </p>

                                            {hasUnread && (
                                                <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-200 animate-pulse-soft">
                                                    {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 animate-fade-in">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                            <MessagesIcon className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No messages found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mb-8">
                            {searchTerm
                                ? `No conversations matching "${searchTerm}"`
                                : activeFilter !== 'All'
                                    ? `No ${activeFilter.toLowerCase()} messages`
                                    : "You haven't started any conversations yet."}
                        </p>
                        <button
                            onClick={onNewChat}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center gap-2"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Start a Conversation
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminMessagesScreen;