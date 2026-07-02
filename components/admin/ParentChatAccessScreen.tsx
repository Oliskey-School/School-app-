import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { SearchIcon, UserGroupIcon } from '../../constants';

interface Permission {
    id: string;
    parent_id: string;
    teacher_id: string;
    duration_type: 'hours' | 'days' | 'forever';
    duration_value: number | null;
    expires_at: string | null;
    is_active: boolean;
    status: 'active' | 'expired' | 'revoked';
    created_at: string;
    parent?: { id: string; full_name: string; user?: { avatar_url?: string } };
    teacher?: { id: string; full_name: string; user?: { avatar_url?: string } };
}

interface Person { id: string; name: string; userId: string; avatarUrl?: string }

const Avatar: React.FC<{ name: string; url?: string; size?: string }> = ({ name, url, size = 'w-9 h-9' }) =>
    url
        ? <img src={url} alt={name} className={`${size} rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0`} />
        : <div className={`${size} rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm`}>
            <span className="text-xs font-bold text-indigo-600">{name?.charAt(0)?.toUpperCase() || '?'}</span>
          </div>;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, string> = {
        active: 'bg-green-100 text-green-700',
        expired: 'bg-orange-100 text-orange-700',
        revoked: 'bg-red-100 text-red-600'
    };
    return <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
};

const formatExpiry = (p: Permission): string => {
    if (p.duration_type === 'forever') return 'Forever';
    if (!p.expires_at) return '—';
    const d = new Date(p.expires_at);
    const now = new Date();
    if (d <= now) return 'Expired';
    const diffMs = d.getTime() - now.getTime();
    const diffH = Math.round(diffMs / 3_600_000);
    if (diffH < 24) return `${diffH}h left`;
    return `${Math.round(diffH / 24)}d left`;
};

