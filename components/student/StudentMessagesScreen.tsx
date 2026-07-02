import React from 'react';
import MessagesLayout from '../shared/MessagesLayout';

interface StudentMessagesScreenProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
    studentId?: string;
    onSelectChat?: (conversation: any) => void;
}

const StudentMessagesScreen: React.FC<StudentMessagesScreenProps> = ({ navigateTo, studentId, onSelectChat }) => {
    return (
        <MessagesLayout
            currentUserId={studentId}
            themeColor="orange"
            navigateTo={navigateTo}
            onSelectChat={onSelectChat}
            newChatView="newChat"
        />
    );
};

export default StudentMessagesScreen;
