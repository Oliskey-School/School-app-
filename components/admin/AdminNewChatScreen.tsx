
import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { Student, Parent, Teacher, Conversation, RoleName } from '../../types';
import { SearchIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

type UserListItem = {
    id: number;
    name: string;
    avatarUrl: string;
    subtitle: string;
    userType: 'Student' | 'Parent' | 'Teacher';
};

interface AdminNewChatScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    currentUserId?: number;
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


const AdminNewChatScreen: React.FC<AdminNewChatScreenProps> = ({ navigateTo, currentUserId }) => {
    const { user } = useAuth();
    const { profile } = useProfile();
    const schoolId = user?.user_metadata?.school_id || user?.app_metadata?.school_id;
    const currentBranchId = profile?.branch_id;
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Students' | 'Parents' | 'Staff'>('Students');
    const [dbUsers, setDbUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            if (!schoolId) return;
            try {
                const data = await api.getUsers(schoolId, currentBranchId || undefined);

                if (data) {
                    const mappedUsers: UserListItem[] = data.map((u: any) => {
                        const roleLower = (u.role || '').toLowerCase();
                        let userType: 'Student' | 'Parent' | 'Teacher' = 'Student';
                        let subtitle = 'Student';

                        if (roleLower === 'teacher' || roleLower === 'admin' || roleLower === 'staff' || roleLower === 'principal') {
                            userType = 'Teacher';
                            subtitle = roleLower === 'admin' ? 'Administrator' : 
                                       roleLower === 'principal' ? 'Principal' : 'Teacher';
                        } else if (roleLower === 'parent') {
                            userType = 'Parent';
                            subtitle = 'Parent';
                        }

                        return {
                            id: u.id,
                            name: u.full_name || u.name,
                            avatarUrl: u.avatar_url || `https://ui-avatars.com/api/?name=${u.full_name || u.name || 'User'}&background=random`,
                            subtitle: subtitle,
                            userType: userType
                        };
                    });
                    setDbUsers(mappedUsers);
                }
            } catch (err) {
                console.error("Error fetching users:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [schoolId, currentBranchId]);

    const filteredUsers = useMemo(() => {
        return dbUsers.filter(user => {
            const term = searchTerm.toLowerCase();
            const typeMatch = (activeTab === 'Students' && user.userType === 'Student') ||
                (activeTab === 'Parents' && user.userType === 'Parent') ||
                (activeTab === 'Staff' && user.userType === 'Teacher');
            const nameMatch = user.name?.toLowerCase().includes(term);
            return typeMatch && nameMatch;
        });
    }, [searchTerm, activeTab, dbUsers]);

    const handleSelectUser = async (user: UserListItem) => {
        if (!schoolId) {
            toast.error("School ID missing. Please refresh.");
            return;
        }

        setLoading(true);
        try {
            // Use the standardized backend endpoint for direct chats
            const convData = await api.getOrCreateDirectChat(user.id.toString(), schoolId);

            if (convData) {
                navigateTo('chat', user.name, {
                    conversation: {
                        id: convData.id,
                        participant: { 
                            id: user.id, 
                            name: user.name, 
                            avatarUrl: user.avatarUrl, 
                            role: user.userType 
                        }
                    }
                });
            }
        } catch (error: any) {
            console.error("Error starting chat", error);
            alert(`Error: ${error.message || 'Unknown error occurred'}`);
        } finally {
            setLoading(false);
        }
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
                        className="w-full pl-10 pr-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            <div className="px-4 bg-gray-100">
                <div className="flex space-x-2 border-b border-gray-200">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>


            <main className="flex-grow flex flex-col p-4 space-y-2 overflow-y-auto">
                {loading ? (
                    <div className="flex-grow flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                        <p className="text-gray-500 mt-3">Loading users...</p>
                    </div>
                ) : filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <UserRow key={`${user.userType}-${user.id}`} user={user} onSelect={() => handleSelectUser(user)} />
                    ))
                ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-500">
                        <p>No users found.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminNewChatScreen;

