import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';

const PickupAuthorizationScreen = () => {
    const [children, setChildren] = useState<any[]>([]);
    const [activeChildId, setActiveChildId] = useState('');
    const [persons, setPersons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', relationship: '', phone: '' });
    const [saving, setSaving] = useState(false);

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
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove');
        }
    };

    if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;

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
                <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    <UserPlus className="w-4 h-4" /> Add Person
                </button>
            </div>

            {showAdd && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2">
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} placeholder="Relationship (e.g. Uncle, Driver)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={handleAdd} disabled={saving} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                        {saving ? 'Saving...' : 'Add'}
                    </button>
                </div>
            )}

            {persons.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No one is authorized yet. Add the people who can collect your child.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {persons.map(p => (
                        <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                                <p className="text-xs text-gray-400">{p.relationship}{p.phone ? ` · ${p.phone}` : ''}</p>
                            </div>
                            <button onClick={() => handleRemove(p.id)}><Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PickupAuthorizationScreen;
