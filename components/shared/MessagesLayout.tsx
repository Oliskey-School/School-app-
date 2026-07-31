import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { lazyWithRetry } from '../../lib/lazyRetry';
import { PlusIcon, SearchIcon } from '../../constants';

const ChatScreen = lazyWithRetry(() => import('./ChatScreen'));

const formatTimestamp = (isoDate: string): string => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (date >= startOfToday) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (date >= startOfYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-GB');
};

type ThemeColor = 'orange' | 'purple' | 'green' | 'indigo' | 'blue';

const THEME = {
    orange:  { accent: 'text-orange-500', badge: 'bg-orange-500', dot: 'bg-orange-500', hover: 'hover:bg-orange-50', selected: 'bg-orange-50/80', ring: 'ring-orange-200', btn: 'hover:bg-orange-100 text-orange-500', filterActive: 'bg-orange-500 text-white' },
    purple:  { accent: 'text-purple-600', badge: 'bg-purple-500', dot: 'bg-purple-500', hover: 'hover:bg-purple-50', selected: 'bg-purple-50/80', ring: 'ring-purple-200', btn: 'hover:bg-purple-100 text-purple-600', filterActive: 'bg-purple-600 text-white' },
    green:   { accent: 'text-green-600', badge: 'bg-green-500', dot: 'bg-green-500', hover: 'hover:bg-green-50', selected: 'bg-green-50/80', ring: 'ring-green-200', btn: 'hover:bg-green-100 text-green-600', filterActive: 'bg-green-600 text-white' },
    indigo:  { accent: 'text-indigo-600', badge: 'bg-indigo-500', dot: 'bg-indigo-500', hover: 'hover:bg-indigo-50', selected: 'bg-indigo-50/80', ring: 'ring-indigo-200', btn: 'hover:bg-indigo-100 text-indigo-600', filterActive: 'bg-indigo-600 text-white' },
    blue:    { accent: 'text-blue-600', badge: 'bg-blue-500', dot: 'bg-blue-500', hover: 'hover:bg-blue-50', selected: 'bg-blue-50/80', ring: 'ring-blue-200', btn: 'hover:bg-blue-100 text-blue-600', filterActive: 'bg-blue-600 text-white' }
};

interface MessagesLayoutProps {
    currentUserId?: string;
    themeColor?: ThemeColor;
    navigateTo?: (view: string, title: string, props?: any) => void;
    onSelectChat?: (conversation: any) => void;
    newChatView?: string;
}

// Skeleton rows shown while conversations are loading
const ConversationSkeleton: React.FC = () => (
    <>
        {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50/80 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-gray-200/80 flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex justify-between items-center">
                        <div className="h-3.5 bg-gray-200/80 rounded-full w-2/5" />
                        <div className="h-3 bg-gray-100 rounded-full w-10 flex-shrink-0" />
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full w-3/5" />
                </div>
            </div>
        ))}
    </>
);

// Module-level cache — survives tab switches and back-navigation without re-showing skeleton
const _roomsCache: { data: any[]; ready: boolean } = { data: [], ready: false };

