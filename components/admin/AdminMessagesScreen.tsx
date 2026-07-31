import React from 'react';
import { motion } from 'framer-motion';
import MessagesLayout from '../shared/MessagesLayout';
import { Conversation } from '../../types';

interface AdminMessagesScreenProps {
    onSelectChat: (conversation: Conversation) => void;
    onNewChat?: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
    currentUserId?: string;
}

const AdminMessagesScreen: React.FC<AdminMessagesScreenProps> = ({
    onSelectChat, navigateTo, currentUserId
}) => {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 px-4 pt-3 pb-1">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigateTo?.('parentChatAccess', 'Parent Chat Access')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl transition-colors border border-indigo-100"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Parent Chat Access
                </motion.button>
            </div>
            <div className="flex-1 min-h-0">
                <MessagesLayout
                    currentUserId={currentUserId}
                    themeColor="indigo"
                    navigateTo={navigateTo}
                    onSelectChat={(conv) => onSelectChat(conv as Conversation)}
                    newChatView="adminNewChat"
                />
            </div>
        </div>
    );
};

export default AdminMessagesScreen;
