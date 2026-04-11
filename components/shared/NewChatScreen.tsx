
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SearchIcon, ChevronLeftIcon, UserIcon } from '../../constants';
import { api } from '../../lib/api';
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
    const [currentUser, setCurrentUser] = useState<any | null>(null);

    useEffect(() => {
        // Fetch current user details
        const fetchCurrentUser = async () => {
            try {
                const userData = await api.getMe();
                if (userData) setCurrentUser(userData);
            } catch (err) {
                console.error("Error fetching me:", err);
            }
        };
        fetchCurrentUser();
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            try {
                // Fetch users using the new API
                const data = await api.getUsers(undefined, undefined, undefined, searchTerm);

                // Map to ChatUser type
                const mappedUsers: ChatUser[] = (data || [])
                    .filter((u: any) => u.id !== currentUserId)
                    .map((u: any) => ({
                        id: u.id,
                        name: u.full_name || u.name,
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
            
            const schoolId = currentUser?.schoolId || currentUser?.school_id;
            if (!schoolId) {
                toast.error("School information missing");
                return;
            }

            // Use the centralized method to find or create a direct chat
            const room = await api.getOrCreateDirectChat(targetUserId, schoolId);
            
            if (room && room.id) {
                onChatCreated(room.id);
            } else {
                throw new Error("Failed to get room ID");
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
