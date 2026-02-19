import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ChatMessage } from '../../types';
import { supabase } from '../../lib/supabase';
import { SendIcon, PaperclipIcon, HappyIcon, DotsVerticalIcon, SearchIcon, ChevronLeftIcon, CheckCircleIcon } from '../../constants';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import CenteredLoader from '../ui/CenteredLoader';

interface ChatScreenProps {
    conversationId?: string;
    currentUserId?: string;
    themeColor?: 'indigo' | 'orange' | 'purple' | 'green' | 'blue';
    conversation?: any;
    roomDetails?: any;
    hideHeader?: boolean;
}

const THEME_STYLES = {
    indigo: { primary: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' },
    orange: { primary: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
    purple: { primary: 'bg-purple-600', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
    green: { primary: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' },
    blue: { primary: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' }
};

const ChatScreen: React.FC<ChatScreenProps> = ({ conversationId, conversation, roomDetails, currentUserId, themeColor = 'indigo', hideHeader = false }) => {
    const { user } = useAuth();
    const theme = THEME_STYLES[themeColor] || THEME_STYLES.indigo;

    // Resolve conversation ID: explicit prop > conversation object > null
    const resolvedId = conversationId || conversation?.id || null;

    const [activeConversationId, setActiveConversationId] = useState<string | null>(resolvedId);
    const [conversations, setConversations] = useState<any[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Message State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [activeRoomDetails, setActiveRoomDetails] = useState<any>(null);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    // Mobile Responsive State
    // On mobile, if activeConversationId is null, show list. If set, show chat.
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 1. Fetch Conversation List
    useEffect(() => {
        const fetchConversations = async () => {
            if (!currentUserId) return;

            // This is a simplified fetch - ideally you join with 'users' to get the other participant's name
            // For MVP, assuming 'conversations' table has some metadata or we fetch participants
            try {
                // Fetch conversations where I am a participant
                // Note: DB schema might vary. Assuming 'conversation_participants' exists or 'conversations' has fields.
                // Fallback: Fetch all for demo or use a known RPC/query if available.
                // Let's assume we fetch from 'conversations' table directly for now.

                const { data, error } = await supabase
                    .from('conversations')
                    .select('*')
                    .order('last_message_at', { ascending: false });

                if (data) {
                    // Filter or Map to display format
                    // For a real app, you'd filter by participant. For now showing all public/relevant convos
                    const formatted = data.map((c: any) => ({
                        id: c.id,
                        name: c.title || `Chat ${c.id}`, // Fallback title
                        lastMessage: c.last_message_text || 'No messages yet',
                        time: c.last_message_at,
                        unread: 0, // Todo: implement unread count
                        avatar: `https://ui-avatars.com/api/?name=${c.title || 'C'}&background=random`
                    }));
                    setConversations(formatted);
                }
                setLoadingConversations(false);
            } catch (err) {
                console.error("Error fetching conversations", err);
                setLoadingConversations(false);
            }
        };
        fetchConversations();
    }, [currentUserId]);

    // 2. Fetch Messages for Active Chat
    useEffect(() => {
        if (!activeConversationId) return;

        const fetchMessages = async () => {
            setLoadingMessages(true);
            const { data } = await supabase
                .from('messages')
                .select('*, sender:users!sender_id(id, name, avatar_url)')
                .eq('conversation_id', activeConversationId)
                .order('created_at', { ascending: true });

            if (data) {
                setMessages(data.map((m: any) => ({
                    id: m.id,
                    content: m.content,
                    senderId: m.sender_id,
                    createdAt: m.created_at,
                    type: m.type,
                    roomId: m.conversation_id,
                    isDeleted: false,
                    isEdited: false,
                    updatedAt: m.created_at,
                    sender: {
                        id: m.sender?.id || '', // Default to empty string for UUID consistency
                        name: m.sender?.name || 'User',
                        avatarUrl: m.sender?.avatar_url,
                        role: m.sender?.role || 'Member'
                    }
                })));

                // Find details for active room from list
                const room = conversations.find(c => c.id === activeConversationId);
                if (room) setActiveRoomDetails(room);
            }
            setLoadingMessages(false);
        };

        fetchMessages();

        // Realtime Subscription for Messages
        const channel = supabase.channel(`chat:${activeConversationId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversationId}` }, payload => {
                fetchMessages(); // Simple refresh for now
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeConversationId, conversations]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const [isUploading, setIsUploading] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<{ file: File, previewUrl: string, type: 'image' | 'video' }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newAttachments: { file: File, previewUrl: string, type: 'image' | 'video' }[] = [];
            Array.from(e.target.files).forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    toast.error(`"${file.name}" is too large (max 5MB)`);
                    return;
                }
                const type = file.type.startsWith('image/') ? 'image' : 'video';
                newAttachments.push({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    type
                });
            });
            setPendingAttachments(prev => [...prev, ...newAttachments]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const COMMON_EMOJIS = ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤓', '😭', '😬', '🙄', '👍', '👎', '👏', '🙏', '🔥', '✨', '❤️', '💔', '✅', '❌'];

    const removeAttachment = (index: number) => {
        setPendingAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleEmojiClick = (emoji: string) => {
        setInputText(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Try to recover User ID if missing (Demo/Mock Mode Fallback)
        let effectiveUserId = currentUserId;
        if (!effectiveUserId) {
            const storedUser = sessionStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    effectiveUserId = parsed.id;
                } catch (e) { /* ignore */ }
            }
        }

        if (!effectiveUserId) {
            toast.error("Error: Missing User ID. Please re-login.");
            return;
        }
        if (!activeConversationId) {
            toast.error("Error: No active conversation selected.");
            return;
        }
        if (!inputText.trim() && pendingAttachments.length === 0) return;

        const text = inputText.trim();
        const attachmentsToSend = [...pendingAttachments];

        // Clear UI immediately for better UX
        setInputText('');
        setPendingAttachments([]);
        setIsUploading(true);
        setShowEmojiPicker(false);

        try {
            // 1. Send Text Message first (if any)
            if (text) {
                const { error } = await supabase.from('messages').insert({
                    conversation_id: activeConversationId,
                    sender_id: effectiveUserId,
                    content: text,
                    type: 'text',
                    school_id: user?.user_metadata?.school_id // Use user_metadata for school_id
                });
                if (error) throw error;
            }

            // 2. Upload and Send Attachments
            for (const attachment of attachmentsToSend) {
                const file = attachment.file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                const filePath = `${activeConversationId}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('chat-attachments')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Upload error:", uploadError);
                    if (uploadError.message.includes("Bucket not found")) {
                        toast.error("Error: bucket missing. Run migration.");
                    } else {
                        toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
                    }
                    continue; // Skip this one but try others
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('chat-attachments')
                    .getPublicUrl(filePath);

                const { error: msgError } = await supabase.from('messages').insert({
                    conversation_id: activeConversationId,
                    sender_id: effectiveUserId,
                    content: file.name,
                    type: attachment.type,
                    media_url: publicUrl,
                    school_id: user?.user_metadata?.school_id
                });

                if (msgError) console.error("Error saving message record:", msgError);
            }

        } catch (err: any) {
            toast.error(`Unexpected error: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // Derived state for filtered list
    const filteredConversations = conversations.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Render Helpers
    const showSidebar = !isMobileView || (isMobileView && !activeConversationId);
    const showChat = !isMobileView || (isMobileView && activeConversationId);

    const handleNotImplemented = () => {
        toast("This feature is coming soon!", { icon: '🚧' });
    };

    return (
        <div className="flex h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {/* LEFT SIDEBAR */}
            {showSidebar && (
                <div className={`w-full lg:w-80 flex flex-col border-r border-gray-100 ${activeConversationId ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search chats..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loadingConversations ? (
                            <CenteredLoader size="md" className="h-40" />
                        ) : (
                            filteredConversations.map(conv => (
                                <div
                                    key={conv.id}
                                    onClick={() => setActiveConversationId(conv.id)}
                                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${activeConversationId === conv.id ? 'bg-indigo-50/50 hover:bg-indigo-50' : ''}`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div className="relative">
                                            <img
                                                src={conv.avatar || `https://ui-avatars.com/api/?name=${conv.name}`}
                                                alt={conv.name}
                                                className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm"
                                            />
                                            {conv.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white animate-bounce-subtle">
                                                    {conv.unreadCount}
                                                </span>
                                            )}
                                            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${conv.online ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h4 className={`text-sm font-semibold truncate ${activeConversationId === conv.id ? 'text-indigo-900' : 'text-gray-800'}`}>
                                                    {conv.name}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 font-medium">{conv.time}</span>
                                            </div>
                                            <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                                {conv.lastMessage}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* RIGHT MAIN AREA - Chat */}
            {showChat && (
                <div className="flex-1 flex flex-col bg-[#F8FAFC] relative h-full pb-20 lg:pb-0">
                    {activeConversationId ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm sticky top-0 z-10">
                                <div className="flex items-center space-x-3">
                                    {isMobileView && (
                                        <button onClick={() => setActiveConversationId(null)} className="mr-2 p-1 text-gray-600">
                                            <ChevronLeftIcon className="w-6 h-6" />
                                        </button>
                                    )}
                                    <img
                                        src={activeRoomDetails?.avatar || `https://ui-avatars.com/api/?name=User&background=random`}
                                        alt="Chat"
                                        className="w-10 h-10 rounded-full object-cover border border-gray-100"
                                    />
                                    <div>
                                        <h3 className="font-bold text-gray-800">{activeRoomDetails?.name || 'Chat'}</h3>
                                        <div className="flex items-center space-x-1.5">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                            <span className="text-xs text-gray-500 font-medium">Online</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
                                    <DotsVerticalIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Messages List */}
                            <div className={`flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar ${isMobileView ? 'pb-32' : ''}`}>
                                {loadingMessages ? (
                                    <CenteredLoader message="Loading messages..." />
                                ) : (
                                    <>
                                        {messages.map((msg, idx) => {
                                            const isMe = msg.senderId === currentUserId;
                                            return (
                                                <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                                    {!isMe && (
                                                        <img src={msg.sender?.avatarUrl || `https://ui-avatars.com/api/?name=${msg.sender?.name || '?'}`} className="w-8 h-8 rounded-full mb-2 mr-2 self-end shadow-sm" alt="User" />
                                                    )}
                                                    <div className={`max-w-[75%] lg:max-w-[60%] ${isMe ? 'order-1' : 'order-2'}`}>
                                                        <div className={`px-5 py-3 shadow-sm text-[15px] leading-relaxed relative ${isMe
                                                            ? `${theme.primary} text-white rounded-2xl rounded-tr-none shadow-indigo-100`
                                                            : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-none'
                                                            }`}>

                                                            {/* Media Rendering */}
                                                            {msg.type === 'image' && msg.mediaUrl && (
                                                                <img src={msg.mediaUrl} alt="attachment" className="rounded-lg mb-2 max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                                                            )}
                                                            {msg.type === 'video' && msg.mediaUrl && (
                                                                <video src={msg.mediaUrl} controls className="rounded-lg mb-2 max-w-full h-auto" />
                                                            )}

                                                            {msg.content}
                                                            <div className={`text-[10px] mt-1 flex justify-end items-center ${isMe ? 'text-white/80' : 'text-gray-400'}`}>
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                {isMe && <CheckCircleIcon className="w-3 h-3 ml-1" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={endOfMessagesRef} />
                                    </>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className={`bg-white border-t border-gray-100 relative p-4 ${isMobileView ? 'px-2 py-3 shadow-inner' : ''}`}>
                                {/* Attachment Previews */}
                                {pendingAttachments.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto mb-2 pb-2 custom-scrollbar">
                                        {pendingAttachments.map((att, idx) => (
                                            <div key={idx} className="relative flex-shrink-0 group">
                                                {att.type === 'image' ? (
                                                    <img src={att.previewUrl} alt="preview" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                                                ) : (
                                                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                                        <span className="text-xs text-gray-500">Video</span>
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => removeAttachment(idx)}
                                                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Emoji Picker Popover */}
                                {showEmojiPicker && (
                                    <div className="absolute bottom-20 left-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 w-64 z-50 animate-slide-in-up">
                                        <div className="grid grid-cols-5 gap-2">
                                            {COMMON_EMOJIS.map(emoji => (
                                                <button
                                                    key={emoji}
                                                    type="button"
                                                    onClick={() => handleEmojiClick(emoji)}
                                                    className="text-2xl hover:bg-gray-100 rounded-lg p-1 transition-colors"
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSendMessage} className="flex items-end space-x-2 bg-gray-50 p-2 rounded-3xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all shadow-sm">
                                    <button
                                        type="button"
                                        className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        <HappyIcon className="w-6 h-6" />
                                    </button>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        multiple
                                        accept="image/*,video/*"
                                        onChange={handleFileSelect}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"
                                        disabled={isUploading}
                                    >
                                        {isUploading ? (
                                            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <PaperclipIcon className="w-5 h-5" />
                                        )}
                                    </button>


                                    <input
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-grow bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 max-h-32 py-2.5"
                                    />
                                    <button
                                        type="submit"
                                        disabled={(!inputText.trim() && pendingAttachments.length === 0) || isUploading}
                                        className={`p-2.5 rounded-full shadow-lg transition-transform transform ${inputText.trim() || pendingAttachments.length > 0 ? `${theme.primary} text-white hover:scale-105` : 'bg-gray-200 text-gray-400'}`}
                                    >
                                        <SendIcon className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>

                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFC]">
                            <div className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-float shadow-inner">
                                <SendIcon className="w-12 h-12 text-indigo-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Messages</h2>
                            <p className="text-gray-500 max-w-sm">Select a conversation from the sidebar to start chatting with teachers, students, or parents.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatScreen;