const MessagesLayout: React.FC<MessagesLayoutProps> = ({
    currentUserId,
    themeColor = 'indigo',
    navigateTo,
    onSelectChat,
    newChatView = 'newChat'
}) => {
    const t = THEME[themeColor];

    const [rooms, setRooms] = useState<any[]>(_roomsCache.data);
    const [loading, setLoading] = useState(!_roomsCache.ready);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | 'Groups'>('All');
    // Desktop split-pane at 1024px — tablets stay in single-column mobile mode
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<any>(null);
    const [newChatMode, setNewChatMode] = useState(false);
    const [newChatSearch, setNewChatSearch] = useState('');

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const fn = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setIsDesktop(window.innerWidth >= 1024), 100);
        };
        window.addEventListener('resize', fn);
        return () => { window.removeEventListener('resize', fn); clearTimeout(timer); };
    }, []);

    const fetchRooms = useCallback(async () => {
        try {
            const data = await api.getChatRooms();
            const formatted = (data || []).map((c: any) => {
                const other = c.participants?.find((p: any) => p.user_id !== currentUserId)?.user;
                const displayName = other?.student_profile?.display_name || other?.full_name || c.name || 'Unknown';
                const lastMsg = c.messages?.[0];
                return {
                    id: c.id,
                    displayName,
                    avatar: other?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=48`,
                    lastMessage: lastMsg?.content || 'Start a conversation',
                    lastMessageAt: c.last_message_at || lastMsg?.created_at || c.created_at,
                    unreadCount: c.unread_count || 0,
                    isGroup: c.type === 'group' || c.is_group,
                    type: c.type
                };
            });
            _roomsCache.data = formatted;
            _roomsCache.ready = true;
            setRooms(formatted);
        } catch (err) {
            console.error('Error fetching rooms:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);
    useAutoSync(['chat_rooms', 'messages'], fetchRooms);

    const filtered = useMemo(() => {
        return rooms.filter(r => {
            const nameMatch = (r.displayName || '').toLowerCase().includes(searchTerm.toLowerCase());
            if (!nameMatch) return false;
            if (activeFilter === 'Unread') return r.unreadCount > 0;
            if (activeFilter === 'Groups') return r.isGroup;
            return true;
        });
    }, [rooms, searchTerm, activeFilter]);

    const totalUnread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);

    const newChatContacts = useMemo(() => {
        const q = newChatSearch.trim().toLowerCase();
        const list = q ? rooms.filter(r => r.displayName.toLowerCase().includes(q)) : rooms;
        return list.slice(0, 8);
    }, [rooms, newChatSearch]);

    const handleSelect = (room: any) => {
        setNewChatMode(false);
        if (isDesktop) {
            setSelectedRoomId(room.id);
            setSelectedRoom(room);
        } else if (onSelectChat) {
            onSelectChat(room);
        } else {
            navigateTo?.('chat', room.displayName, { conversationId: room.id, roomDetails: room });
        }
    };

    const handlePlusClick = () => {
        if (isDesktop) {
            setNewChatMode(true);
            setSelectedRoomId(null);
            setSelectedRoom(null);
            setNewChatSearch('');
        } else {
            navigateTo?.(newChatView, 'New Message', {});
        }
    };

    return (
        <div className="flex h-full overflow-hidden bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-white/60">
            {/* Sidebar / conversation list */}
            <div className={`flex flex-col h-full bg-white/60 backdrop-blur-sm border-r border-gray-100/60 ${isDesktop ? 'w-[320px] flex-shrink-0' : 'w-full'}`}>

                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100/60 bg-white/40 backdrop-blur-sm flex-shrink-0">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Messages</h1>
                            {totalUnread > 0 && (
                                <span className={`${t.badge} text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center`}>
                                    {totalUnread > 99 ? '99+' : totalUnread}
                                </span>
                            )}
                        </div>
                        {/* New message button — 44×44 touch target */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.92, rotate: 90 }}
                            onClick={handlePlusClick}
                            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full ${t.btn} transition-colors`}
                            aria-label="New Message"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </motion.button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="search"
                            placeholder="Search messages..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100/80 border-none rounded-xl focus:ring-2 focus:ring-offset-0 focus:bg-white/80 transition-all outline-none placeholder-gray-400 text-gray-700"
                            style={{ minHeight: 44 }}
                        />
                    </div>

                    {/* Filters — 44px tap height */}
                    <div className="flex gap-1.5">
                        {(['All', 'Unread', 'Groups'] as const).map(f => (
                            <motion.button
                                key={f}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 py-2 min-h-[36px] text-xs font-semibold rounded-full transition-colors ${activeFilter === f ? t.filterActive + ' shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                {f}
                                {f === 'Unread' && totalUnread > 0 && (
                                    <span className="ml-1 bg-white/30 rounded-full px-1">{totalUnread}</span>
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <ConversationSkeleton />
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 shadow-inner">
                                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-500 mb-1">No conversations yet</p>
                            <p className="text-xs text-gray-400">Tap + to start a new message</p>
                        </div>
                    ) : (
                        <div>
                            {filtered.map((room, i) => {
                                const isSelected = isDesktop && selectedRoomId === room.id;
                                const hasUnread = room.unreadCount > 0;
                                return (
                                    <motion.button
                                        key={room.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.03 }}
                                        onClick={() => handleSelect(room)}
                                        className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${isSelected ? t.selected + ' shadow-sm' : t.hover} border-b border-gray-50/80 last:border-b-0`}
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={room.avatar}
                                                alt={room.displayName}
                                                className={`w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm ${isSelected ? 'ring-offset-1' : ''}`}
                                            />
                                            {hasUnread && (
                                                <span className={`absolute -top-0.5 -right-0.5 w-5 h-5 ${t.badge} text-white text-xs font-bold flex items-center justify-center rounded-full ring-2 ring-white`}>
                                                    {room.unreadCount > 9 ? '9+' : room.unreadCount}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h4 className={`text-sm font-${hasUnread ? 'bold' : 'semibold'} truncate text-gray-900`}>
                                                    {room.displayName}
                                                </h4>
                                                <span className={`text-xs flex-shrink-0 ml-2 font-medium ${hasUnread ? t.accent : 'text-gray-400'}`}>
                                                    {formatTimestamp(room.lastMessageAt)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className={`text-xs truncate pr-2 ${hasUnread ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                                                    {room.lastMessage}
                                                </p>
                                                {hasUnread && (
                                                    <div className={`w-2 h-2 ${t.dot} rounded-full flex-shrink-0`} />
                                                )}
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop chat panel — always rendered in split-pane on desktop */}
            {isDesktop && (
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    {newChatMode ? (
                        <div className="flex flex-col h-full bg-white/80 backdrop-blur-md">
                            <div className="px-4 py-3 border-b border-gray-100/80 flex items-center gap-3 flex-shrink-0 bg-white/60 backdrop-blur-sm">
                                <button onClick={() => setNewChatMode(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Close">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <h2 className="font-bold text-gray-800 text-base">New Message</h2>
                            </div>
                            <div className="px-4 py-3 border-b border-gray-50/80 flex-shrink-0">
                                <input
                                    autoFocus
                                    type="search"
                                    placeholder="Search by name…"
                                    value={newChatSearch}
                                    onChange={e => setNewChatSearch(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-100/80 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-offset-0 transition-all placeholder-gray-400"
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {newChatContacts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                        <p className="text-sm text-gray-400 mb-3">No contacts found</p>
                                        <button onClick={() => { setNewChatMode(false); navigateTo?.(newChatView, 'New Message', {}); }} className={`px-4 py-2 text-sm font-semibold ${t.filterActive} rounded-xl`}>Browse all contacts</button>
                                    </div>
                                ) : (
                                    newChatContacts.map(room => (
                                        <button key={room.id} onClick={() => handleSelect(room)} className={`w-full text-left px-4 py-3.5 flex items-center gap-3 ${t.hover} border-b border-gray-50/80 last:border-0 transition-colors`} style={{ touchAction: 'manipulation' }}>
                                            <img src={room.avatar} alt={room.displayName} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-gray-800 truncate">{room.displayName}</p>
                                                <p className="text-xs text-gray-400 truncate">{room.lastMessage}</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : selectedRoomId ? (
                        <Suspense fallback={
                            <div className="h-full flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                            </div>
                        }>
                            <ChatScreen
                                conversationId={selectedRoomId}
                                currentUserId={currentUserId}
                                themeColor={themeColor}
                                roomDetails={selectedRoom}
                            />
                        </Suspense>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-24 h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-5 shadow-md ring-1 ring-gray-100">
                                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-gray-700 mb-1.5">No conversation selected</h2>
                            <p className="text-sm text-gray-400 max-w-xs">Pick a chat from the list or tap + to start a new conversation.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessagesLayout;
