import React, { useState, useMemo } from 'react';
import { Student, Teacher, Conversation, RoleName } from '../../types';
import { mockStudents, mockTeachers, mockParents, mockConversations } from '../../data';
import { SearchIcon } from '../../constants';

type UserListItem = {
    id: number;
    name: string;
    avatarUrl: string;
    subtitle: string;
    userType: 'Student' | 'Teacher';
};

interface StudentNewChatScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const loggedInStudent = mockStudents.find(s => s.id === 4)!;

const UserRow: React.FC<{ user: UserListItem, onSelect: () => void }> = ({ user, onSelect }) => (
    <button onClick={onSelect} className="w-full flex items-center p-3 space-x-4 text-left bg-white rounded-lg hover:bg-gray-50 transition-colors">
        <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.subtitle}</p>
        </div>
    </button>
);

const StudentNewChatScreen: React.FC<StudentNewChatScreenProps> = ({ navigateTo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Teachers' | 'Classmates'>('Teachers');

    const classmates = useMemo((): UserListItem[] => 
        mockStudents
            .filter(s => s.grade === loggedInStudent.grade && s.section === loggedInStudent.section && s.id !== loggedInStudent.id)
            .map(s => ({
                id: s.id,
                name: s.name,
                avatarUrl: s.avatarUrl,
                subtitle: `Grade ${s.grade}${s.section}`,
                userType: 'Student'
            })), 
        []
    );

    const teachers = useMemo((): UserListItem[] => 
        mockTeachers.filter(t => t.status === 'Active').map(t => ({
            id: t.id,
            name: t.name,
            avatarUrl: t.avatarUrl,
            subtitle: `${t.subjects[0]} Teacher`,
            userType: 'Teacher'
        })),
        []
    );

    const filteredUsers = useMemo(() => {
        const sourceList = activeTab === 'Teachers' ? teachers : classmates;
        return sourceList.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, activeTab, teachers, classmates]);
    
    const handleSelectUser = (user: UserListItem) => {
        const role: RoleName = user.userType;
        let conversation = mockConversations.find(c => c.participant.id === user.id && c.participant.role === role);

        if (!conversation) {
            const newConversation: Conversation = {
                id: `conv-student-${Date.now()}`,
                participant: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: role as 'Student' | 'Teacher' },
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
                        placeholder={`Search for a ${activeTab.slice(0, -1).toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>
            </div>

            <div className="px-4 bg-gray-100">
                <div className="flex space-x-2 border-b border-gray-200">
                    {(['Teachers', 'Classmates'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                activeTab === tab ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 space-y-2 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <UserRow key={user.id} user={user} onSelect={() => handleSelectUser(user)} />
                    ))
                ) : (
                    <p className="text-center text-gray-500 pt-8">No {activeTab.toLowerCase()} found.</p>
                )}
            </main>
        </div>
    );
};

export default StudentNewChatScreen;