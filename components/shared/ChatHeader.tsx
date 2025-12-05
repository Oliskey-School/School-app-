import React from 'react';
import { Conversation } from '../../types';
import { VideoIcon, SearchIcon, DotsVerticalIcon, ChevronLeftIcon } from '../../constants';

interface ChatHeaderProps {
    conversation: Conversation;
    onBack?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation, onBack }) => {
    return (
        <header className="flex-shrink-0 bg-[#F0F2F5] p-3 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center space-x-2">
                {onBack && (
                    <button onClick={onBack} className="p-2 md:hidden rounded-full hover:bg-gray-200" aria-label="Back to chat list">
                        <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                    </button>
                )}
                <div className="flex items-center space-x-4">
                    <img src={conversation.participant.avatarUrl} alt={conversation.participant.name} className="w-10 h-10 rounded-full" />
                    <div>
                        <p className="font-semibold text-gray-800">{conversation.participant.name}</p>
                        <p className="text-xs text-gray-500">online</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-3 text-gray-500">
                <button className="p-2 hover:bg-gray-200 rounded-full"><VideoIcon className="w-6 h-6" /></button>
                <button className="p-2 hover:bg-gray-200 rounded-full"><SearchIcon className="w-5 h-5" /></button>
                <button className="p-2 hover:bg-gray-200 rounded-full"><DotsVerticalIcon className="w-6 h-6" /></button>
            </div>
        </header>
    );
};

export default ChatHeader;