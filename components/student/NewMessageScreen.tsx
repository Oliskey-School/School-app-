import React, { useState, useEffect, useMemo } from 'react';
import { Student } from '../../types';
import { supabase } from '../../lib/supabase';
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

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch Teachers
                const { data: teacherData } = await supabase
                    .from('users')
                    .select('id, name, avatar_url')
                    .eq('role', 'Teacher');

                if (teacherData) {
                    setTeachers(teacherData.map(t => ({
                        id: t.id,
                        name: t.name,
                        avatarUrl: t.avatar_url,
                        subtitle: 'Teacher',
                        userType: 'Teacher'
                    })));
                }

                // Fetch Classmates
                if (student) {
                    // Start with students table to filter by grade/section
                    const { data: studentData } = await supabase
                        .from('students')
                        .select(`
                            grade, section,
                            users!inner (id, name, avatar_url)
                        `)
                        .eq('grade', student.grade)
                        //.eq('section', student.section) // strict section matching? maybe just grade for now or both.
                        .neq('user_id', student.id); // Exclude self

                    if (studentData) {
                        const mappedStudents: UserListItem[] = studentData.map((s: any) => {
                            // users is single object due to !inner join on FK unique?
                            // supabase-js might return array if 1:1 not enforced in types?
                            // Let's safe access
                            const u = Array.isArray(s.users) ? s.users[0] : s.users;
                            return {
                                id: u.id,
                                name: u.name,
                                avatarUrl: u.avatar_url,
                                subtitle: `Grade ${s.grade} ${s.section}`,
                                userType: 'Student'
                            };
                        });
                        setClassmates(mappedStudents);
                    }
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
            user.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, activeTab, teachers, classmates]);

    const handleSelectUser = async (user: UserListItem) => {
        setError(null);
        try {
            // Check for existing direct chat
            // 1. Get my rooms
            const { data: myRooms } = await supabase
                .from('chat_participants')
                .select('room_id')
                .eq('user_id', student.id);

            const myRoomIds = myRooms?.map(r => r.room_id) || [];

            if (myRoomIds.length > 0) {
                // 2. Check if user is in any of these rooms which are direct
                const { data: commonRooms } = await supabase
                    .from('chat_participants')
                    .select('room_id, chat_rooms(type)')
                    .eq('user_id', user.id)
                    .in('room_id', myRoomIds);

                // Filter for 'direct' type from checking chat_rooms
                // But we can't easily filter joined property in JS easily if structure is nested.
                // Or use inner join filter.

                // Let's try to query chat_rooms directly with participants check? Harder.
                // Direct approach:
                // Find a room where (user_id = me OR user_id = them) GROUP BY room_id HAVING count(*) = 2 AND type = 'direct'

                // Simplest: Iterate found common rooms and check type if we fetched it.
                // We fetched chat_rooms(type).

                const existingRoom = commonRooms?.find((r: any) => r.chat_rooms?.type === 'direct');

                if (existingRoom) {
                    navigateTo('chat', user.name, { conversationId: existingRoom.room_id });
                    return;
                }
            }

            // FETCH CORRECT USER ID (Public Users Table)
            // The chat_rooms table references public.users(id), which is a BigInt.
            // student.id is from students table, which might not match or satisfy the FK if they are separate.
            const { data: publicUser, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('email', student.email)
                .single();

            let publicUserId = publicUser?.id;

            if (!publicUserId) {
                console.log('User not found in public.users, creating record...');

                // Try Upsert instead of Insert to handle race conditions
                const { data: newUser, error: createError } = await supabase
                    .from('users')
                    .upsert([{
                        name: student.name,
                        email: student.email,
                        role: 'Student',
                        avatar_url: student.avatarUrl,
                        user_id: student.user_id
                    }], { onConflict: 'email' }) // Assuming email is unique constraint
                    .select('id')
                    .single();

                if (createError) {
                    console.error('Error creating public user:', createError);

                    // Fallback: Check if user exists anyway (in case upsert failed on other constraint)
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('id')
                        .eq('email', student.email)
                        .maybeSingle();

                    if (existingUser) {
                        publicUserId = existingUser.id;
                    } else {
                        setError('Could not verify or create user identity for chat.');
                        return;
                    }
                } else if (newUser) {
                    publicUserId = newUser.id;
                }
            }

            // Create new room
            const { data: newRoom, error: createError } = await supabase
                .from('chat_rooms')
                .insert({
                    type: 'direct',
                    is_group: false,
                    creator_id: publicUserId,
                    // Name is often null for direct chats, or we can set it for easy debugging
                })
                .select()
                .single();

            if (createError || !newRoom) {
                console.error('Error creating room:', createError);
                setError(`Failed to start chat: ${createError?.message || 'Unknown error'}`);
                return;
            }

            // ADD participants
            const { error: partError } = await supabase
                .from('chat_participants')
                .insert([
                    { room_id: newRoom.id, user_id: publicUserId, role: 'member' },
                    { room_id: newRoom.id, user_id: user.id, role: 'member' }
                ]);

            if (partError) {
                console.error('Error adding participants:', partError);
                setError(`Failed to add participants: ${partError.message}`);
                return;
            }

            navigateTo('chat', user.name, { conversationId: newRoom.id });

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