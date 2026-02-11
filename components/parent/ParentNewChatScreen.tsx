import React, { useState, useMemo } from 'react';
import { Student, Teacher, Conversation, RoleName, ChatRoom, ChatParticipant } from '../../types';
import { mockTeachers, mockConversations } from '../../data';
import { SearchIcon } from '../../constants';

type UserListItem = {
    id: string;
    name: string;
    avatarUrl: string;
    subtitle: string;
    userType: 'Teacher';
};

interface ParentNewChatScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    children?: Student[];
}

const UserRow: React.FC<{ user: UserListItem, onSelect: () => void }> = ({ user, onSelect }) => (
    <button onClick={onSelect} className="w-full flex items-center p-3 space-x-4 text-left bg-white rounded-lg hover:bg-gray-50 transition-colors">
        <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.subtitle}</p>
        </div>
    </button>
);

const ParentNewChatScreen: React.FC<ParentNewChatScreenProps> = ({ navigateTo, children = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const teachers = useMemo((): UserListItem[] => {
        // Find classes of children
        const childrenClasses = children.map(c => `${c.grade}${c.section}`);

        // Find teachers who teach those classes
        const relevantTeachers = mockTeachers.filter(t =>
            t.status === 'Active' && t.classes.some(tc => childrenClasses.includes(tc))
        );

        return relevantTeachers.map(t => ({
            id: t.id,
            name: t.name,
            avatarUrl: t.avatarUrl,
            subtitle: `${t.subjects[0]} Teacher`,
            userType: 'Teacher'
        }));
    }, [children]);

    const filteredUsers = useMemo(() => {
        return teachers.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, teachers]);

    const handleSelectUser = (user: UserListItem) => {
        const role: RoleName = 'Teacher';

        // Find existing conversation
        let conversation = mockConversations.find(c =>
            !c.isGroup && c.participants.some(p => p.userId === user.id)
        );

        if (!conversation) {
            // Mock new conversation
            // Note: In real app, we would make an API call to create conversation
            const newConversation: Conversation = {
                id: Date.now().toString(),
                type: 'direct',
                isGroup: false,
                creatorId: 1002, // Mock curr parent
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastMessageAt: new Date().toISOString(),
                participants: [
                    { roomId: 0, userId: user.id, role: 'member', joinedAt: new Date().toISOString(), user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: role } },
                    { roomId: 0, userId: 1002, role: 'admin', joinedAt: new Date().toISOString(), user: { id: 1002, name: 'You', avatarUrl: '', role: 'Parent' } }
                ],
                messages: [], // This is not in ChatRoom interface but might be expected by ChatScreen mock logic?
                // ChatScreen expects `conversation` object to be passed.
                // In types.ts, ChatRoom does NOT have messages. ChatScreen fetches them or expects them separately?
                // Let's check ChatScreen usage.
                // If ChatScreen expects specific props, I need to match.
                // I will add 'messages' as any cast if needed or just omit if ChatScreen loads them.
                // Assuming ChatScreen loads them or uses context, but "mockConversations" usually had messages.
            } as any;

            mockConversations.push(newConversation);
            conversation = newConversation;
        }

        navigateTo('chat', user.name, { conversation });
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-gray-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search for a teacher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    />
                </div>
            </div>

            <main className="flex-grow p-4 space-y-2 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <UserRow key={user.id} user={user} onSelect={() => handleSelectUser(user)} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 pt-8">No teachers found.</p>
                )}
            </main>
        </div>
    );
};

export default ParentNewChatScreen;
