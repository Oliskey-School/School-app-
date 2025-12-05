import React, { useState, useMemo } from 'react';
import { DashboardType, Conversation } from '../../types';
import AdminMessagesScreen from '../admin/AdminMessagesScreen';
import TeacherMessagesScreen from '../teacher/TeacherMessagesScreen';
import ParentMessagesScreen from '../parent/ParentMessagesScreen';
import StudentMessagesScreen from '../student/StudentMessagesScreen';
import ChatScreen from './ChatScreen';
import NoChatSelected from './NoChatSelected';
import ChatHeader from './ChatHeader';

interface MessagingLayoutProps {
    dashboardType: DashboardType;
}

const MessagingLayout: React.FC<MessagingLayoutProps> = ({ dashboardType }) => {
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    const handleSelectConversation = (conversation: Conversation) => {
        setSelectedConversation(conversation);
    };
    
    const handleBackToList = () => {
        setSelectedConversation(null);
    };

    const ChatListComponent = useMemo(() => {
        switch (dashboardType) {
            case DashboardType.Admin:
                return <AdminMessagesScreen onSelectChat={handleSelectConversation} />;
            case DashboardType.Teacher:
                return <TeacherMessagesScreen onSelectChat={handleSelectConversation} />;
            case DashboardType.Parent:
                return <ParentMessagesScreen onSelectChat={handleSelectConversation} />;
            case DashboardType.Student:
                return <StudentMessagesScreen onSelectChat={handleSelectConversation} />;
            default:
                return <div>Error: Invalid user type</div>;
        }
    }, [dashboardType]);
    
    const currentUserId = useMemo(() => {
        switch(dashboardType) {
            case DashboardType.Admin: return 0;
            case DashboardType.Teacher: return 2; // Mock ID from data
            case DashboardType.Parent: return 1002; // Mock ID from data
            case DashboardType.Student: return 4; // Mock ID from data
            default: return -1;
        }
    }, [dashboardType]);

    return (
        <div className="flex w-full h-full bg-gray-100 overflow-hidden">
            {/* Chat List Pane */}
            <div className={`
                w-full md:w-[400px] md:flex-shrink-0 bg-white
                ${selectedConversation ? 'hidden md:block' : 'block'}
            `}>
                {ChatListComponent}
            </div>

            {/* Main Content Pane */}
            <div className={`
                flex-1 flex flex-col bg-[#EFEAE2] relative
                ${selectedConversation ? 'flex' : 'hidden md:flex'}
            `}>
                {selectedConversation ? (
                    <>
                        <ChatHeader conversation={selectedConversation} onBack={handleBackToList} />
                        <div className="flex-grow overflow-y-auto relative">
                             <div className="absolute inset-0 whatsapp-bg-light"></div>
                            <ChatScreen conversation={selectedConversation} currentUserId={currentUserId} />
                        </div>
                    </>
                ) : (
                    <NoChatSelected />
                )}
            </div>
        </div>
    );
};

export default MessagingLayout;