const ParentChatAccessScreen: React.FC = () => {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [parents, setParents] = useState<Person[]>([]);
    const [teachers, setTeachers] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [showGrantForm, setShowGrantForm] = useState(false);
    const [searchGrant, setSearchGrant] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'revoked'>('active');

    // Grant form state
    const [selectedParent, setSelectedParent] = useState<Person | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<Person | null>(null);
    const [durationType, setDurationType] = useState<'hours' | 'days' | 'forever'>('days');
    const [durationValue, setDurationValue] = useState('1');
    const [parentSearch, setParentSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [revoking, setRevoking] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [perms, pList, tList] = await Promise.all([
                api.getParentChatPermissions(),
                api.getParentsForChatPicker(),
                api.getTeachersForChatPicker()
            ]);
            setPermissions(perms || []);
            setParents(pList || []);
            setTeachers(tList || []);
        } catch {
            toast.error('Could not load permissions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filteredParents = useMemo(() =>
        parents.filter(p => p.name.toLowerCase().includes(parentSearch.toLowerCase())),
        [parents, parentSearch]);

    const filteredTeachers = useMemo(() =>
        teachers.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase())),
        [teachers, teacherSearch]);

    const filteredPerms = useMemo(() => {
        return permissions.filter(p => {
            if (filterStatus !== 'all' && p.status !== filterStatus) return false;
            if (!searchGrant.trim()) return true;
            const q = searchGrant.toLowerCase();
            return (
                p.parent?.full_name?.toLowerCase().includes(q) ||
                p.teacher?.full_name?.toLowerCase().includes(q)
            );
        });
    }, [permissions, filterStatus, searchGrant]);

    const handleGrant = async () => {
        if (!selectedParent || !selectedTeacher) return toast.error('Select a parent and teacher');
        if (durationType !== 'forever' && (!durationValue || +durationValue < 1))
            return toast.error('Enter a valid duration');
        setSubmitting(true);
        try {
            await api.grantParentChatPermission({
                parent_id: selectedParent.id,
                teacher_id: selectedTeacher.id,
                duration_type: durationType,
                duration_value: durationType !== 'forever' ? +durationValue : undefined
            });
            toast.success(`Access granted to ${selectedParent.name}`);
            setShowGrantForm(false);
            setSelectedParent(null);
            setSelectedTeacher(null);
            setDurationType('days');
            setDurationValue('1');
            setParentSearch('');
            setTeacherSearch('');
            await load();
        } catch (e: any) {
            toast.error(e.message || 'Could not grant access');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevoke = async (id: string) => {
        setRevoking(id);
        try {
            await api.revokeParentChatPermission(id);
            toast.success('Access revoked');
            setPermissions(prev => prev.map(p => p.id === id ? { ...p, is_active: false, status: 'revoked' } : p));
        } catch {
            toast.error('Could not revoke access');
        } finally {
            setRevoking(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/60 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-100/60 flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-lg font-bold text-gray-800">Parent Chat Access</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Control which teachers parents can message, and for how long</p>
                    </div>
                    <button
                        onClick={() => setShowGrantForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Grant Access
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mt-3">
                    <div className="relative flex-1 max-w-xs">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="search"
                            placeholder="Search parent or teacher..."
                            value={searchGrant}
                            onChange={e => setSearchGrant(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-100/80 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                        />
                    </div>
                    <div className="flex gap-1.5">
                        {(['all', 'active', 'expired', 'revoked'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all capitalize ${
                                    filterStatus === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex flex-col gap-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200/60 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredPerms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
                        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
                            <UserGroupIcon className="w-8 h-8 text-indigo-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">No permissions found</p>
                        <p className="text-xs text-gray-400">Use "Grant Access" to allow a parent to message a teacher</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filteredPerms.map(p => (
                            <div key={p.id} className="bg-white rounded-xl border border-gray-100/80 px-4 py-3 flex items-center gap-4 shadow-sm">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Avatar name={p.parent?.full_name || 'P'} url={p.parent?.user?.avatar_url} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{p.parent?.full_name || '—'}</p>
                                        <p className="text-[11px] text-gray-400">Parent</p>
                                    </div>
                                </div>
                                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8M12 8l4 4-4 4" />
                                </svg>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <Avatar name={p.teacher?.full_name || 'T'} url={p.teacher?.user?.avatar_url} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{p.teacher?.full_name || '—'}</p>
                                        <p className="text-[11px] text-gray-400">Teacher</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <div className="text-right">
                                        <StatusBadge status={p.status} />
                                        <p className="text-[11px] text-gray-400 mt-0.5">{formatExpiry(p)}</p>
                                    </div>
                                    {p.status === 'active' && (
                                        <button
                                            onClick={() => handleRevoke(p.id)}
                                            disabled={revoking === p.id}
                                            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {revoking === p.id ? '...' : 'Revoke'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Grant Modal */}
            {showGrantForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-800">Grant Teacher Chat Access</h2>
                            <button onClick={() => setShowGrantForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Parent picker */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Select Parent</label>
                                {selectedParent ? (
                                    <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-xl border border-green-200">
                                        <Avatar name={selectedParent.name} url={selectedParent.avatarUrl} size="w-8 h-8" />
                                        <span className="text-sm font-semibold text-gray-800 flex-1">{selectedParent.name}</span>
                                        <button onClick={() => setSelectedParent(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="search"
                                                placeholder="Search parents..."
                                                value={parentSearch}
                                                onChange={e => setParentSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 text-sm outline-none border-b border-gray-100"
                                            />
                                        </div>
                                        <div className="max-h-36 overflow-y-auto">
                                            {filteredParents.slice(0, 8).map(p => (
                                                <button key={p.id} onClick={() => setSelectedParent(p)}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50/80 last:border-0">
                                                    <Avatar name={p.name} url={p.avatarUrl} size="w-7 h-7" />
                                                    <span className="text-sm text-gray-700">{p.name}</span>
                                                </button>
                                            ))}
                                            {filteredParents.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No parents found</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Teacher picker */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Select Teacher</label>
                                {selectedTeacher ? (
                                    <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                                        <Avatar name={selectedTeacher.name} url={selectedTeacher.avatarUrl} size="w-8 h-8" />
                                        <span className="text-sm font-semibold text-gray-800 flex-1">{selectedTeacher.name}</span>
                                        <button onClick={() => setSelectedTeacher(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="search"
                                                placeholder="Search teachers..."
                                                value={teacherSearch}
                                                onChange={e => setTeacherSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 text-sm outline-none border-b border-gray-100"
                                            />
                                        </div>
                                        <div className="max-h-36 overflow-y-auto">
                                            {filteredTeachers.slice(0, 8).map(t => (
                                                <button key={t.id} onClick={() => setSelectedTeacher(t)}
                                                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50/80 last:border-0">
                                                    <Avatar name={t.name} url={t.avatarUrl} size="w-7 h-7" />
                                                    <span className="text-sm text-gray-700">{t.name}</span>
                                                </button>
                                            ))}
                                            {filteredTeachers.length === 0 && <p className="text-xs text-gray-400 text-center py-3">No teachers found</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Access Duration</label>
                                <div className="flex gap-2 mb-2">
                                    {(['hours', 'days', 'forever'] as const).map(t => (
                                        <button key={t} onClick={() => setDurationType(t)}
                                            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all capitalize ${
                                                durationType === t ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                {durationType !== 'forever' && (
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            value={durationValue}
                                            onChange={e => setDurationValue(e.target.value)}
                                            className="w-24 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"
                                        />
                                        <span className="text-sm text-gray-500">{durationType}</span>
                                    </div>
                                )}
                                {durationType === 'forever' && (
                                    <p className="text-xs text-gray-400">Access will remain until you manually revoke it.</p>
                                )}
                            </div>
                        </div>

                        <div className="px-6 pb-5 flex gap-3">
                            <button onClick={() => setShowGrantForm(false)}
                                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleGrant}
                                disabled={submitting || !selectedParent || !selectedTeacher}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
                            >
                                {submitting ? 'Granting...' : 'Grant Access'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentChatAccessScreen;
