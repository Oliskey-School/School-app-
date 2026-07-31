import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import {
    Plus, Trash2, GripVertical, AlertTriangle, Shield, ChevronUp, ChevronDown, Bell
} from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

interface Stage {
    id?: string;
    name: string;
    notify_roles: string[];
    requires_evidence: boolean;
    requires_decision: boolean;
    is_terminal?: boolean;
}

interface IncidentType {
    id: string;
    name: string;
    description: string | null;
    severity: 'standard' | 'critical';
    is_critical_alert: boolean;
    alert_audience: string | null;
    is_active: boolean;
    stages: Stage[];
}

const ROLE_OPTIONS = ['ADMIN', 'TEACHER', 'PARENT'];
const emptyStage = (): Stage => ({ name: '', notify_roles: [], requires_evidence: false, requires_decision: false });

const SOPSettingsScreen = () => {
    const [types, setTypes] = useState<IncidentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<IncidentType | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isCriticalAlert, setIsCriticalAlert] = useState(false);
    const [alertAudience, setAlertAudience] = useState('staff');
    const [stages, setStages] = useState<Stage[]>([emptyStage()]);

    const fetchTypes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<IncidentType[]>('/sop/incident-types');
            setTypes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching incident types:', err);
            toast.error('Failed to load incident types');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTypes(); }, [fetchTypes]);

    const openCreate = () => {
        setEditing(null);
        setName(''); setDescription(''); setIsCriticalAlert(false); setAlertAudience('staff');
        setStages([emptyStage()]);
        setShowForm(true);
    };

    const openEdit = (t: IncidentType) => {
        setEditing(t);
        setName(t.name); setDescription(t.description || ''); setIsCriticalAlert(t.is_critical_alert); setAlertAudience(t.alert_audience || 'staff');
        setStages(t.stages.length > 0 ? t.stages.map(s => ({ ...s })) : [emptyStage()]);
        setShowForm(true);
    };

    const updateStage = (index: number, patch: Partial<Stage>) => {
        setStages(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
    };

    const toggleStageRole = (index: number, role: string) => {
        setStages(prev => prev.map((s, i) => {
            if (i !== index) return s;
            const has = s.notify_roles.includes(role);
            return { ...s, notify_roles: has ? s.notify_roles.filter(r => r !== role) : [...s.notify_roles, role] };
        }));
    };

    const addStage = () => setStages(prev => [...prev, emptyStage()]);
    const removeStage = (index: number) => setStages(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
    const moveStage = (index: number, dir: -1 | 1) => {
        setStages(prev => {
            const next = [...prev];
            const target = index + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const handleSave = async () => {
        if (!name.trim()) { toast.error('Please enter an incident type name'); return; }
        if (stages.some(s => !s.name.trim())) { toast.error('Every stage needs a name'); return; }
        setSaving(true);
        try {
            const payload = {
                name, description, severity: isCriticalAlert ? 'critical' : 'standard',
                is_critical_alert: isCriticalAlert, alert_audience: alertAudience,
                stages: stages.map(s => ({ name: s.name, notify_roles: s.notify_roles, requires_evidence: s.requires_evidence, requires_decision: s.requires_decision })),
            };
            if (editing) {
                await api.put(`/sop/incident-types/${editing.id}`, payload);
                toast.success('Incident type updated');
            } else {
                await api.post('/sop/incident-types', payload);
                toast.success('Incident type created');
            }
            setShowForm(false);
            fetchTypes();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save incident type');
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (t: IncidentType) => {
        if (!window.confirm(`Deactivate "${t.name}"? Existing cases stay untouched; no new ones can be reported against it.`)) return;
        try {
            await api.delete(`/sop/incident-types/${t.id}`);
            toast.success('Incident type deactivated');
            fetchTypes();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to deactivate');
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">SOP Incident Types</h1>
                    <p className="text-gray-500">Define the workflow each type of incident follows, and who gets notified at each stage.</p>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openCreate}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-semibold">
                    <Plus className="w-5 h-5" /> New Incident Type
                </motion.button>
            </div>

            {loading ? (
                <CenteredLoader message="Loading incident types..." className="py-12" />
            ) : types.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No incident types yet</h3>
                    <p className="text-gray-500 mt-1">Create one (e.g. "Bullying" or "Fire Emergency") to start using SOP workflows.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {types.map((t, ti) => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(ti, 15) * 0.03 }} className={`bg-white p-5 rounded-2xl shadow-sm border space-y-3 ${t.is_active ? 'border-gray-100' : 'border-gray-200 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900">{t.name}</h3>
                                        {t.is_critical_alert && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                                                <AlertTriangle className="w-3 h-3" /> Critical Alert
                                            </span>
                                        )}
                                        {!t.is_active && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>}
                                    </div>
                                    {t.description && <p className="text-sm text-gray-500 mt-1">{t.description}</p>}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(t)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 text-xs font-bold">Edit</button>
                                    {t.is_active && (
                                        <button onClick={() => handleDeactivate(t)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {t.stages.map((s, i) => (
                                    <span key={i} className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                                        {i + 1}. {s.name}
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
            {showForm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 font-outfit">{editing ? 'Edit Incident Type' : 'New Incident Type'}</h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                                    <input type="text" placeholder="e.g. Bullying" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={name} onChange={e => setName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description (optional)</label>
                                    <input type="text" className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={description} onChange={e => setDescription(e.target.value)} />
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={isCriticalAlert} onChange={e => setIsCriticalAlert(e.target.checked)} />
                                    <span className="text-sm font-semibold text-amber-900 flex items-center gap-1">
                                        <Bell className="w-4 h-4" /> Critical — fire an immediate alert the moment a case is reported
                                    </span>
                                </label>
                                {isCriticalAlert && (
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-800 mb-1">Alert Audience</label>
                                        <select className="px-3 py-1.5 border border-amber-200 rounded-lg text-sm"
                                            value={alertAudience} onChange={e => setAlertAudience(e.target.value)}>
                                            <option value="staff">Staff (Admins + Teachers)</option>
                                            <option value="all">Everyone (Staff + Parents + Students)</option>
                                            <option value="parents">Parents Only</option>
                                            <option value="teachers">Teachers Only</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold text-gray-700">Workflow Stages (in order)</label>
                                    <button onClick={addStage} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">+ Add Stage</button>
                                </div>
                                <div className="space-y-3">
                                    {stages.map((s, i) => (
                                        <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                                                <input type="text" placeholder="Stage name, e.g. Vice Principal Notified"
                                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    value={s.name} onChange={e => updateStage(i, { name: e.target.value })} />
                                                <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                                                <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                                                <button onClick={() => removeStage(i)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 pl-9 text-xs">
                                                <span className="text-gray-400 font-semibold">Notify:</span>
                                                {ROLE_OPTIONS.map(role => (
                                                    <label key={role} className="flex items-center gap-1 cursor-pointer">
                                                        <input type="checkbox" checked={s.notify_roles.includes(role)} onChange={() => toggleStageRole(i, role)} />
                                                        <span className="text-gray-600">{role.charAt(0) + role.slice(1).toLowerCase()}</span>
                                                    </label>
                                                ))}
                                                <span className="text-gray-300">|</span>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input type="checkbox" checked={s.requires_evidence} onChange={e => updateStage(i, { requires_evidence: e.target.checked })} />
                                                    <span className="text-gray-600">Requires evidence</span>
                                                </label>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input type="checkbox" checked={s.requires_decision} onChange={e => updateStage(i, { requires_decision: e.target.checked })} />
                                                    <span className="text-gray-600">Requires decision</span>
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Stages with no requirements notify their recipients and advance automatically. The last stage always archives the case once completed.</p>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowForm(false)} className="flex-grow py-3 px-4 border border-gray-200 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-colors">Cancel</motion.button>
                            <motion.button whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.98 } : {}} onClick={handleSave} disabled={saving}
                                className="flex-grow py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-60">
                                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default SOPSettingsScreen;
