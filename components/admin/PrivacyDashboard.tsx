import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, FileText, Trash2, Download, X, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface DataRequest {
    id: string;
    requester_name: string;
    student_name: string;
    request_type: string;
    status: string;
    data_categories?: string[] | null;
    requested_at?: string | null;
    completed_at?: string | null;
}

interface Policy {
    id: string;
    title: string;
    category?: string | null;
    description?: string | null;
    url?: string | null;
    status?: string | null;
    review_date?: string | null;
    updated_at?: string | null;
}

const REQUEST_TYPES = ['Access', 'Rectification', 'Erasure', 'Portability', 'Restriction'];
const DATA_CATEGORIES = ['Personal Information', 'Academic Records', 'Health Records', 'Attendance Records', 'Financial Records'];
const STATUS_OPTIONS = ['pending', 'in_progress', 'completed', 'rejected'];

const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
};

const statusLabel = (status?: string | null) => {
    const s = (status || 'pending').toLowerCase();
    return s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 },
};

const PrivacyDashboard: React.FC = () => {
    const { currentBranchId, currentSchool } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'dsar' | 'retention'>('overview');
    const [dsarRequests, setDsarRequests] = useState<DataRequest[]>([]);
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [loadingDsar, setLoadingDsar] = useState(false);
    const [loadingPolicies, setLoadingPolicies] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [manageOpenId, setManageOpenId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const [showRequestModal, setShowRequestModal] = useState(false);
    const [savingRequest, setSavingRequest] = useState(false);

    const [editingPolicy, setEditingPolicy] = useState<Policy | 'new' | null>(null);
    const [savingPolicy, setSavingPolicy] = useState(false);
    const [newPolicyDefaults, setNewPolicyDefaults] = useState<{ title: string; category: string } | null>(null);

    const schoolId = currentSchool?.id;

    const loadData = useCallback(async () => {
        setLoadingDsar(true); setLoadingPolicies(true); setError(null);
        try {
            const [drResp, polResp] = await Promise.all([
                api.getDataRequests(schoolId, currentBranchId || undefined),
                api.getSafeguardingPolicies(schoolId, currentBranchId || undefined),
            ]);
            const dr = Array.isArray(drResp) ? drResp : ((drResp as any)?.data || []);
            const pol = Array.isArray(polResp) ? polResp : ((polResp as any)?.data || []);
            setDsarRequests(dr);
            setPolicies(pol);
        } catch (e: any) {
            setError(e?.message || 'Failed to load privacy data');
        } finally {
            setLoadingDsar(false); setLoadingPolicies(false);
        }
    }, [schoolId, currentBranchId]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (cancelled) return;
            await loadData();
        })();
        return () => { cancelled = true; };
    }, [loadData]);

    const formatDate = (iso?: string | null) => {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: '2-digit' });
        } catch { return '—'; }
    };

    const openRequests = dsarRequests.filter(r => !['completed', 'rejected'].includes((r.status || 'pending').toLowerCase()));

    const handleUpdateStatus = async (id: string, status: string) => {
        setUpdatingId(id);
        setManageOpenId(null);
        const previous = dsarRequests;
        setDsarRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        try {
            await api.updateDataRequestStatus(id, status);
            toast.success(`Request marked ${statusLabel(status)}`);
        } catch (e: any) {
            setDsarRequests(previous);
            toast.error(e?.message || 'Failed to update request');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCreateRequest = async (data: { requester_name: string; student_name: string; request_type: string; data_categories: string[] }) => {
        setSavingRequest(true);
        try {
            const created = await api.createDataRequest(data, schoolId, currentBranchId || undefined);
            setDsarRequests(prev => [created, ...prev]);
            toast.success('Data subject request logged');
            setShowRequestModal(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to log request');
        } finally {
            setSavingRequest(false);
        }
    };

    const handleSavePolicy = async (data: { title: string; category: string; description: string; url: string; status: string; review_date: string }) => {
        setSavingPolicy(true);
        try {
            if (editingPolicy && editingPolicy !== 'new') {
                const updated = await api.updateSafeguardingPolicy(editingPolicy.id, data);
                setPolicies(prev => prev.map(p => p.id === editingPolicy.id ? updated : p));
                toast.success('Policy updated');
            } else {
                const created = await api.createSafeguardingPolicy(data, schoolId, currentBranchId || undefined);
                setPolicies(prev => [created, ...prev]);
                toast.success('Policy recorded');
            }
            setEditingPolicy(null);
            setNewPolicyDefaults(null);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save policy');
        } finally {
            setSavingPolicy(false);
        }
    };

    const handleExportCsv = () => {
        const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows: string[] = [];
        rows.push('Data Subject Access Requests');
        rows.push(['ID', 'Requester', 'Student', 'Type', 'Status', 'Requested', 'Completed'].map(escape).join(','));
        dsarRequests.forEach(r => {
            rows.push([r.id, r.requester_name, r.student_name, r.request_type, statusLabel(r.status), formatDate(r.requested_at), formatDate(r.completed_at)].map(escape).join(','));
        });
        rows.push('');
        rows.push('Privacy Policies');
        rows.push(['ID', 'Title', 'Category', 'Status', 'Last Updated'].map(escape).join(','));
        policies.forEach(p => {
            rows.push([p.id, p.title, p.category, p.status, formatDate(p.updated_at)].map(escape).join(','));
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ndpr-compliance-export-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Export downloaded');
    };

    const complianceBadge = () => {
        if (loadingDsar) {
            return (
                <div className="flex items-center space-x-2 bg-gray-50 text-gray-500 px-4 py-2 rounded-xl border border-gray-100">
                    <Shield className="w-5 h-5" />
                    <span className="font-bold">Checking…</span>
                </div>
            );
        }
        if (openRequests.length === 0) {
            return (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-bold">All Requests Resolved</span>
                </motion.div>
            );
        }
        return (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center space-x-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-bold">{openRequests.length} Open Request{openRequests.length === 1 ? '' : 's'}</span>
            </motion.div>
        );
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Privacy & NDPR Compliance</h1>
                    <p className="text-gray-500">Manage data protection and subject access requests.</p>
                </div>
                {complianceBadge()}
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
                {(['overview', 'dsar', 'retention'] as const).map(tab => (
                    <motion.button
                        key={tab}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {activeTab === tab && (
                            <motion.div layoutId="privacyTab" className="absolute inset-0 bg-white shadow-sm rounded-lg" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                        )}
                        <span className="relative">{tab}</span>
                    </motion.button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-1 md:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-orange-500" />
                                    Privacy Impact Assessment (DPIA)
                                </h3>
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
                                    <p className="text-sm text-orange-800">Nigerian Data Protection Commission guidance recommends a documented DPIA for any processing that poses a high risk to data subjects. Starting one creates a tracked policy record below.</p>
                                    <motion.button
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => { setNewPolicyDefaults({ title: `Data Protection Impact Assessment — ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'short' })}`, category: 'DPIA' }); setEditingPolicy('new'); }}
                                        className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                                    >
                                        Start Assessment
                                    </motion.button>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold mb-4">Privacy Policies</h3>
                                <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-3">
                                    {loadingPolicies ? (
                                        <p className="text-sm text-gray-500">Loading policies…</p>
                                    ) : policies.length === 0 ? (
                                        <p className="text-sm text-gray-500">No safeguarding policies recorded yet.</p>
                                    ) : policies.map(p => (
                                        <motion.div key={p.id} variants={itemVariants} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 transition">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-blue-500" />
                                                <div>
                                                    <p className="font-medium">{p.title}</p>
                                                    <p className="text-xs text-gray-500">Last updated: {formatDate(p.updated_at)}{p.category ? ` · ${p.category}` : ''}</p>
                                                </div>
                                            </div>
                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditingPolicy(p)} className="text-indigo-600 font-bold text-sm">Update</motion.button>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg">
                                <p className="text-indigo-200 text-sm font-medium mb-1">DPO Contact</p>
                                <p className="text-lg font-bold">{currentSchool?.name || 'School Admin'}</p>
                                <p className="text-indigo-300 text-sm">{currentSchool?.contactEmail || 'Set a contact email in School Settings'}</p>
                                <p className="text-indigo-300 text-xs mt-4">Required by NDPR for data controller classification.</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Download className="w-8 h-8 text-blue-600" />
                                </div>
                                <h4 className="font-bold">Compliance Export</h4>
                                <p className="text-sm text-gray-500 mb-4">Download data requests and policy inventory for NDPC audit.</p>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleExportCsv} className="w-full py-2 border rounded-xl font-bold text-sm hover:bg-gray-50">Download (.csv)</motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'dsar' && (
                    <motion.div key="dsar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold">Active Data Subject Requests</h2>
                            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowRequestModal(true)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">+ Log New Request</motion.button>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loadingDsar ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-sm text-gray-500">Loading…</td></tr>
                                ) : dsarRequests.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-4 text-sm text-gray-500">No data subject requests yet.</td></tr>
                                ) : dsarRequests.map(dsar => {
                                    const subject = dsar.requester_name || dsar.student_name || 'Unknown';
                                    const type = dsar.request_type || '—';
                                    const status = (dsar.status || 'pending').toLowerCase();
                                    return (
                                        <motion.tr key={dsar.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-xs">{dsar.id.slice(0, 8)}</td>
                                            <td className="px-6 py-4 text-sm font-medium">{subject}</td>
                                            <td className="px-6 py-4 text-sm">{type}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyles[status] || statusStyles.pending}`}>
                                                    {statusLabel(status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right relative">
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    disabled={updatingId === dsar.id}
                                                    onClick={() => setManageOpenId(manageOpenId === dsar.id ? null : dsar.id)}
                                                    className="text-indigo-600 text-sm font-bold hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    {updatingId === dsar.id ? 'Saving…' : 'Manage'} <ChevronDown className="w-3 h-3" />
                                                </motion.button>
                                                <AnimatePresence>
                                                    {manageOpenId === dsar.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute right-6 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 w-40 overflow-hidden text-left"
                                                        >
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <button
                                                                    key={opt}
                                                                    onClick={() => handleUpdateStatus(dsar.id, opt)}
                                                                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 ${status === opt ? 'text-indigo-600 font-bold' : 'text-gray-600'}`}
                                                                >
                                                                    {statusLabel(opt)}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </motion.div>
                )}

                {activeTab === 'retention' && (
                    <motion.div key="retention" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3">
                            <Trash2 className="w-6 h-6 text-red-500" />
                            <h2 className="text-lg font-bold">Data Retention Schedules</h2>
                        </div>
                        <p className="text-sm text-gray-500">Configure how long specific data sets are kept before automated purging or anonymization.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border rounded-xl space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-bold">Academic Records</span>
                                    <span className="text-indigo-600 text-sm font-bold">7 Years</span>
                                </div>
                                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '80%' }} transition={{ duration: 0.6, ease: 'easeOut' }} className="bg-indigo-600 h-full" />
                                </div>
                            </div>
                            <div className="p-4 border rounded-xl space-y-2">
                                <div className="flex justify-between">
                                    <span className="font-bold">Medical Records</span>
                                    <span className="text-indigo-600 text-sm font-bold">3 Years</span>
                                </div>
                                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '40%' }} transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }} className="bg-green-500 h-full" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showRequestModal && (
                <NewRequestModal
                    saving={savingRequest}
                    onClose={() => setShowRequestModal(false)}
                    onSave={handleCreateRequest}
                />
            )}

            {editingPolicy && (
                <PolicyModal
                    policy={editingPolicy === 'new' ? null : editingPolicy}
                    defaults={newPolicyDefaults}
                    saving={savingPolicy}
                    onClose={() => { setEditingPolicy(null); setNewPolicyDefaults(null); }}
                    onSave={handleSavePolicy}
                />
            )}
        </div>
    );
};

const NewRequestModal: React.FC<{
    saving: boolean;
    onClose: () => void;
    onSave: (data: { requester_name: string; student_name: string; request_type: string; data_categories: string[] }) => void;
}> = ({ saving, onClose, onSave }) => {
    const [requesterName, setRequesterName] = useState('');
    const [studentName, setStudentName] = useState('');
    const [requestType, setRequestType] = useState(REQUEST_TYPES[0]);
    const [categories, setCategories] = useState<string[]>([]);

    const toggleCategory = (c: string) => {
        setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
    };

    const canSave = requesterName.trim() && studentName.trim() && categories.length > 0;

    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Log Data Subject Request</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Requester Name</label>
                        <input value={requesterName} onChange={e => setRequesterName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Parent / Guardian name" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Student Name</label>
                        <input value={studentName} onChange={e => setStudentName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Student the request concerns" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Request Type</label>
                        <select value={requestType} onChange={e => setRequestType(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                            {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Data Categories</label>
                        <div className="mt-2 space-y-1">
                            {DATA_CATEGORIES.map(c => (
                                <label key={c} className="flex items-center gap-2 text-sm text-gray-700">
                                    <input type="checkbox" checked={categories.includes(c)} onChange={() => toggleCategory(c)} />
                                    {c}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <motion.button
                        whileHover={canSave ? { scale: 1.02 } : {}}
                        whileTap={canSave ? { scale: 0.98 } : {}}
                        disabled={!canSave || saving}
                        onClick={() => onSave({ requester_name: requesterName.trim(), student_name: studentName.trim(), request_type: requestType, data_categories: categories })}
                        className="px-4 py-2 text-white font-medium rounded-lg shadow-sm transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Logging…' : 'Log Request'}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

const PolicyModal: React.FC<{
    policy: Policy | null;
    defaults: { title: string; category: string } | null;
    saving: boolean;
    onClose: () => void;
    onSave: (data: { title: string; category: string; description: string; url: string; status: string; review_date: string }) => void;
}> = ({ policy, defaults, saving, onClose, onSave }) => {
    const [title, setTitle] = useState(policy?.title || defaults?.title || '');
    const [category, setCategory] = useState(policy?.category || defaults?.category || '');
    const [description, setDescription] = useState(policy?.description || '');
    const [url, setUrl] = useState(policy?.url || '');
    const [status, setStatus] = useState(policy?.status || 'active');
    const [reviewDate, setReviewDate] = useState(policy?.review_date ? policy.review_date.slice(0, 10) : '');

    const canSave = title.trim().length > 0;

    return createPortal(
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{policy ? 'Update Policy' : 'New Policy'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                        <input value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. DPIA, Data Retention, Consent" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={3} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Document URL</label>
                        <input value={url} onChange={e => setUrl(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://…" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                                <option value="active">Active</option>
                                <option value="under_review">Under Review</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Review Date</label>
                            <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <motion.button
                        whileHover={canSave ? { scale: 1.02 } : {}}
                        whileTap={canSave ? { scale: 0.98 } : {}}
                        disabled={!canSave || saving}
                        onClick={() => onSave({ title: title.trim(), category: category.trim(), description: description.trim(), url: url.trim(), status, review_date: reviewDate })}
                        className="px-4 py-2 text-white font-medium rounded-lg shadow-sm transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving…' : 'Save Policy'}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
};

export default PrivacyDashboard;
