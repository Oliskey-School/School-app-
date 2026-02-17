
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Student, Parent, Teacher, Conversation, RoleName } from '../../types';
import { SearchIcon } from '../../constants';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Students' | 'Parents' | 'Staff'>('Students');
    const [dbUsers, setDbUsers] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, avatar_url, role');

            if (data) {
                const mappedUsers: UserListItem[] = data.map((u: any) => {
                    // Normalize role to Title Case for UI
                    let userType: 'Student' | 'Parent' | 'Teacher' = 'Student';
                    let subtitle = 'Student';
                    const roleLower = (u.role || '').toLowerCase();

                    if (roleLower === 'teacher' || roleLower === 'admin' || roleLower === 'staff') {
                        userType = 'Teacher'; // Map all staff-like roles to Teacher/Staff tab
                        subtitle = roleLower === 'admin' ? 'Administrator' : 'Teacher';
                    } else if (roleLower === 'parent') {
                        userType = 'Parent';
                        subtitle = 'Parent';
                    } else {
                        userType = 'Student';
                        subtitle = 'Student';
                    }

                    return {
                        id: u.id,
                        name: u.name,
                        avatarUrl: u.avatar_url, // Note snake_case from DB
                        subtitle: subtitle,
                        userType: userType
                    };
                });
                setDbUsers(mappedUsers);
            }
            setLoading(false);
        };
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        return dbUsers.filter(user => {
            const term = searchTerm.toLowerCase();
            const typeMatch = activeTab === 'Students' && user.userType === 'Student' ||
                activeTab === 'Parents' && user.userType === 'Parent' ||
                activeTab === 'Staff' && user.userType === 'Teacher';
            const nameMatch = user.name?.toLowerCase().includes(term);
            return typeMatch && nameMatch;
        });
    }, [searchTerm, activeTab, dbUsers]);

    const handleSelectUser = async (user: UserListItem) => {
        setLoading(true);
        // 1. Check if conversation exists
        try {
            // This is a basic check. In a real app, you'd use a more robust RPC or query to find a direct chat between two users.
            // For this MVP, we will try to find a conversation where type is 'direct' and this user is a participant.
            // Note: This logic is simplified.

            // Allow selecting oneself for demo purposes or handle strict distinct users logic.

            // Create a new conversation if we can't easily find one (or for simplicity in this demo flow)
            // Ideally: SELECT * FROM conversations c JOIN conversation_participants cp ON c.id = cp.conversation_id WHERE ...

            // Let's simplified approach: Just create/navigate for now, assuming ChatScreen will handle loading if we pass an ID.
            // But we need an ID.

            // Let's create a new conversation for this pair.
            const { data: convData, error: convError } = await supabase
                .from('conversations')
                .insert({
                    type: 'direct',
                    title: user.name, // For direct chats, we might use the other person's name as title clone
                    last_message_text: 'Started a new conversation',
                    last_message_at: new Date().toISOString()
                })
                .select()
                .single();

            if (convError) {
                console.error("Error creating conversation:", convError);
                alert(`Failed to start chat: ${convError.message}`);
                setLoading(false);
                return;
            }

            if (convData) {
                // Add participants: Me (Admin) + Selected User
                // Retrieve current user ID (mock fallback or real)
                // const { data: { user: authUser } } = await supabase.auth.getUser();
                // const currentUserId = authUser?.id ? 0 : 0; // Fixme: need real int ID. Using 0 for now if mock.

                // Insert participants
                // Note: 'user_id' in 'conversation_participants' is BIGINT (users.id). 
                // We need the admin's ID. For now assuming we are ID 1 or similar if not found.

                const participants = [
                    { conversation_id: convData.id, user_id: user.id },
                ];

                // Only add admin if we have a valid ID (and assuming admin exists in users table)
                if (currentUserId) {
                    participants.push({ conversation_id: convData.id, user_id: currentUserId });
                }

                const { error: partError } = await supabase
                    .from('conversation_participants')
                    .insert(participants);

                if (partError) {
                    console.error("Error adding participants:", partError);
                    // Continue anyway to show chat, but warn
                }

                navigateTo('chat', user.name, {
                    conversation: {
                        id: convData.id,
                        participant: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: user.userType }
                    }
                });
            }
        } catch (error: any) {
            console.error("Error starting chat", error);
            alert(`Error: ${error.message || 'Unknown error occurred'}`);
        }
        setLoading(false);
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
