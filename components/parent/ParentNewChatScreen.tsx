import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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

interface ParentNewChatScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
}

const ROLE_COLORS: Record<string, string> = {
    Student:  'bg-orange-100 text-orange-700',
    Teacher:  'bg-purple-100 text-purple-700',
    Admin:    'bg-indigo-100 text-indigo-700',
    Children: 'bg-green-100 text-green-700',
};

const Avatar: React.FC<{ contact: Contact }> = ({ contact }) => (
    contact.avatarUrl
        ? <img src={contact.avatarUrl} alt={contact.name} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0" />
        : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-200 to-green-300 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm">
            <span className="text-sm font-bold text-green-700">{contact.name?.charAt(0)?.toUpperCase() || '?'}</span>
          </div>
);

const ContactRow: React.FC<{ contact: Contact; loading?: boolean; onSelect: () => void; index: number }> = ({ contact, loading, onSelect, index }) => (
    <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.03 }}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.99 }}
        onClick={onSelect}
        disabled={loading}
        className="w-full flex items-center gap-3 p-3.5 text-left rounded-xl border bg-white/70 border-gray-100/60 hover:bg-white/90 transition-colors disabled:opacity-50"
    >
        <Avatar contact={contact} />
        <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-800 truncate">{contact.name}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 inline-block ${ROLE_COLORS[contact.role] || 'bg-gray-100 text-gray-600'}`}>
                {contact.role}
            </span>
        </div>
        {loading
            ? <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            : <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
        }
    </motion.button>
);

const ParentNewChatScreen: React.FC<ParentNewChatScreenProps> = ({ navigateTo }) => {
    const { profile } = useProfile();
    const { user } = useAuth();

    const [contacts, setContacts] = useState<Record<string, Contact[]>>({});
    const [loading, setLoading] = useState(true);
    const [startingChat, setStartingChat] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<string>('');

    const resolvedSchoolId = useMemo(() =>
        user?.school_id || user?.user_metadata?.school_id || user?.app_metadata?.school_id ||
        profile?.school_id || profile?.schoolId || '',
    [user, profile]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
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
                toast.error('Could not load contacts');
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
            (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, activeTab, searchTerm]);

    const handleSelect = async (contact: Contact) => {
        setStartingChat(contact.userId);
        try {
            navigateTo('chat', contact.name, {
                targetUserId: contact.userId,
                targetUserName: contact.name,
                targetUserAvatar: contact.avatarUrl || null,
                schoolId: resolvedSchoolId
            });
        } finally {
            setStartingChat(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-3 text-gray-500">
                <div className="w-8 h-8 border-3 border-green-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Loading contacts...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50/80 backdrop-blur-sm">
            {/* Search */}
            <div className="p-4 bg-white/80 backdrop-blur-md border-b border-gray-100/60 sticky top-0 z-10 flex-shrink-0">
                <p className="text-sm font-semibold text-gray-700 mb-3">Select a person to message</p>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-100/80 border-none rounded-xl focus:ring-2 focus:ring-green-200 focus:bg-white transition-all outline-none placeholder-gray-400 text-gray-700"
                        autoFocus
                    />
                </div>
            </div>

            {/* Tabs */}
            {tabs.length > 1 && (
                <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto no-scrollbar flex-shrink-0">
                    {tabs.map(tab => (
                        <motion.button
                            key={tab}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                                activeTab === tab
                                    ? 'bg-green-500 text-white border-green-500 shadow-sm'
                                    : 'bg-white/80 text-gray-600 border-gray-200 hover:border-green-300'
                            }`}
                        >
                            {tab}
                            <span className="ml-1 opacity-70">({contacts[tab]?.length || 0})</span>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Contact list */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                {filteredContacts.length > 0 ? (
                    filteredContacts.map((c, i) => (
                        <ContactRow
                            key={c.userId}
                            contact={c}
                            index={i}
                            loading={startingChat === c.userId}
                            onSelect={() => handleSelect(c)}
                        />
                    ))
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-col items-center justify-center h-full text-center py-16 gap-3">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                            <SearchIcon className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">
                            {searchTerm ? 'No results found' : 'No contacts available'}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ParentNewChatScreen;
