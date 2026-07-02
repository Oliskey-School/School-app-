import React from 'react';
import MessagesLayout from '../shared/MessagesLayout';
import { Conversation } from '../../types';

interface TeacherMessagesScreenProps {
    onSelectChat?: (conversation: Conversation) => void;
    navigateTo: (view: string, title: string, props?: any) => void;
    teacherId?: string | null;
    currentUser?: any;
    currentUserId?: string;
}

const TeacherMessagesScreen: React.FC<TeacherMessagesScreenProps> = ({
    navigateTo, onSelectChat, teacherId, currentUserId
}) => {
    const myId = currentUserId || teacherId || undefined;
    return (
        <MessagesLayout
            currentUserId={myId}
            themeColor="purple"
            navigateTo={navigateTo}
            onSelectChat={onSelectChat ? (conv) => onSelectChat(conv as Conversation) : undefined}
            newChatView="newChat"
        />
    );
};

export default TeacherMessagesScreen;
