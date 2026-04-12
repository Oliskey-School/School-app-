import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../../types';
import { api } from '../../lib/api';
import { SearchIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';

type UserListItem = {
    id: number;
    name: string;
    avatarUrl: string;
    subtitle: string;
    userType: 'Student' | 'Teacher';
};

interface StudentNewChatScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    student: Student; // Passed from dashboard
}

const UserRow: React.FC<{ user: UserListItem, onSelect: () => void }> = ({ user, onSelect }) => (
    <button onClick={onSelect} className="w-full flex items-center p-3 space-x-4 text-left bg-white rounded-lg hover:bg-gray-50 transition-colors">
        <img src={user.avatarUrl || 'https://via.placeholder.com/150'} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.subtitle}</p>
        </div>
    </button>
);

const StudentNewChatScreen: React.FC<StudentNewChatScreenProps> = ({ navigateTo, student }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Teachers' | 'Classmates'>('Teachers');
    const [teachers, setTeachers] = useState<UserListItem[]>([]);
    const [classmates, setClassmates] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { profile } = useProfile();
    const { user } = useAuth();

    useEffect(() => {
        const fetchUsers = async () => {
            if (!student?.schoolId) return;
            setLoading(true);
            setError(null);
            try {
                const data = await api.getChatContacts(student.schoolId, student.id);
                
                if (data.teachers) {
                    setTeachers(data.teachers.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        avatarUrl: t.avatarUrl,
                        subtitle: 'Teacher',
                        userType: 'Teacher'
                    })));
                }

                if (data.classmates) {
                    setClassmates(data.classmates.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        avatarUrl: s.avatarUrl,
                        subtitle: `Grade ${s.grade}${s.section}`,
                        userType: 'Student'
                    })));
                }

            } catch (e) {
                console.error("Error fetching users", e);
                setError("Failed to load contacts. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [student]);

    const filteredUsers = useMemo(() => {
        const sourceList = activeTab === 'Teachers' ? teachers : classmates;
        return sourceList.filter(user =>
            (user.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
        );
    }, [searchTerm, activeTab, teachers, classmates]);

    const handleSelectUser = async (targetUser: UserListItem) => {
        if (!student?.schoolId) return;
        setError(null);
        try {
            const room = await api.getOrCreateDirectChat(targetUser.id.toString(), student.schoolId);
            if (room) {
                navigateTo('chat', targetUser.name, { conversationId: room.id });
            }
        } catch (e: any) {
            console.error('Error starting chat:', e);
            setError(e?.message || 'Failed to start chat. Please try again.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-gray-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400 w-5 h-5" />
                    </span>
                    <input
                        type="text"
                        placeholder={`Search for a ${activeTab.slice(0, -1).toLowerCase()}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            <div className="px-4 bg-gray-100">
                <div className="flex space-x-2 border-b border-gray-200">
                    {(['Teachers', 'Classmates'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 space-y-2 overflow-y-auto">
                {loading ? (
                    <div className="text-center text-gray-400 mt-10">Loading users...</div>
                ) : filteredUsers.length > 0 ? (
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
