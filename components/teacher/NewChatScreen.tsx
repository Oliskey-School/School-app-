
import React, { useState, useMemo } from 'react';
import { Student, Parent, Teacher, Conversation, RoleName } from '../../types';
import { mockStudents, mockTeachers, mockParents, mockConversations } from '../../data';
import { SearchIcon } from '../../constants';

type UserListItem = {
    id: number;
    name: string;
    avatarUrl: string;
    subtitle: string;
    userType: 'Student' | 'Parent' | 'Teacher';
};

interface NewChatScreenProps {
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

const NewChatScreen: React.FC<NewChatScreenProps> = ({ navigateTo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Students' | 'Parents' | 'Staff'>('Students');

    const allUsers = useMemo((): UserListItem[] => [
        ...mockStudents.map(s => ({ 
            id: s.id, 
            name: s.name, 
            avatarUrl: s.avatarUrl,
            subtitle: `Grade ${s.grade}${s.section}`,
            userType: 'Student' as const 
        })),
        ...mockParents.map(p => {
            const child = mockStudents.find(s => p.childIds?.includes(s.id));
            return {
                id: p.id,
                name: p.name,
                avatarUrl: p.avatarUrl,
                subtitle: child ? `${child.name}'s Parent` : 'Parent',
                userType: 'Parent' as const
            };
        }),
        ...mockTeachers.filter(t => t.status === 'Active').map(t => ({ 
            id: t.id, 
            name: t.name, 
            avatarUrl: t.avatarUrl,
            subtitle: `${t.subjects[0]} Teacher`,
            userType: 'Teacher' as const 
        })),
    ], []);
    
    const filteredUsers = useMemo(() => {
        return allUsers.filter(user => {
            const term = searchTerm.toLowerCase();
            const typeMatch = activeTab === 'Students' && user.userType === 'Student' ||
                              activeTab === 'Parents' && user.userType === 'Parent' ||
                              activeTab === 'Staff' && user.userType === 'Teacher';
            const nameMatch = user.name.toLowerCase().includes(term);
            return typeMatch && nameMatch;
        });
    }, [searchTerm, activeTab, allUsers]);
    
    const handleSelectUser = (user: UserListItem) => {
        const role: RoleName = user.userType;
        let conversation = mockConversations.find(c => c.participant.id === user.id && c.participant.role === role);

        if (!conversation) {
            const newConversation: Conversation = {
                id: `conv-${Date.now()}`,
                participant: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: role as 'Student' | 'Parent' | 'Teacher' },
                lastMessage: { text: `You can now chat with ${user.name}.`, timestamp: new Date().toISOString() },
                unreadCount: 0,
                messages: [],
            };
            mockConversations.push(newConversation);
            conversation = newConversation;
        }
        
        navigateTo('chat', user.name, { conversation });
    };

    const tabs: ('Students' | 'Parents' | 'Staff')[] = ['Students', 'Parents', 'Staff'];

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-gray-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>
            </div>

            <div className="px-4 bg-gray-100">
                <div className="flex space-x-2 border-b border-gray-200">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                activeTab === tab ? 'border-b-2 border-purple-500 text-purple-600' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 space-y-2 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <UserRow key={`${user.userType}-${user.id}`} user={user} onSelect={() => handleSelectUser(user)} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 pt-8">No users found.</p>
                )}
            </main>
        </div>
    );
};

export default NewChatScreen;
