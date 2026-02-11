
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SearchIcon, ChevronLeftIcon, UserIcon } from '../../constants';
import { supabase } from '../../lib/supabase';
import { ChatUser } from '../../types';

interface NewChatScreenProps {
    currentUserId: string;
    onBack: () => void;
    onChatCreated: (conversationId: string) => void;
}

const NewChatScreen: React.FC<NewChatScreenProps> = ({ currentUserId, onBack, onChatCreated }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<ChatUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<ChatUser | null>(null);

    useEffect(() => {
        // Fetch current user details
        const fetchCurrentUser = async () => {
            const { data } = await supabase.from('users').select('*').eq('id', currentUserId).single();
            if (data) setCurrentUser(data);
        };
        fetchCurrentUser();
    }, [currentUserId]);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // Fetch all users that aren't the current user initially for the main list
                // We'll handle "Message yourself" separately
                let query = supabase.from('users').select('id, name, avatar_url, role');

                if (searchTerm) {
                    query = query.ilike('name', `%${searchTerm}%`);
                }

                const { data, error } = await query.neq('id', currentUserId).limit(50); // Limit for performance

                if (error) throw error;

                // Map to ChatUser type
                const mappedUsers: ChatUser[] = (data || []).map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    avatarUrl: u.avatar_url,
                    role: u.role
                }));

                setUsers(mappedUsers);
            } catch (err) {
                console.error("Error fetching users:", err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300); // Debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, currentUserId]);

    const startChat = async (targetUserId: string) => {
        try {
            setLoading(true);

            // 1. Check if a direct chat room already exists
            // This logic is a bit complex in SQL: find a room where both users are participants and room type is 'direct'

            // Logic:
            // Get all room_ids for current user
            // Get all room_ids for target user
            // Find intersection where type is 'direct'
            // Keep it simple: use an RPC function ideally, or client-side filter

            // Optimized approach:
            // Get direct rooms for current user
            // Check if target user is in any of those rooms

            let roomId: string | null = null;

            // Special handling for Self Chat
            const isSelfChat = targetUserId === currentUserId;

            if (isSelfChat) {
                const { data: myRooms } = await supabase
                    .from('chat_participants')
                    .select('room_id, chat_rooms!inner(type)')
                    .eq('user_id', currentUserId)
                    .eq('chat_rooms.type', 'direct');

                // For self chat, we need a room with ONLY 1 participant (me)
                // Or we check if I'm the only one in it. 
                // Simple hack: check if we have a room where I am the only participant?
                // Let's iterate found rooms and count participants.

                if (myRooms) {
                    for (const room of myRooms) {
                        const { count } = await supabase
                            .from('chat_participants')
                            .select('*', { count: 'exact', head: true })
                            .eq('room_id', room.room_id);

                        if (count === 1) {
                            roomId = room.room_id;
                            break;
                        }
                    }
                }

            } else {
                // Check common room for (me, target)
                // This query finds rooms containing BOTH users
                const { data: commonRooms } = await supabase.rpc('get_direct_chat_room', {
                    user_id_1: currentUserId,
                    user_id_2: targetUserId
                });

                // Note: RPC 'get_direct_chat_room' might not exist yet. I should create it or use raw query.
                // Let's use raw query for safety if RPC fails or logic manual.

                // Manual client side check (efficient enough for small datasets, but better via SQL)
                // Fetch my direct rooms
                const { data: myRooms } = await supabase
                    .from('chat_participants')
                    .select('room_id, chat_rooms!inner(type)')
                    .eq('user_id', currentUserId)
                    .eq('chat_rooms.type', 'direct');

                if (myRooms) {
                    const myRoomIds = myRooms.map((r: any) => r.room_id);
                    if (myRoomIds.length > 0) {
                        // Check if target is in any of these
                        const { data: targetMatch } = await supabase
                            .from('chat_participants')
                            .select('room_id')
                            .eq('user_id', targetUserId)
                            .in('room_id', myRoomIds)
                            .limit(1)
                            .single();

                        if (targetMatch) {
                            roomId = targetMatch.room_id;
                        }
                    }
                }
            }

            // 2. If no room exists, create one
            if (!roomId) {
                const { data: newRoom, error: roomError } = await supabase
                    .from('chat_rooms')
                    .insert({
                        type: 'direct',
                        creator_id: currentUserId,
                        is_group: false
                    })
                    .select()
                    .single();

                if (roomError) throw roomError;
                roomId = newRoom.id;

                // Add participants
                const participants = [
                    { room_id: roomId, user_id: currentUserId, role: 'member' }
                ];

                if (!isSelfChat) {
                    participants.push({ room_id: roomId, user_id: targetUserId, role: 'member' });
                }

                const { error: partError } = await supabase
                    .from('chat_participants')
                    .insert(participants);

                if (partError) throw partError;
            }

            // 3. Callback with roomId
            if (roomId) {
                onChatCreated(roomId);
            }

        } catch (err) {
            console.error("Error starting chat:", err);
            toast.error("Failed to start chat. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white z-20 absolute inset-0 md:relative md:h-full md:w-full">
            {/* Header */}
            <div className="flex items-center p-4 bg-green-600 text-white shadow-sm flex-shrink-0">
                <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-green-700">
                    <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="font-bold text-lg">New Chat</h2>
                    <p className="text-xs text-green-100">{users.length + (currentUser ? 1 : 0)} contacts</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto">
                <div className="p-3">
                    <input
                        type="text"
                        placeholder="Search name or number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        autoFocus
                    />
                </div>

                <div className="pb-4">
                    {/* Message Yourself Option */}
                    {currentUser && (!searchTerm || currentUser.name.toLowerCase().includes(searchTerm.toLowerCase())) && (
                        <button
                            onClick={() => startChat(currentUserId)}
                            className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className="relative">
                                {currentUser.avatarUrl ? (
                                    <img
                                        src={currentUser.avatarUrl}
                                        alt="Me"
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <UserIcon className="h-6 w-6" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div className="ml-3 text-left">
                                <p className="font-bold text-gray-800 flex items-center">
                                    {currentUser.name} (You)
                                </p>
                                <p className="text-sm text-gray-500">Message yourself</p>
                            </div>
                        </button>
                    )}

                    {/* All Users Label */}
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide bg-gray-50 mt-2">
                        Contacts on School App
                    </div>

                    {/* User List */}
                    {users.map(user => (
                        <button
                            key={user.id}
                            onClick={() => startChat(user.id)}
                            className="w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    className="w-12 h-12 rounded-full object-cover bg-gray-200"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                    <UserIcon className="h-6 w-6" />
                                </div>
                            )}
                            <div className="ml-3 text-left">
                                <p className="font-bold text-gray-800">{user.name}</p>
                                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
                            </div>
                        </button>
                    ))}

                    {users.length === 0 && searchTerm && (
                        <div className="p-8 text-center text-gray-500">
                            No users found matching "{searchTerm}"
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewChatScreen;
