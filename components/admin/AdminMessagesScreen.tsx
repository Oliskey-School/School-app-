import React, { useState, useMemo } from 'react';
import { Conversation } from '../../types';
import { mockConversations } from '../../data';
import { SearchIcon, PlusIcon, DotsVerticalIcon } from '../../constants';

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
}

const AdminMessagesScreen: React.FC<AdminMessagesScreenProps> = ({ onSelectChat }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread'>('All');

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
                return true;
            })
            .sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [searchTerm, activeFilter]);

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-200">
            {/* Header section */}
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

            {/* Conversation List */}
            <main className="flex-grow overflow-y-auto">
                {filteredConversations.map(convo => {
                    const hasUnread = convo.unreadCount > 0;
                    return (
                        <button
                            key={convo.id}
                            onClick={() => onSelectChat(convo)}
                            className="w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-gray-50 border-b border-gray-100"
                        >
                            <img src={convo.participant.avatarUrl} alt={convo.participant.name} className="w-12 h-12 rounded-full flex-shrink-0" />
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
                })}
            </main>
        </div>
    );
};

export default AdminMessagesScreen;