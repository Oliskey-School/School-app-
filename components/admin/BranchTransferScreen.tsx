import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Building2, Repeat, ShieldAlert, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DashboardType } from '../../types';
import api from '../../lib/api';
import CenteredLoader from '../ui/CenteredLoader';

interface BranchTransferScreenProps {
    handleBack?: () => void;
    navigateTo?: (view: string, title: string, props?: any) => void;
}

interface BranchItem { id: string; name: string; is_main?: boolean; }
interface UserItem {
    id: string;
    role?: string;
    branch_id?: string | null;
    allowed_branch_ids?: string[];
    school_generated_id?: string;
    full_name?: string;
    name?: string;
}

const BranchTransferScreen: React.FC<BranchTransferScreenProps> = ({ handleBack }) => {
    const { currentSchool, role, currentBranchId } = useAuth();

    // Only the MAIN branch administrator (no fixed branch) / proprietor / super admin.
    const isMainAdmin =
        role === DashboardType.Proprietor ||
        role === DashboardType.SuperAdmin ||
        (role === DashboardType.Admin && !currentBranchId);

    const [users, setUsers] = useState<UserItem[]>([]);
    const [branches, setBranches] = useState<BranchItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');

    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [primaryBranchId, setPrimaryBranchId] = useState<string>('');
    const [allowedBranchIds, setAllowedBranchIds] = useState<string[]>([]);
    const [lastResultId, setLastResultId] = useState<string>('');

    useEffect(() => {
        if (!isMainAdmin || !currentSchool) { setLoading(false); return; }
        (async () => {
            try {
                setLoading(true);
                const [u, b] = await Promise.all([
                    api.getUsers(currentSchool.id),
                    api.getAuthorizedBranches(),
                ]);
                setUsers(Array.isArray(u) ? u : []);
                setBranches(Array.isArray(b) ? b : []);
            } catch (e: any) {
                toast.error('Could not load users or branches.');
            } finally {
                setLoading(false);
            }
        })();
    }, [isMainAdmin, currentSchool]);

    const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId) || null, [users, selectedUserId]);

    const onSelectUser = (id: string) => {
        setSelectedUserId(id);
        setLastResultId('');
        const u = users.find(x => x.id === id);
        setPrimaryBranchId(u?.branch_id || '');
        setAllowedBranchIds(Array.isArray(u?.allowed_branch_ids) ? u!.allowed_branch_ids! : []);
    };

    const toggleAllowed = (branchId: string) => {
        setAllowedBranchIds(prev => prev.includes(branchId) ? prev.filter(b => b !== branchId) : [...prev, branchId]);
    };

    const apply = async () => {
        if (!selectedUser) { toast.error('Select a user first.'); return; }
        const payload: { userId: string; newBranchId?: string; allowedBranchIds?: string[] } = { userId: selectedUser.id };
        if (primaryBranchId && primaryBranchId !== selectedUser.branch_id) payload.newBranchId = primaryBranchId;
        // Additional branches must exclude the (new or current) primary.
        const primary = primaryBranchId || selectedUser.branch_id;
        payload.allowedBranchIds = allowedBranchIds.filter(b => b && b !== primary);

        if (!payload.newBranchId && (payload.allowedBranchIds || []).sort().join() === (selectedUser.allowed_branch_ids || []).slice().sort().join()) {
            toast('No changes to apply.');
            return;
        }

        try {
            setSaving(true);
            const res = await api.transferUser(payload);
            toast.success(res?.idRegenerated ? `Transferred. New ID: ${res.school_generated_id}` : 'Branch assignment updated.');
            setLastResultId(res?.school_generated_id || '');
            // Refresh the user list so the UI reflects the change.
            const u = await api.getUsers(currentSchool!.id);
            setUsers(Array.isArray(u) ? u : []);
        } catch (e: any) {
            toast.error(e?.message || 'Transfer failed.');
        } finally {
            setSaving(false);
        }
    };

    const branchName = (id?: string | null) => branches.find(b => b.id === id)?.name || (id ? id.slice(0, 8) : '—');
    const userLabel = (u: UserItem) => `${u.full_name || u.name || 'Unnamed'} · ${u.school_generated_id || '—'} · ${(u.role || '').toUpperCase()}`;

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users.slice(0, 100);
        return users.filter(u => userLabel(u).toLowerCase().includes(q)).slice(0, 100);
    }, [users, search]);

    if (!isMainAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center">
                <ShieldAlert className="w-14 h-14 text-amber-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-800">Restricted</h3>
                <p className="text-gray-500 mt-2 max-w-md">Only the main branch administrator can transfer users or change branch assignments.</p>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-20 flex items-center gap-3">
                {handleBack && (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleBack} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Back">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </motion.button>
                )}
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Repeat className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Branch Transfers</h1>
                    <p className="text-xs text-gray-500">Reassign a user's branch or grant a teacher multiple branches</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-4">
                {loading ? (
                    <CenteredLoader className="py-20" />
                ) : (
                    <>
                        {/* Step 1: pick a user */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h2 className="text-sm font-bold text-gray-900 mb-3">1. Select a user</h2>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or ID…"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm mb-3"
                            />
                            <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
                                {filteredUsers.length === 0 && <p className="text-sm text-gray-400 p-4 text-center">No users found.</p>}
                                {filteredUsers.map(u => (
                                    <motion.button
                                        key={u.id}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => onSelectUser(u.id)}
                                        className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedUserId === u.id ? 'bg-indigo-50' : ''}`}
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-800">{u.full_name || u.name || 'Unnamed'}</p>
                                            <p className="text-xs text-gray-500">{u.school_generated_id || '—'} · {(u.role || '').toUpperCase()} · {branchName(u.branch_id)}</p>
                                        </div>
                                        {selectedUserId === u.id && <Check className="w-4 h-4 text-indigo-600" />}
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        <AnimatePresence>
                        {selectedUser && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                                {/* Step 2: primary branch */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h2 className="text-sm font-bold text-gray-900 mb-1">2. Primary branch (transfer)</h2>
                                    <p className="text-xs text-gray-500 mb-3">Changing this moves the user and issues a new ID for the new branch.</p>
                                    <select
                                        value={primaryBranchId}
                                        onChange={e => setPrimaryBranchId(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:border-indigo-400"
                                    >
                                        <option value="">— No primary branch —</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.is_main ? ' (Main)' : ''}</option>)}
                                    </select>
                                </div>

                                {/* Step 3: additional authorized branches */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h2 className="text-sm font-bold text-gray-900 mb-1">3. Additional authorized branches</h2>
                                    <p className="text-xs text-gray-500 mb-3">For teachers who work across branches. They can switch between these and their primary branch (one active branch at a time).</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {branches.filter(b => b.id !== primaryBranchId).map(b => (
                                            <motion.label key={b.id} whileTap={{ scale: 0.98 }} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer text-sm transition-colors ${allowedBranchIds.includes(b.id) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-150 hover:bg-gray-50'}`}>
                                                <input type="checkbox" checked={allowedBranchIds.includes(b.id)} onChange={() => toggleAllowed(b.id)} className="accent-indigo-600 w-4 h-4" />
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-700">{b.name}</span>
                                            </motion.label>
                                        ))}
                                    </div>
                                </div>

                                <AnimatePresence>
                                {lastResultId && (
                                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                                        Updated ID: <span className="font-mono font-bold">{lastResultId}</span>
                                    </motion.div>
                                )}
                                </AnimatePresence>

                                <motion.button
                                    whileHover={!saving ? { scale: 1.01 } : {}}
                                    whileTap={!saving ? { scale: 0.98 } : {}}
                                    onClick={apply}
                                    disabled={saving}
                                    className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"
                                >
                                    {saving ? 'Applying…' : 'Apply Changes'}
                                </motion.button>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </>
                )}
            </div>
        </div>
    );
};

export default BranchTransferScreen;
