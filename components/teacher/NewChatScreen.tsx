import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SearchIcon, UserIcon } from '../../constants';
import { supabase } from '../../lib/supabase';

interface UserListItem {
    id: string | number;
    schoolGeneratedId?: string;
    name: string;
    avatarUrl: string;
    description: string;
    role: string;
}

interface NewChatScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    teacherId?: number | null; // Passed from Dashboard
    currentUser?: any; // Fallback
}

const UserRow: React.FC<{ user: UserListItem, onSelect: () => void }> = ({ user, onSelect }) => (
    <button onClick={onSelect} className="w-full flex items-center p-3 space-x-4 text-left bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-sm mb-2">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-600 font-bold">
                    {user.name.charAt(0)}
                </div>
            )}
        </div>
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">{user.description} • ID: {user.schoolGeneratedId || user.id}</p>
        </div>
        <div className="p-2 bg-purple-50 text-purple-600 rounded-full">
            <UserIcon className="w-5 h-5" />
        </div>
    </button>
);

const NewChatScreen: React.FC<NewChatScreenProps> = ({ navigateTo, teacherId, currentUser }) => {
    // Determine current user ID
    const myId = teacherId || (currentUser?.userId ? parseInt(currentUser.userId) : null) || 2; // Default to 2 (Mr Adeoye) if missing for dev

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'Students' | 'Parents' | 'Staff'>('Students');
    const [results, setResults] = useState<UserListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // Search Effect
    useEffect(() => {
        const performSearch = async () => {
            if (!searchTerm.trim()) {
                setResults([]);
                return;
            }
            setSearching(true);

            try {
                let query = supabase.from('users').select('id, name, avatar_url, role, email, school_generated_id');

                // Filter by Role based on Tab
                if (activeTab === 'Students') {
                    query = query.eq('role', 'Student');
                } else if (activeTab === 'Parents') {
                    query = query.eq('role', 'Parent');
                } else if (activeTab === 'Staff') {
                    query = query.in('role', ['Teacher', 'Admin']);
                }

                // Search Logic: If searchTerm looks like an ID, search by ID or school_generated_id
                if (searchTerm.startsWith('OLISKEY_') || !isNaN(Number(searchTerm))) {
                    if (!isNaN(Number(searchTerm))) {
                        query = query.or(`id.eq.${searchTerm},school_generated_id.ilike.%${searchTerm}%`);
                    } else {
                        query = query.eq('school_generated_id', searchTerm.toUpperCase());
                    }
                } else {
                    // Fuzzy Name search
                    query = query.ilike('name', `%${searchTerm}%`);
                }

                const { data, error } = await query.limit(10);

                if (error) throw error;

                if (data) {
                    const mapped: UserListItem[] = data
                        .filter((u: any) => u.id !== myId) // Exclude self
                        .map((u: any) => ({
                            id: u.id,
                            schoolGeneratedId: u.school_generated_id,
                            name: u.name,
                            avatarUrl: u.avatar_url,
                            role: u.role,
                            description: u.role
                        }));
                    setResults(mapped);
                }
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setSearching(false);
            }
        };

        const debounce = setTimeout(performSearch, 500);
        return () => clearTimeout(debounce);
    }, [searchTerm, activeTab, myId]);


    const handleSelectUser = async (user: UserListItem) => {
        setLoading(true);
        try {
            // 1. Check if conversation exists
            // Complex query: find conversation where both participants exist
            // Simplification: Fetch all my conversations, check if user is in them

            // Get all conversation IDs I am part of
            const { data: myConvs } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', myId);

            const myConvIds = myConvs?.map(c => c.conversation_id) || [];

            let existingConvId: number | null = null;

            if (myConvIds.length > 0) {
                // Check if selected user is in any of these
                const { data: found } = await supabase
                    .from('conversation_participants')
                    .select('conversation_id')
                    .in('conversation_id', myConvIds)
                    .eq('user_id', user.id)
                    .single(); // Should be unique pair for direct chat

                if (found) existingConvId = found.conversation_id;
            }

            if (existingConvId) {
                navigateTo('chat', user.name, {
                    conversationId: existingConvId,
                    roomDetails: { displayName: user.name, displayAvatar: user.avatarUrl }
                });
            } else {
                // 2. Create new conversation
                const { data: newConv, error: createError } = await supabase
                    .from('conversations')
                    .insert({ type: 'direct', name: `${user.name}` }) // Name is optional/mutable
                    .select()
                    .single();

                if (createError || !newConv) throw createError || new Error("Failed to create chat");

                // 3. Add participants
                const participants = [
                    { conversation_id: newConv.id, user_id: myId, role: 'member' },
                    { conversation_id: newConv.id, user_id: user.id, role: 'member' }
                ];

                const { error: partError } = await supabase
                    .from('conversation_participants')
                    .insert(participants);

                if (partError) throw partError;

                navigateTo('chat', user.name, {
                    conversationId: newConv.id,
                    roomDetails: { displayName: user.name, displayAvatar: user.avatarUrl }
                });
            }

        } catch (error) {
            console.error('Error starting chat:', error);
            toast.error("Error starting chat. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const tabs: ('Students' | 'Parents' | 'Staff')[] = ['Students', 'Parents', 'Staff'];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-800 mb-4">New Message</h2>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-4">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => { setActiveTab(tab); setSearchTerm(''); setResults([]); }}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}>
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-400 w-5 h-5" />
                    </span>
                    <input
                        type="text"
                        placeholder={activeTab === 'Staff' ? "Enter User ID (e.g. 1)" : "Search by name..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 text-gray-700 bg-gray-50 border border-transparent focus:bg-white focus:border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-100 transition-all outline-none"
                        autoFocus
                    />
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                {searching ? (
                    <div className="text-center py-8 text-gray-400">Searching...</div>
                ) : results.length > 0 ? (
                    results.map(user => (
                        <UserRow key={user.id} user={user} onSelect={() => handleSelectUser(user)} />
                    ))
                ) : searchTerm ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No users found.</p>
                        {activeTab === 'Staff' && <p className="text-xs text-gray-400 mt-2">Make sure to enter the exact User ID.</p>}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-400">
                        <p>Type to search for {activeTab.toLowerCase()}.</p>
                    </div>
                )}

                {loading && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-20">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default NewChatScreen;
