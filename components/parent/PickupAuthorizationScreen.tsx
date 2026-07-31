import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import ConfirmationModal from '../ui/ConfirmationModal';

const PickupAuthorizationScreen = () => {
    const [children, setChildren] = useState<any[]>([]);
    const [activeChildId, setActiveChildId] = useState('');
    const [persons, setPersons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', relationship: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [personToRemove, setPersonToRemove] = useState<{ id: string; name: string } | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const kids = await api.getMyChildren();
                setChildren(Array.isArray(kids) ? kids : []);
                if (kids?.[0]?.id) setActiveChildId(kids[0].id);
            } catch (err) {
                console.error('Error loading children:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const fetchPersons = useCallback(async () => {
        if (!activeChildId) return;
        try {
            const result = await api.getAuthorizedPickupPersons(activeChildId);
            setPersons(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error('Error loading pickup persons:', err);
        }
    }, [activeChildId]);

    useEffect(() => { fetchPersons(); }, [fetchPersons]);

    const handleAdd = async () => {
        if (!form.name.trim() || !form.relationship.trim()) { toast.error('Name and relationship are required'); return; }
        setSaving(true);
        try {
            await api.addAuthorizedPickupPerson(activeChildId, form);
            toast.success('Added to the authorized pickup list');
            setForm({ name: '', relationship: '', phone: '' });
            setShowAdd(false);
            fetchPersons();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to add');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await api.removeAuthorizedPickupPerson(id);
            setPersons(prev => prev.filter(p => p.id !== id));
            toast.success('Removed from the authorized pickup list');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3" />
                <p className="text-gray-400 text-sm font-medium">Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">Pickup Authorization</h1>
                <p className="text-gray-500">Only people on this list can collect your child from school.</p>
            </div>

            {children.length > 1 && (
                <select value={activeChildId} onChange={e => setActiveChildId(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                    {children.map(c => <option key={c.id} value={c.id}>{c.name || c.full_name}</option>)}
                </select>
            )}

            <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Authorized People</h2>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    <UserPlus className="w-4 h-4" /> Add Person
                </motion.button>
            </div>

            <AnimatePresence>
            {showAdd && (
                <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2 overflow-hidden"
                >
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" aria-label="Full name"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} placeholder="Relationship (e.g. Uncle, Driver)" aria-label="Relationship"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)" aria-label="Phone (optional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleAdd} disabled={saving} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                        {saving ? 'Saving...' : 'Add'}
                    </motion.button>
                </motion.div>
            )}
            </AnimatePresence>

            {persons.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No one is authorized yet. Add the people who can collect your child.</p>
                </motion.div>
            ) : (
                <div className="space-y-2">
                    {persons.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.04 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3"
                        >
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.relationship}{p.phone ? ` · ${p.phone}` : ''}</p>
                            </div>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setPersonToRemove({ id: p.id, name: p.name })} aria-label={`Remove ${p.name}`}><Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" /></motion.button>
                        </motion.div>
                    ))}
                </div>
            )}

            <ConfirmationModal
                isOpen={!!personToRemove}
                onClose={() => setPersonToRemove(null)}
                onConfirm={() => personToRemove && handleRemove(personToRemove.id)}
                title="Remove authorized pickup person?"
                message={`${personToRemove?.name || 'This person'} will no longer be allowed to collect your child from school.`}
                confirmText="Remove"
                isDanger
            />
        </div>
    );
};

export default PickupAuthorizationScreen;
