
import React, { useState, useMemo } from 'react';
import { Teacher, Conversation, RoleName } from '../../types';
import { mockTeachers, mockStudents, mockConversations } from '../../data';
import { SearchIcon } from '../../constants';

const LOGGED_IN_PARENT_ID = 1002;

type UserListItem = {
    id: number;
    name: string;
    avatarUrl: string;
    subtitle: string;
    userType: 'Teacher';
};

interface ParentNewChatScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
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

const ParentNewChatScreen: React.FC<ParentNewChatScreenProps> = ({ navigateTo }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const teachers = useMemo((): UserListItem[] => {
        // Find children of logged-in parent
        const children = mockStudents.filter(s => s.id === 4); // Mrs. Bello's child
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
    }, []);

    const filteredUsers = useMemo(() => {
        return teachers.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, teachers]);
    
    const handleSelectUser = (user: UserListItem) => {
        const role: RoleName = 'Teacher';
        let conversation = mockConversations.find(c => c.participant.id === user.id && c.participant.role === role);

        if (!conversation) {
            const newConversation: Conversation = {
                id: `conv-parent-${Date.now()}`,
                participant: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: role },
                lastMessage: { text: `You can now chat with ${user.name}.`, timestamp: new Date().toISOString() },
                unreadCount: 0,
                messages: [],
            };
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
