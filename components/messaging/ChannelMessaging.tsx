import React, { useState, useEffect, useRef } from 'react';
import { getUserChannels, getChannelMessages, postChannelMessage, markMessageAsRead, subscribeToChannel, type ChannelMessage } from '../../lib/messaging-channels';

export function ChannelMessaging() {
    const [channels, setChannels] = useState<any[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<any>(null);
    const [messages, setMessages] = useState<ChannelMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadChannels();
    }, []);

    useEffect(() => {
        if (selectedChannel) {
            loadMessages(selectedChannel.id);

            // Subscribe to realtime updates
            const unsubscribe = subscribeToChannel(selectedChannel.id, (newMsg) => {
                setMessages(prev => [newMsg, ...prev]);
                scrollToBottom();
            });

            return unsubscribe;
        }
    }, [selectedChannel]);

    const loadChannels = async () => {
        const data = await getUserChannels();
        setChannels(data);
        if (data.length > 0) {
            setSelectedChannel(data[0]);
        }
        setLoading(false);
    };

    const loadMessages = async (channelId: string) => {
        const data = await getChannelMessages(channelId);
        setMessages(data.reverse());
        scrollToBottom();

        // Mark all as read
        data.forEach(msg => markMessageAsRead(msg.id));
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChannel) return;

        setSending(true);
        const message = await postChannelMessage({
            channel_id: selectedChannel.id,
            content: newMessage,
            priority: 'normal'
        });

        if (message) {
            setMessages(prev => [...prev, message]);
            setNewMessage('');
            scrollToBottom();
        }
        setSending(false);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const getChannelIcon = (type: string) => {
        switch (type) {
            case 'class': return '📚';
            case 'school': return '🏫';
            case 'grade': return '🎓';
            default: return '💬';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Channels Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Channels</h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {channels.map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => setSelectedChannel(channel)}
                            className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition ${selectedChannel?.id === channel.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{getChannelIcon(channel.type)}</span>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">{channel.name}</h3>
                                    <p className="text-sm text-gray-600 truncate">{channel.description || channel.type}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
                {selectedChannel ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 p-4">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">{getChannelIcon(selectedChannel.type)}</span>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedChannel.name}</h2>
                                    <p className="text-sm text-gray-600">{selectedChannel.description || `${selectedChannel.type} channel`}</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => (
                                <div key={message.id} className="flex gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                            <span className="text-indigo-600 font-medium">
                                                {message.sender?.full_name?.charAt(0) || '?'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-gray-900">{message.sender?.full_name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(message.created_at).toLocaleTimeString()}
                                            </span>
                                            {message.priority === 'high' && (
                                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded">High Priority</span>
                                            )}
                                            {message.priority === 'urgent' && (
                                                <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded">Urgent</span>
                                            )}
                                        </div>
                                        <p className="text-gray-700 mt-1 whitespace-pre-wrap">{message.content}</p>
                                        {message.is_pinned && (
                                            <span className="text-xs text-indigo-600 mt-1 inline-block">📌 Pinned</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                                >
                                    {sending ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p>Select a channel to start messaging</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
