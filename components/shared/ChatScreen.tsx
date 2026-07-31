import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import {
    SendIcon,
    PaperclipIcon,
    HappyIcon,
    ChevronLeftIcon,
    CheckCircleIcon
} from '../../constants';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { useSocket } from '../../context/SocketContext';

// ─── Keyframes injected once into the document ───────────────────────────────
const CHAT_STYLES = `
  @keyframes typing-wave {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
    30% { transform: translateY(-5px); opacity: 1; }
  }
  @keyframes msg-in {
    from { opacity: 0; transform: translateY(6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  .chat-bubble-in  { animation: msg-in 0.18s ease-out forwards; }
  .chat-typing-dot { animation: typing-wave 1.3s ease-in-out infinite; }
  .chat-typing-dot:nth-child(2) { animation-delay: 0.15s; }
  .chat-typing-dot:nth-child(3) { animation-delay: 0.30s; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate();

const formatDateLabel = (date: Date): string => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yest  = new Date(today.getTime() - 86_400_000);
    const week  = new Date(today.getTime() - 6 * 86_400_000);
    if (date >= today) return 'Today';
    if (date >= yest)  return 'Yesterday';
    if (date >= week)  return date.toLocaleDateString('en-US', { weekday: 'long' });
    return date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
        ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    });
};

const GROUP_MS = 2 * 60 * 1000; // consecutive messages within 2 min collapse avatar/name

const isFirstInGroup = (msgs: any[], i: number) => {
    if (i === 0) return true;
    const p = msgs[i - 1], c = msgs[i];
    return p.senderId !== c.senderId ||
        new Date(c.createdAt).getTime() - new Date(p.createdAt).getTime() > GROUP_MS;
};

const isLastInGroup = (msgs: any[], i: number) => {
    if (i === msgs.length - 1) return true;
    const n = msgs[i + 1], c = msgs[i];
    return n.senderId !== c.senderId ||
        new Date(n.createdAt).getTime() - new Date(c.createdAt).getTime() > GROUP_MS;
};

// ─── Skeleton screens ─────────────────────────────────────────────────────────
const MessageSkeleton: React.FC<{ themeLight: string }> = ({ themeLight }) => (
    <div className="flex flex-col gap-3 p-4 animate-pulse">
        <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="h-10 bg-gray-200 rounded-2xl rounded-tl-none w-48" />
        </div>
        <div className="flex justify-end">
            <div className={`h-10 ${themeLight} rounded-2xl rounded-tr-none w-36`} />
        </div>
        <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="h-10 bg-gray-200 rounded-2xl rounded-tl-none w-64" />
        </div>
        <div className="flex justify-end">
            <div className={`h-10 ${themeLight} rounded-2xl rounded-tr-none w-52`} />
        </div>
        <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-transparent flex-shrink-0" />
            <div className="h-10 bg-gray-200 rounded-2xl rounded-tl-none w-40" />
        </div>
    </div>
);

const SidebarSkeleton: React.FC = () => (
    <>
        {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b border-gray-50/80 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex justify-between">
                        <div className="h-3.5 bg-gray-200 rounded-full w-2/5" />
                        <div className="h-3 bg-gray-100 rounded-full w-10" />
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full w-3/5" />
                </div>
            </div>
        ))}
    </>
);

// ─── Types / theme ────────────────────────────────────────────────────────────
interface ChatScreenProps {
    conversationId?: string;
    currentUserId?: string;
    themeColor?: 'indigo' | 'orange' | 'purple' | 'green' | 'blue';
    conversation?: any;
    roomDetails?: any;
    hideHeader?: boolean;
    onBack?: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
    targetUserId?: string;
    targetUserName?: string;
    targetUserAvatar?: string | null;
    schoolId?: string;
    isGroup?: boolean;
    forceChatPanel?: boolean;
}

const THEME_STYLES = {
    indigo: { primary: 'bg-indigo-600', bubble: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-100', ring: 'ring-indigo-200' },
    orange: { primary: 'bg-orange-500', bubble: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-100', ring: 'ring-orange-200' },
    purple: { primary: 'bg-purple-600', bubble: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-100', ring: 'ring-purple-200' },
    green:  { primary: 'bg-green-600',  bubble: 'bg-green-600',  text: 'text-green-600',  light: 'bg-green-100',  ring: 'ring-green-200'  },
    blue:   { primary: 'bg-blue-600',   bubble: 'bg-blue-600',   text: 'text-blue-600',   light: 'bg-blue-100',   ring: 'ring-blue-200'   }
};

const COMMON_EMOJIS = ['😀','😂','🤣','😍','🥰','😎','🤓','😭','😬','🙄','👍','👎','👏','🙏','🔥','✨','❤️','💔','✅','❌'];

// ─── Component ────────────────────────────────────────────────────────────────
const ChatScreen: React.FC<ChatScreenProps> = ({
    conversationId, conversation, roomDetails, currentUserId, themeColor = 'indigo', hideHeader = false,
    onBack, navigateTo,
    targetUserId, targetUserName, targetUserAvatar, schoolId: propSchoolId, isGroup,
    forceChatPanel
}) => {
    const { user }    = useAuth();
    const { profile } = useProfile();
    const { socket }  = useSocket();
    const theme = THEME_STYLES[themeColor] || THEME_STYLES.indigo;

    // Inject keyframes once
    useEffect(() => {
        const id = 'chat-screen-styles';
        if (!document.getElementById(id)) {
            const el = document.createElement('style');
            el.id = id;
            el.textContent = CHAT_STYLES;
            document.head.appendChild(el);
        }
    }, []);

    const resolvedId = conversationId || conversation?.id || null;
    const [activeConversationId, setActiveConversationId] = useState<string | null>(resolvedId);
    const [conversations, setConversations]               = useState<any[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [searchQuery, setSearchQuery]                   = useState('');

    const [messages, setMessages]                 = useState<any[]>([]);
    const [inputText, setInputText]               = useState('');
    const [activeRoomDetails, setActiveRoomDetails] = useState<any>(roomDetails || null);
    const [loadingMessages, setLoadingMessages]   = useState(false);

    // Follow the parent-driven conversation. `activeConversationId` was only
    // seeded ONCE at mount from the prop, so in the two-pane MessagesLayout,
    // clicking a different conversation changed the prop but the open chat stayed
    // stuck on the first one. Sync whenever the incoming id actually changes.
    // (Guarded by `resolvedId` being truthy so ChatScreen's own standalone
    // sidebar selection — where the prop stays null — is never clobbered.)
    useEffect(() => {
        if (resolvedId && resolvedId !== activeConversationId) {
            setActiveConversationId(resolvedId);
            setMessages([]);
            if (roomDetails) setActiveRoomDetails(roomDetails);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resolvedId]);
    const [typingUsers, setTypingUsers]           = useState<string[]>([]);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 1024px breakpoint — tablets stay in mobile single-column layout
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 1024);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    const effectiveUserId = currentUserId || user?.id;

    const [pendingTargetUserId]  = useState<string | undefined>(targetUserId);
    const [pendingTargetName]    = useState<string | undefined>(targetUserName);
    const [pendingTargetAvatar]  = useState<string | null | undefined>(targetUserAvatar);
    const resolvedSchoolId = propSchoolId ||
        (user as any)?.school_id ||
        (user as any)?.user_metadata?.school_id ||
        (user as any)?.app_metadata?.school_id || '';

    const isPendingChat = !activeConversationId && !!pendingTargetUserId;

    useEffect(() => {
        let t: ReturnType<typeof setTimeout>;
        const fn = () => { clearTimeout(t); t = setTimeout(() => setIsMobileView(window.innerWidth < 1024), 100); };
        window.addEventListener('resize', fn);
        return () => { window.removeEventListener('resize', fn); clearTimeout(t); };
    }, []);

    // Load conversation list (for standalone sidebar mode)
    useEffect(() => {
        const load = async () => {
            if (!effectiveUserId) return;
            try {
                const data = await api.getChatRooms();
                if (data) {
                    const formatted = data.map((c: any) => {
                        const other = c.participants?.find((p: any) => p.user_id !== effectiveUserId)?.user;
                        const displayName = other?.student_profile?.display_name || other?.full_name || c.name || 'Chat';
                        return {
                            id: c.id,
                            name: displayName,
                            lastMessage: c.messages?.[0]?.content || 'No messages yet',
                            time: c.last_message_at ? formatDistanceToNow(new Date(c.last_message_at)) + ' ago' : '',
                            unreadCount: c.unread_count || 0,
                            avatar: other?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
                            role: other?.role
                        };
                    });
                    setConversations(formatted);
                }
            } catch (err) {
                console.error('Error fetching conversations', err);
            } finally {
                setLoadingConversations(false);
            }
        };
        load();
    }, [effectiveUserId]);

    // Load messages for active conversation
    const loadMessages = useCallback(async (showLoader = true) => {
        if (!activeConversationId) return;
        if (showLoader) setLoadingMessages(true);
        try {
            const data = await api.getMessages(activeConversationId);
            if (data) {
                setMessages(data.map((m: any) => ({
                    id: m.id,
                    content: m.content,
                    senderId: m.sender_id,
                    createdAt: m.created_at,
                    type: m.type,
                    mediaUrl: m.media_url,
                    sender: {
                        id: m.sender?.id || m.sender_id,
                        name: m.sender?.student_profile?.display_name || m.sender?.full_name || 'User',
                        avatarUrl: m.sender?.avatar_url,
                        role: m.sender?.role
                    }
                })));
                const room = conversations.find(c => c.id === activeConversationId);
                if (room) setActiveRoomDetails(room);
            }
        } catch (e) {
            console.error('Error fetching messages', e);
        } finally {
            if (showLoader) setLoadingMessages(false);
        }
    }, [activeConversationId, conversations]);

    useEffect(() => {
        if (activeConversationId) {
            loadMessages(true);
            api.markRoomAsRead(activeConversationId).catch(() => {});
        }
    }, [activeConversationId]);

    // Socket: real-time messages + typing
    useEffect(() => {
        if (!socket || !activeConversationId) return;
        socket.emit('join-chat-room', activeConversationId);

        const handleNewMessage = (data: any) => {
            if (data.room_id !== activeConversationId) return;
            const newMsg = {
                id: data.id, content: data.content, senderId: data.sender_id,
                createdAt: data.created_at, type: data.type, mediaUrl: data.media_url,
                sender: {
                    id: data.sender?.id || data.sender_id,
                    name: data.sender?.student_profile?.display_name || data.sender?.full_name || 'User',
                    avatarUrl: data.sender?.avatar_url, role: data.sender?.role
                }
            };
            setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
            api.markRoomAsRead(activeConversationId).catch(() => {});
        };

        const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
            if (userId === effectiveUserId) return;
            setTypingUsers(prev =>
                isTyping ? (prev.includes(userId) ? prev : [...prev, userId]) : prev.filter(u => u !== userId)
            );
        };

        socket.on('chat:message', handleNewMessage);
        socket.on('user:typing', handleTyping);
        return () => {
            socket.emit('leave-chat-room', activeConversationId);
            socket.off('chat:message', handleNewMessage);
            socket.off('user:typing', handleTyping);
        };
    }, [socket, activeConversationId, effectiveUserId]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // File upload
    const [isUploading, setIsUploading]           = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<{ file: File; previewUrl: string; type: 'image' | 'video' }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pendingAttachmentsRef = useRef(pendingAttachments);
    useEffect(() => { pendingAttachmentsRef.current = pendingAttachments; }, [pendingAttachments]);
    const [showEmojiPicker, setShowEmojiPicker]   = useState(false);

    // Cleanup on unmount — stop typing timer and revoke any lingering object URLs
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            pendingAttachmentsRef.current.forEach(att => URL.revokeObjectURL(att.previewUrl));
        };
    }, []);

    // Close emoji picker on outside click
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!showEmojiPicker) return;
        const handle = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showEmojiPicker]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        (Array.from(e.target.files) as File[]).forEach(file => {
            if (file.size > 5 * 1024 * 1024) { toast.error(`"${file.name}" is too large (max 5MB)`); return; }
            const type = file.type.startsWith('image/') ? 'image' : 'video';
            setPendingAttachments(prev => [...prev, { file, previewUrl: URL.createObjectURL(file), type }]);
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleTypingChange = (value: string) => {
        setInputText(value);
        if (!socket || !activeConversationId) return;
        socket.emit('typing', { roomId: activeConversationId, userId: effectiveUserId, isTyping: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', { roomId: activeConversationId, userId: effectiveUserId, isTyping: false });
        }, 1500);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!effectiveUserId) return;
        if (!inputText.trim() && pendingAttachments.length === 0) return;

        let roomId = activeConversationId;
        let wasPending = false;
        if (!roomId && pendingTargetUserId) {
            try {
                const room = await api.getOrCreateDirectChat(pendingTargetUserId, resolvedSchoolId);
                roomId = room.id;
                wasPending = true;
                setActiveConversationId(room.id);
                if (socket) socket.emit('join-chat-room', room.id);
            } catch (err: any) {
                toast.error(err?.message || 'Could not start chat');
                return;
            }
        }
        if (!roomId) return;

        const text = inputText.trim();
        const attachments = [...pendingAttachments];
        attachments.forEach(att => URL.revokeObjectURL(att.previewUrl));
        setInputText('');
        setPendingAttachments([]);
        setShowEmojiPicker(false);
        setIsUploading(true);

        if (socket) socket.emit('typing', { roomId, userId: effectiveUserId, isTyping: false });

        try {
            if (text) {
                await api.sendMessage({ conversation_id: roomId, sender_id: effectiveUserId, content: text, type: 'text' });
            }
            for (const att of attachments) {
                const uploadResult: any = await api.uploadFile(att.file);
                const publicUrl = uploadResult.publicUrl || uploadResult.url;
                if (!publicUrl) { toast.error(`Failed to upload ${att.file.name}`); continue; }
                await api.sendMessage({ conversation_id: roomId, sender_id: effectiveUserId, content: att.file.name, type: att.type, media_url: publicUrl });
            }
            if (wasPending && roomId) {
                const fresh = await api.getMessages(roomId);
                if (fresh) {
                    setMessages(fresh.map((m: any) => ({
                        id: m.id, content: m.content, senderId: m.sender_id,
                        createdAt: m.created_at, type: m.type, mediaUrl: m.media_url,
                        sender: {
                            id: m.sender?.id || m.sender_id,
                            name: m.sender?.student_profile?.display_name || m.sender?.full_name || 'User',
                            avatarUrl: m.sender?.avatar_url, role: m.sender?.role
                        }
                    })));
                }
            }
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasTarget    = !!activeConversationId || isPendingChat || !!forceChatPanel;
    const showSidebar  = !hasTarget && !isMobileView;
    const showChat     = hasTarget || !isMobileView;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex h-full overflow-hidden bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/60">

            {/* ── Standalone sidebar (only when no active conversation on desktop) ── */}
            {showSidebar && (
                <div className={`flex flex-col border-r border-gray-100/80 bg-white/60 backdrop-blur-sm ${activeConversationId ? 'hidden lg:flex w-80' : 'w-full lg:w-80'}`}>
                    <div className="p-4 border-b border-gray-100/80 bg-white/40 backdrop-blur-sm">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white/70 border border-gray-200/60 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all outline-none backdrop-blur-sm"
                                style={{ minHeight: 44 }}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loadingConversations ? <SidebarSkeleton /> : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-gray-400 font-medium">No conversations yet</p>
                            </div>
                        ) : (
                            filteredConversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => setActiveConversationId(conv.id)}
                                    style={{ touchAction: 'manipulation' }}
                                    className={`w-full p-4 hover:bg-white/60 transition-all border-b border-gray-50/80 last:border-0 text-left ${activeConversationId === conv.id ? 'bg-white/70 shadow-sm' : ''}`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="relative flex-shrink-0">
                                            <img src={conv.avatar} alt={conv.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm" />
                                            {conv.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold flex items-center justify-center rounded-full ring-2 ring-white">
                                                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h4 className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>{conv.name}</h4>
                                                <span className="text-xs text-gray-400 font-medium ml-1 flex-shrink-0">{conv.time}</span>
                                            </div>
                                            <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-800 font-semibold' : 'text-gray-400'}`}>{conv.lastMessage}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── Chat area ─────────────────────────────────────────────────────── */}
            {showChat && (
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50/40">
                    {(activeConversationId || isPendingChat) ? (
                        <>
                            {/* ── Chat header ───────────────────────────────────────── */}
                            {!hideHeader && (
                                <div className="px-4 py-3 bg-white/90 backdrop-blur-md border-b border-gray-100/80 flex items-center justify-between shadow-sm flex-shrink-0 z-10">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                if (onBack) { onBack(); }
                                                else if (navigateTo) { navigateTo('messages', 'Messages', {}); }
                                                else { setActiveConversationId(null); }
                                            }}
                                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                                            aria-label="Back"
                                        >
                                            <ChevronLeftIcon className="w-5 h-5" />
                                        </button>
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={
                                                    isPendingChat && pendingTargetAvatar
                                                        ? pendingTargetAvatar
                                                        : activeRoomDetails?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(isPendingChat ? (pendingTargetName || 'Chat') : (activeRoomDetails?.name || 'Chat'))}&background=random`
                                                }
                                                alt="Chat"
                                                className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-sm leading-tight">
                                                {isPendingChat
                                                    ? (pendingTargetName || 'New Chat')
                                                    : (activeRoomDetails?.displayName || activeRoomDetails?.name || 'Chat')}
                                            </h3>
                                            {typingUsers.length > 0 ? (
                                                <p className="text-xs text-green-500 font-medium">typing…</p>
                                            ) : isPendingChat ? (
                                                <p className="text-xs text-gray-400">Send a message to start chatting</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Messages scrollable area ───────────────────────────── */}
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 pt-4 pb-2">
                                {loadingMessages ? (
                                    <MessageSkeleton themeLight={theme.light} />
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm ring-1 ring-gray-100">
                                            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-500 mb-1">No messages yet</p>
                                        <p className="text-xs text-gray-400">Say hello to get the conversation started!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {messages.map((msg, idx) => {
                                            const isMe       = msg.senderId === effectiveUserId;
                                            const first      = isFirstInGroup(messages, idx);
                                            const last       = isLastInGroup(messages, idx);
                                            const msgDate    = new Date(msg.createdAt);

                                            // Date separator
                                            const prevDate   = idx > 0 ? new Date(messages[idx - 1].createdAt) : null;
                                            const showDate   = !prevDate || !isSameDay(prevDate, msgDate);

                                            // Bubble shape: rounded corners, "tail" only on last in group
                                            const bubbleRadius = isMe
                                                ? `rounded-2xl ${last ? 'rounded-tr-sm' : 'rounded-tr-2xl'} rounded-tl-2xl rounded-bl-2xl`
                                                : `rounded-2xl rounded-tr-2xl ${last ? 'rounded-tl-sm' : 'rounded-tl-2xl'} rounded-br-2xl`;

                                            return (
                                                <React.Fragment key={msg.id || idx}>
                                                    {/* Date separator */}
                                                    {showDate && (
                                                        <div className="flex items-center gap-3 my-4">
                                                            <div className="flex-1 h-px bg-gray-200/60" />
                                                            <span className="text-xs text-gray-400 font-medium px-2 flex-shrink-0">
                                                                {formatDateLabel(msgDate)}
                                                            </span>
                                                            <div className="flex-1 h-px bg-gray-200/60" />
                                                        </div>
                                                    )}

                                                    {/* Message row */}
                                                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 ${first && idx > 0 && !showDate ? 'mt-3' : ''}`}>
                                                        {/* Left avatar — only for received, only on last in group */}
                                                        {!isMe && (
                                                            <div className="w-7 flex-shrink-0 self-end mb-0.5">
                                                                {last ? (
                                                                    <img
                                                                        src={msg.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || '?')}&background=random&size=32`}
                                                                        className="w-7 h-7 rounded-full object-cover ring-1 ring-white shadow-sm"
                                                                        alt={msg.sender?.name}
                                                                    />
                                                                ) : (
                                                                    <div className="w-7 h-7" />
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className={`max-w-[72%] lg:max-w-[60%] flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-0.5`}>
                                                            {/* Sender name — only for received, only first in group */}
                                                            {!isMe && first && (
                                                                <span className="text-xs text-gray-400 font-medium ml-1">{msg.sender?.name}</span>
                                                            )}

                                                            {/* Bubble */}
                                                            <div className={`chat-bubble-in px-3.5 py-2.5 shadow-sm text-sm leading-relaxed ${bubbleRadius} ${
                                                                isMe
                                                                    ? `${theme.bubble} text-white`
                                                                    : 'bg-white text-gray-800 border border-gray-100/80'
                                                            }`}>
                                                                {msg.type === 'image' && msg.mediaUrl && (
                                                                    <img
                                                                        src={msg.mediaUrl}
                                                                        alt="attachment"
                                                                        className="rounded-xl mb-1.5 max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity max-h-64 object-cover"
                                                                        onClick={() => window.open(msg.mediaUrl, '_blank')}
                                                                    />
                                                                )}
                                                                {msg.type === 'video' && msg.mediaUrl && (
                                                                    <video src={msg.mediaUrl} controls className="rounded-xl mb-1.5 max-w-full max-h-48" />
                                                                )}
                                                                {msg.content && <span>{msg.content}</span>}
                                                            </div>

                                                            {/* Timestamp — only on last in group */}
                                                            {last && (
                                                                <div className={`flex items-center gap-1 px-1 ${isMe ? 'justify-end' : ''}`}>
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                    {isMe && <CheckCircleIcon className="w-3 h-3 text-gray-400" />}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Typing indicator — lateral wave, not bounce */}
                                        {typingUsers.length > 0 && (
                                            <div className="flex justify-start items-end gap-2 mt-3">
                                                <div className="w-7 flex-shrink-0" />
                                                <div className="bg-white border border-gray-100/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                                    <div className="flex items-center gap-1">
                                                        <div className="chat-typing-dot w-2 h-2 bg-gray-400 rounded-full" />
                                                        <div className="chat-typing-dot w-2 h-2 bg-gray-400 rounded-full" />
                                                        <div className="chat-typing-dot w-2 h-2 bg-gray-400 rounded-full" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div ref={endOfMessagesRef} className="h-1" />
                                    </div>
                                )}
                            </div>

                            {/* ── Input bar — ALWAYS pinned to bottom, never scrolls ─── */}
                            {/*   flex-shrink-0 prevents compression                        */}
                            {/*   sticky bottom-0 anchors it if flex breaks down            */}
                            {/*   env(safe-area-inset-bottom) clears iPhone home bar        */}
                            <div
                                className="bg-white/90 backdrop-blur-md border-t border-gray-100/80 flex-shrink-0 sticky bottom-0 relative z-10"
                                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                            >
                                {/* Attachment previews */}
                                {pendingAttachments.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto px-3 pt-3 pb-1 custom-scrollbar">
                                        {pendingAttachments.map((att, i) => (
                                            <div key={i} className="relative flex-shrink-0">
                                                {att.type === 'image'
                                                    ? <img src={att.previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-xl border border-gray-200 shadow-sm" />
                                                    : <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 text-xs text-gray-500">Video</div>
                                                }
                                                {/* Always-visible remove button — 28px, safe for thumb */}
                                                <button
                                                    onClick={() => setPendingAttachments(prev => {
                                                        URL.revokeObjectURL(prev[i].previewUrl);
                                                        return prev.filter((_, j) => j !== i);
                                                    })}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800/80 text-white rounded-full flex items-center justify-center text-xs leading-none shadow-md"
                                                    aria-label="Remove attachment"
                                                    style={{ touchAction: 'manipulation' }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Emoji picker — positioned ABOVE input bar, never clipped */}
                                <AnimatePresence>
                                    {showEmojiPicker && (
                                        <motion.div
                                            ref={emojiPickerRef}
                                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                                            className="absolute bottom-full left-2 mb-2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/80 p-3 w-64 z-50"
                                        >
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {COMMON_EMOJIS.map(emoji => (
                                                    <motion.button
                                                        key={emoji}
                                                        whileHover={{ scale: 1.2 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        type="button"
                                                        onClick={() => { setInputText(p => p + emoji); setShowEmojiPicker(false); }}
                                                        className="text-xl hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
                                                        style={{ touchAction: 'manipulation' }}
                                                    >
                                                        {emoji}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Input form */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="flex items-center gap-1.5 mx-3 my-3 bg-gray-50/80 border border-gray-200/60 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-100/80 focus-within:border-indigo-200 transition-all"
                                >
                                    {/* Emoji button — 44×44 touch target */}
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-yellow-500 transition-colors flex-shrink-0 rounded-xl"
                                        aria-label="Emoji"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <HappyIcon className="w-5 h-5" />
                                    </button>

                                    {/* Attach button — 44×44 touch target */}
                                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleFileSelect} />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0 rounded-xl disabled:opacity-50"
                                        aria-label="Attach file"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        {isUploading
                                            ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            : <PaperclipIcon className="w-5 h-5" />
                                        }
                                    </button>

                                    {/* Text input */}
                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={e => handleTypingChange(e.target.value)}
                                        placeholder={isPendingChat ? `Message ${pendingTargetName || ''}…` : 'Type a message…'}
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-800 placeholder-gray-400 outline-none py-2 min-w-0"
                                        style={{ minHeight: 40 }}
                                    />

                                    {/* Send button — smooth transition */}
                                    <motion.button
                                        whileTap={{ scale: 0.88 }}
                                        type="submit"
                                        disabled={(!inputText.trim() && pendingAttachments.length === 0) || isUploading}
                                        className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl shadow transition-colors duration-150 ease-out flex-shrink-0 ${
                                            inputText.trim() || pendingAttachments.length > 0
                                                ? `${theme.primary} text-white`
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                        style={{ touchAction: 'manipulation' }}
                                        aria-label="Send"
                                    >
                                        <SendIcon className="w-4 h-4" />
                                    </motion.button>
                                </form>
                            </div>
                        </>
                    ) : (
                        /* No conversation selected — desktop placeholder */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
                            <div className="w-24 h-24 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-md ring-1 ring-gray-100">
                                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-gray-700 mb-1">Select a conversation</h2>
                            <p className="text-sm text-gray-400 max-w-xs">Pick a chat from the list or start a new one to begin messaging.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatScreen;
