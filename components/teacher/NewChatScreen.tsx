import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { SearchIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

interface Contact {
    userId: string;
    name: string;
    fullName?: string;
    avatarUrl?: string;
    role: string;
}

interface NewChatScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
}

const ROLE_COLORS: Record<string, string> = {
    Student: 'bg-orange-100 text-orange-700',
    Teacher: 'bg-purple-100 text-purple-700',
    Admin:   'bg-indigo-100 text-indigo-700',
};

const Avatar: React.FC<{ contact: Contact }> = ({ contact }) => (
    contact.avatarUrl
        ? <img src={contact.avatarUrl} alt={contact.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0" />
        : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-200 to-purple-300 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
            <span className="text-sm font-bold text-purple-700">{contact.name?.charAt(0)?.toUpperCase() || '?'}</span>
          </div>
);

const ContactRow: React.FC<{
    contact: Contact;
    loading?: boolean;
    selectable?: boolean;
    selected?: boolean;
    onSelect: () => void;
    onToggle?: () => void;
}> = ({ contact, loading, selectable, selected, onSelect, onToggle }) => (
    <button
        onClick={selectable ? onToggle : onSelect}
        disabled={loading}
        className={`w-full flex items-center gap-3 p-3.5 text-left rounded-xl transition-all border active:scale-[0.99] disabled:opacity-50 ${
            selected
                ? 'bg-purple-50 border-purple-200'
                : 'bg-white/70 border-gray-100/60 hover:bg-white/90'
        }`}
    >
        <div className="relative flex-shrink-0">
            <Avatar contact={contact} />
            {selectable && selected && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center ring-2 ring-white">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-800 truncate">{contact.name}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block ${ROLE_COLORS[contact.role] || 'bg-gray-100 text-gray-600'}`}>
                {contact.role}
            </span>
        </div>
        {!selectable && (
            loading
                ? <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                : <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
        )}
    </button>
);

const GroupNameSheet: React.FC<{
    count: number;
    onConfirm: (name: string) => void;
    onBack: () => void;
    creating: boolean;
}> = ({ count, onConfirm, onBack, creating }) => {
    const [name, setName] = useState('');
    return (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col z-20">
            <div className="p-4 border-b border-gray-100/60 flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-lg font-bold text-gray-800">Name Your Group</h2>
            </div>
            <div className="flex-1 p-6 flex flex-col gap-6">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                        <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-500">{count} member{count !== 1 ? 's' : ''} selected</p>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Group Name</label>
                    <input
                        autoFocus
                        type="text"
                        placeholder="e.g. Class 10A, Science Group..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={60}
                        className="w-full px-4 py-3 bg-gray-100/80 border border-gray-200/60 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all outline-none"
                        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">{name.length}/60</p>
                </div>
            </div>
            <div className="p-4 border-t border-gray-100/60">
                <button
                    onClick={() => name.trim() && onConfirm(name.trim())}
                    disabled={!name.trim() || creating}
                    className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {creating
                        ? <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />Creating...</>
                        : 'Create Group Chat'}
                </button>
            </div>
        </div>
    );
};

const NewChatScreen: React.FC<NewChatScreenProps> = ({ navigateTo }) => {
    const { profile } = useProfile();
    const { user } = useAuth();

    const [contacts, setContacts] = useState<Record<string, Contact[]>>({});
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<string>('');

    const [groupMode, setGroupMode] = useState(false);
    const [selected, setSelected] = useState<Contact[]>([]);
    const [showNameSheet, setShowNameSheet] = useState(false);
    const [creatingGroup, setCreatingGroup] = useState(false);

    const resolvedSchoolId = useMemo(() =>
        user?.school_id || (user as any)?.user_metadata?.school_id || (user as any)?.app_metadata?.school_id ||
        profile?.school_id || (profile as any)?.schoolId || '',
    [user, profile]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const branchId = profile?.branch_id || (profile as any)?.branchId;
                const data = await api.getRoleContacts(branchId);
                const grouped: Record<string, Contact[]> = {};
                for (const [key, arr] of Object.entries(data)) {
                    if (Array.isArray(arr) && (arr as any[]).length > 0) {
                        const label = key.charAt(0).toUpperCase() + key.slice(1);
                        // Teachers should not see parents
                        if (label === 'Parents') continue;
                        grouped[label] = (arr as Contact[]).filter(Boolean);
                    }
                }
                setContacts(grouped);
                const first = Object.keys(grouped)[0];
                if (first) setActiveTab(first);
            } catch (e: any) {
                console.error('Failed to load contacts', e);
                toast.error('Could not load contacts');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [profile?.branch_id, (profile as any)?.branchId]);

    const tabs = Object.keys(contacts);

    const filteredContacts = useMemo(() => {
        const list = contacts[activeTab] || [];
        if (!searchTerm.trim()) return list;
        return list.filter(c =>
            (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, activeTab, searchTerm]);

    const isSelected = (c: Contact) => selected.some(s => s.userId === c.userId);

    const toggleSelect = (c: Contact) => {
        setSelected(prev =>
            prev.some(s => s.userId === c.userId)
                ? prev.filter(s => s.userId !== c.userId)
                : [...prev, c]
        );
    };

    const handleDirectChat = (contact: Contact) => {
        setStartingChat(contact.userId);
        navigateTo('chat', contact.name, {
            targetUserId: contact.userId,
            targetUserName: contact.name,
            targetUserAvatar: contact.avatarUrl || null,
            schoolId: resolvedSchoolId
        });
        setStartingChat(null);
    };

    const handleCreateGroup = async (groupName: string) => {
        if (selected.length === 0) { toast.error('Select at least one member'); return; }
        setCreatingGroup(true);
        try {
            const room = await api.createGroupChat(groupName, selected.map(c => c.userId));
            navigateTo('chat', groupName, {
                conversationId: room.id,
                targetUserName: groupName,
                isGroup: true
            });
        } catch (e: any) {
            toast.error(e?.message || 'Could not create group');
        } finally {
            setCreatingGroup(false);
        }
    };

    const enterGroupMode = () => {
        setGroupMode(true);
        setSelected([]);
        setSearchTerm('');
    };

    const exitGroupMode = () => {
        setGroupMode(false);
        setSelected([]);
        setShowNameSheet(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-3 text-gray-500">
                <div className="w-8 h-8 border-[3px] border-purple-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Loading contacts...</p>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full bg-gray-50/80 backdrop-blur-sm">
            {showNameSheet && (
                <GroupNameSheet
                    count={selected.length}
                    onConfirm={handleCreateGroup}
                    onBack={() => setShowNameSheet(false)}
                    creating={creatingGroup}
                />
            )}

            {/* Header */}
            <div className="p-4 bg-white/80 backdrop-blur-md border-b border-gray-100/60 sticky top-0 z-10 flex-shrink-0">
                {groupMode ? (
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <button onClick={exitGroupMode} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <span className="font-semibold text-gray-800 text-sm">
                                New Group {selected.length > 0 && <span className="text-purple-600">· {selected.length} selected</span>}
                            </span>
                        </div>
                        {selected.length > 0 && (
                            <button
                                onClick={() => setShowNameSheet(true)}
                                className="px-4 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-700 transition-colors"
                            >
                                Next
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-700 text-sm">Select a person to message</span>
                        <button
                            onClick={enterGroupMode}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-semibold rounded-full border border-purple-200 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            New Group
                        </button>
                    </div>
                )}
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100/80 border-none rounded-xl focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all outline-none placeholder-gray-400 text-gray-700"
                        autoFocus
                    />
                </div>
            </div>

            {/* Selected chips */}
            {groupMode && selected.length > 0 && (
                <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar bg-white/60 border-b border-gray-100/60 flex-shrink-0">
                    {selected.map(c => (
                        <button
                            key={c.userId}
                            onClick={() => toggleSelect(c)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0"
                        >
                            {c.name}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    ))}
                </div>
            )}

            {/* Tabs */}
            {tabs.length > 1 && (
                <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar flex-shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                                activeTab === tab
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-white/80 text-gray-600 border-gray-200 hover:border-purple-300'
                            }`}
                        >
                            {tab}
                            <span className="ml-1 opacity-70">({contacts[tab]?.length || 0})</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Contact list */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                {filteredContacts.length > 0 ? (
                    filteredContacts.map(c => (
                        <ContactRow
                            key={c.userId}
                            contact={c}
                            loading={startingChat === c.userId}
                            selectable={groupMode}
                            selected={isSelected(c)}
                            onSelect={() => handleDirectChat(c)}
                            onToggle={() => toggleSelect(c)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-center">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                            <SearchIcon className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">
                            {searchTerm ? 'No results found' : 'No contacts available'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewChatScreen;
