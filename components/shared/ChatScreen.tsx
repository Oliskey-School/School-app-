
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Conversation, Message } from '../../types';
import { THEME_CONFIG, SendIcon } from '../../constants';
import { DashboardType } from '../../types';
import { mockConversations, mockStudents, mockTeachers, mockParents } from '../../data';

interface ChatScreenProps {
  conversation: Conversation;
  currentUserId: number;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ conversation: initialConversation, currentUserId }) => {
    const [conversation, setConversation] = useState(initialConversation);
    const [inputText, setInputText] = useState('');
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Find the latest version of the conversation from the mock data source on mount
        // and when the initial conversation prop changes
        const updatedConvo = mockConversations.find(c => c.id === initialConversation.id);
        if (updatedConvo) {
            setConversation(updatedConvo);
        }
    }, [initialConversation.id]);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [conversation.messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim() === '') return;

        const newMessage: Message = {
            id: `msg-${Date.now()}`,
            senderId: currentUserId,
            type: 'text',
            text: inputText.trim(),
            timestamp: new Date().toISOString()
        };

        const convoIndex = mockConversations.findIndex(c => c.id === conversation.id);
        if (convoIndex > -1) {
            const updatedConvo = {
                ...mockConversations[convoIndex],
                messages: [...mockConversations[convoIndex].messages, newMessage],
                lastMessage: { text: newMessage.text!, timestamp: newMessage.timestamp }
            };
            mockConversations[convoIndex] = updatedConvo;
            setConversation(updatedConvo); 
        }

        setInputText('');
    };

    return (
        <div className="flex flex-col h-full w-full relative">
            <div className="flex-grow p-4 space-y-2 overflow-y-auto">
                {conversation.messages.map((msg) => {
                    const isCurrentUser = msg.senderId === currentUserId;
                    return (
                        <div key={msg.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-3 py-2 shadow-sm flex items-end gap-2 text-gray-800 ${
                                isCurrentUser
                                    ? 'bg-[#d9fdd3] rounded-l-xl rounded-t-xl'
                                    : 'bg-white rounded-r-xl rounded-t-xl'
                            }`}>
                                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                <span className="text-xs text-gray-400 flex-shrink-0 self-end">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={endOfMessagesRef} />
            </div>

            <div className="p-3 bg-[#F0F2F5] border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <input 
                        type="text" 
                        value={inputText} 
                        onChange={(e) => setInputText(e.target.value)} 
                        placeholder="Type a message" 
                        className="flex-grow px-4 py-2 bg-white border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <button 
                        type="submit" 
                        disabled={!inputText.trim()}
                        className="p-3 rounded-full text-white bg-green-500 disabled:bg-gray-400 transition-colors"
                        aria-label="Send message"
                    >
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatScreen;
