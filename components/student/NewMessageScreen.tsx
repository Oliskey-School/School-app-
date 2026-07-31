import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    grade?: number;
    section?: string;
}

interface NewMessageScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    student?: any;
}

const ROLE_COLORS: Record<string, string> = {
    Student: 'bg-orange-100 text-orange-700',
    Teacher: 'bg-purple-100 text-purple-700',
    Admin:   'bg-indigo-100 text-indigo-700',
    Parent:  'bg-green-100 text-green-700',
};

const Avatar: React.FC<{ contact: Contact; size?: string }> = ({ contact, size = 'w-11 h-11' }) => (
    contact.avatarUrl
        ? <img src={contact.avatarUrl} alt={contact.name} className={`${size} rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0`} />
        : <div className={`${size} rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm`}>
            <span className="text-sm font-bold text-gray-600">{contact.name?.charAt(0)?.toUpperCase() || '?'}</span>
          </div>
);

// â”€â”€â”€ Direct contact row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ContactRow: React.FC<{
    contact: Contact;
    onSelect: () => void;
    loading?: boolean;
    selectable?: boolean;
    selected?: boolean;
    onToggle?: () => void;
}> = ({ contact, onSelect, loading, selectable, selected, onToggle }) => (
    <motion.button
        layout
        whileTap={{ scale: 0.98 }}
        onClick={selectable ? onToggle : onSelect}
        disabled={loading}
        className={`w-full flex items-center gap-3 p-3.5 text-left rounded-xl transition-colors border disabled:opacity-50 ${
            selected
                ? 'bg-orange-50 border-orange-200'
                : 'bg-white/70 border-gray-100/60 hover:bg-white/90'
        }`}
    >
        <div className="relative flex-shrink-0">
            <Avatar contact={contact} />
            {selectable && selected && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center ring-2 ring-white"
                >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </motion.div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-sm text-gray-800 truncate">{contact.name}</p>
                {contact.fullName && contact.fullName !== contact.name && (
                    <span className="text-xs text-gray-400 truncate">({contact.fullName})</span>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[contact.role] || 'bg-gray-100 text-gray-600'}`}>
                    {contact.role}
                </span>
                {contact.grade && (
                    <span className="text-xs text-gray-400">Grade {contact.grade}{contact.section}</span>
                )}
            </div>
        </div>
        {!selectable && (
            loading
                ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                : <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
        )}
    </motion.button>
);

// â”€â”€â”€ Group name bottom sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GroupNameSheet: React.FC<{
    count: number;
    onConfirm: (name: string) => void;
    onBack: () => void;
    creating: boolean;
}> = ({ count, onConfirm, onBack, creating }) => {
    const [name, setName] = useState('');
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col z-20">
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
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
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
                        placeholder="e.g. Study Group 10A, Science Project..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={60}
                        className="w-full px-4 py-3 bg-gray-100/80 border border-gray-200/60 rounded-xl text-sm focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all outline-none"
                        onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}
                    />
                    <p className="text-xs text-gray-400 mt-1.5">{name.length}/60</p>
                </div>
            </div>

            <div className="p-4 border-t border-gray-100/60">
                <motion.button
                    whileHover={{ scale: (!name.trim() || creating) ? 1 : 1.01 }}
                    whileTap={{ scale: (!name.trim() || creating) ? 1 : 0.98 }}
                    onClick={() => name.trim() && onConfirm(name.trim())}
                    disabled={!name.trim() || creating}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {creating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                            Creating...
                        </>
                    ) : 'Create Group Chat'}
                </motion.button>
            </div>
        </motion.div>
    );
};

// â”€â”€â”€ Main screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NewMessageScreen: React.FC<NewMessageScreenProps> = ({ navigateTo }) => {
    const { profile } = useProfile();
    const { user } = useAuth();

    const [contacts, setContacts] = useState<Record<string, Contact[]>>({});
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Group mode
    const [groupMode, setGroupMode] = useState(false);
    const [selected, setSelected] = useState<Contact[]>([]);
    const [showNameSheet, setShowNameSheet] = useState(false);
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Resolve schoolId from any source
    const resolvedSchoolId = useMemo(() =>
        user?.school_id ||
        user?.user_metadata?.school_id ||
        user?.app_metadata?.school_id ||
        profile?.school_id ||
        profile?.schoolId || '',
    [user, profile]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const branchId = profile?.branch_id || profile?.branchId;
                const data = await api.getRoleContacts(branchId);
                const grouped: Record<string, Contact[]> = {};
                for (const [key, arr] of Object.entries(data)) {
                    if (Array.isArray(arr) && arr.length > 0) {
                        const label = key.charAt(0).toUpperCase() + key.slice(1);
                        grouped[label] = (arr as Contact[]).filter(Boolean);
                    }
                }
                setContacts(grouped);
                const firstGroup = Object.keys(grouped)[0];
                if (firstGroup) setActiveTab(firstGroup);
            } catch (e: any) {
                console.error('Failed to load contacts', e);
                setError('Could not load contacts. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [profile?.branch_id, profile?.branchId]);

    const tabs = Object.keys(contacts);

    const filteredContacts = useMemo(() => {
        const list = contacts[activeTab] || [];
        if (!searchTerm.trim()) return list;
        return list.filter(c =>
            (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, activeTab, searchTerm]);

    const allFiltered = useMemo(() => {
        if (!searchTerm.trim()) return null;
        const results: (Contact & { group: string })[] = [];
        for (const [group, list] of Object.entries(contacts) as [string, Contact[]][]) {
            for (const c of list) {
                if ((c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())) {
                    results.push({ ...c, group });
                }
            }
        }
        return results;
    }, [contacts, searchTerm]);

    // Group mode: only students + teachers are selectable
    const groupSelectableTabs = useMemo(() =>
        tabs.filter(t => t === 'Students' || t === 'Teachers'),
    [tabs]);

    const isSelected = (c: Contact) => selected.some(s => s.userId === c.userId);

    const toggleSelect = (c: Contact) => {
        setSelected(prev =>
            prev.some(s => s.userId === c.userId)
                ? prev.filter(s => s.userId !== c.userId)
                : [...prev, c]
        );
    };

    const handleDirectChat = (contact: Contact) => {
        // Navigate straight to chat â€” room is created on first message
        navigateTo('chat', contact.name, {
            targetUserId: contact.userId,
            targetUserName: contact.name,
            targetUserAvatar: contact.avatarUrl || null,
            schoolId: resolvedSchoolId
        });
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

    const exitGroupMode = () => {
        setGroupMode(false);
        setSelected([]);
        setShowNameSheet(false);
        // Restore tab to first groupSelectable if we changed it
    };

    // When entering group mode, auto-switch to Students tab
    const enterGroupMode = () => {
        setGroupMode(true);
        setSelected([]);
        setSearchTerm('');
        if (groupSelectableTabs.length > 0) setActiveTab(groupSelectableTabs[0]);
    };

    const displayTabs = groupMode ? groupSelectableTabs : tabs;

    return (
        <div className="relative flex flex-col h-full bg-gray-50/80 backdrop-blur-sm">
            {/* Group name sheet overlay */}
            <AnimatePresence>
                {showNameSheet && (
                    <GroupNameSheet
                        count={selected.length}
                        onConfirm={handleCreateGroup}
                        onBack={() => setShowNameSheet(false)}
                        creating={creatingGroup}
                    />
                )}
            </AnimatePresence>

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
                                New Group {selected.length > 0 && <span className="text-orange-500">Â· {selected.length} selected</span>}
                            </span>
                        </div>
                        {selected.length > 0 && (
                            <button
                                onClick={() => setShowNameSheet(true)}
                                className="px-4 py-1.5 bg-orange-500 text-white text-sm font-semibold rounded-full hover:bg-orange-600 transition-colors"
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
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold rounded-full border border-orange-200 transition-colors"
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
                        placeholder={groupMode ? "Search students & teachers..." : "Search by name..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100/80 border-none rounded-xl focus:ring-2 focus:ring-orange-200 focus:bg-white transition-all outline-none placeholder-gray-400 text-gray-700"
                        autoFocus
                    />
                </div>
            </div>

            {/* Selected chips (group mode) */}
            {groupMode && selected.length > 0 && (
                <div className="flex gap-2 px-4 py-2.5 overflow-x-auto no-scrollbar bg-white/60 border-b border-gray-100/60 flex-shrink-0">
                    {selected.map(c => (
                        <button
                            key={c.userId}
                            onClick={() => toggleSelect(c)}
                            className="flex-shrink-0 flex items-center gap-1.5 bg-orange-100 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full"
                        >
                            {c.name?.split(' ')[0]}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex-shrink-0">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Loading contacts...</p>
                </div>
            ) : displayTabs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <SearchIcon className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">
                        {groupMode ? 'No students or teachers found' : 'No contacts available'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Contacts will appear based on your role and school.</p>
                </div>
            ) : (
                <>
                    {/* Tabs */}
                    {!searchTerm && (
                        <div className="flex gap-1 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar flex-shrink-0">
                            {displayTabs.map(tab => (
                                <motion.button
                                    key={tab}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                                        activeTab === tab
                                            ? 'bg-gray-800 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {tab}
                                    <span className="ml-1 opacity-60">({contacts[tab]?.length || 0})</span>
                                </motion.button>
                            ))}
                        </div>
                    )}

                    {/* Contact list */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2 pb-24">
                        {(searchTerm && allFiltered ? allFiltered : filteredContacts).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <p className="text-sm text-gray-500">No contacts match "{searchTerm || activeTab.toLowerCase()}"</p>
                            </div>
                        ) : (
                            (searchTerm && allFiltered ? allFiltered : filteredContacts).map((contact, i) => (
                                <motion.div
                                    key={contact.userId}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.03 }}
                                >
                                    <ContactRow
                                        contact={contact}
                                        onSelect={() => handleDirectChat(contact)}
                                        loading={startingChat === contact.userId}
                                        selectable={groupMode}
                                        selected={isSelected(contact)}
                                        onToggle={() => toggleSelect(contact)}
                                    />
                                </motion.div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Group mode: floating Next button when contacts selected */}
            <AnimatePresence>
                {groupMode && selected.length > 0 && !showNameSheet && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-100/60"
                    >
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowNameSheet(true)}
                            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            Next — {selected.length} member{selected.length !== 1 ? 's' : ''} selected
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NewMessageScreen;
