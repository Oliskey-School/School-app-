import React from 'react';
import MessagesLayout from '../shared/MessagesLayout';

interface ParentMessagesScreenProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
    parentId?: string | null;
    onSelectChat?: (conversation: any) => void;
    currentUserId?: string;
}

const ParentMessagesScreen: React.FC<ParentMessagesScreenProps> = ({
    navigateTo, parentId, onSelectChat, currentUserId
}) => {
    const myId = currentUserId || parentId || undefined;
    return (
        <MessagesLayout
            currentUserId={myId}
            themeColor="green"
            navigateTo={navigateTo}
            onSelectChat={onSelectChat}
            newChatView="newChat"
        />
    );
};

export default ParentMessagesScreen;
