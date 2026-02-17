import React, { useState, useMemo, useEffect } from 'react';
import { Student, Teacher, Conversation, RoleName, ChatRoom, ChatParticipant } from '../../types';
import { fetchTeachers } from '../../lib/database';
import { SearchIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';

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
    schoolId?: string;
}

const UserRow: React.FC<{ user: UserListItem, onSelect: () => void }> = ({ user, onSelect }) => (
    <button onClick={onSelect} className="w-full flex items-center p-3 space-x-4 text-left bg-white rounded-lg hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
        <img src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} alt={user.name} className="w-12 h-12 rounded-full object-cover bg-gray-100" />
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.subtitle}</p>
        </div>
    </button>
);

const ParentNewChatScreen: React.FC<ParentNewChatScreenProps> = ({ navigateTo, children = [], schoolId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dbTeachers, setDbTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const { user: authUser } = useAuth();

    useEffect(() => {
        const loadTeachers = async () => {
            if (!schoolId) return;
            setLoading(true);
            try {
                const data = await fetchTeachers(schoolId);
                setDbTeachers(data);
            } catch (err) {
                console.error("Error loading teachers:", err);
            } finally {
                setLoading(false);
            }
        };
        loadTeachers();
    }, [schoolId]);

    const teachers = useMemo((): UserListItem[] => {
        // Find classes of children
        const childrenClasses = children.map(c => `${c.grade}${c.section}`);

        // Find teachers who teach those classes
        const relevantTeachers = dbTeachers.filter(t =>
            t.status === 'Active' && t.classes?.some(tc => {
                // Normalize class strings for comparison
                const tcClean = tc.replace(/\s+/g, '');
                return childrenClasses.some(cc => tcClean.includes(cc) || cc.includes(tcClean));
            })
        );

        // If no relevant teachers found via classes, show all active teachers in school
        const displayList = relevantTeachers.length > 0 ? relevantTeachers : dbTeachers.filter(t => t.status === 'Active');

        return displayList.map(t => ({
            id: t.user_id || t.id, // Prefer user_id for chat
            name: t.name,
            avatarUrl: t.avatarUrl,
            subtitle: t.subjects?.[0] ? `${t.subjects[0]} Teacher` : 'Staff',
            userType: 'Teacher'
        }));
    }, [children, dbTeachers]);

    const filteredUsers = useMemo(() => {
        return teachers.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, teachers]);

    const handleSelectUser = (user: UserListItem) => {
        // In real app, we navigate to chat with participant details
        // The ChatScreen handles fetching/creating conversation based on participantId
        navigateTo('chat', user.name, { 
            participantId: user.id,
            participantName: user.name,
            participantAvatar: user.avatarUrl
        });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Finding teachers...</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white shadow-sm sticky top-0 z-10">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search for a teacher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:bg-white transition-all outline-none"
                    />
                </div>
            </div>

            <main className="flex-grow p-4 space-y-3 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <UserRow key={user.id} user={user} onSelect={() => handleSelectUser(user)} />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <SearchIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">No teachers found.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ParentNewChatScreen;
