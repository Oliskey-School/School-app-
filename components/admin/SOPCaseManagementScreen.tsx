import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Shield, AlertTriangle, ChevronRight, Plus } from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

interface SOPCaseManagementScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const STATUS_STYLES: Record<string, string> = {
    open: 'bg-amber-50 text-amber-700',
    in_progress: 'bg-blue-50 text-blue-700',
    resolved: 'bg-green-50 text-green-700',
    archived: 'bg-gray-100 text-gray-600',
};

function fmtDate(value: string): string {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const SOPCaseManagementScreen: React.FC<SOPCaseManagementScreenProps> = ({ navigateTo }) => {
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');

    const fetchCases = useCallback(async () => {
        setLoading(true);
        try {
            const params = statusFilter ? `?status=${statusFilter}` : '';
            const data = await api.get<any[]>(`/sop/cases${params}`);
            setCases(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading SOP cases:', err);
            toast.error('Failed to load cases');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchCases(); }, [fetchCases]);

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">Case Management</h1>
                    <p className="text-gray-500">Every reported incident, its workflow progress, and its permanent record.</p>
                </div>
                <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigateTo('sopSettings', 'SOP Incident Types')}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors font-semibold">
                        <Shield className="w-4 h-4" /> Incident Types
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigateTo('reportIncident', 'Report Incident')}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-semibold">
                        <Plus className="w-5 h-5" /> Report Incident
                    </motion.button>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                {['', 'open', 'in_progress', 'archived'].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {s === '' ? 'All' : s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <CenteredLoader message="Loading cases..." className="py-12" />
            ) : cases.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No cases</h3>
                    <p className="text-gray-500 mt-1">Reported incidents will appear here.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-50">
                        {cases.map((c, ci) => (
                            <motion.button key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: Math.min(ci, 15) * 0.02 }} onClick={() => navigateTo('sopCaseDetail', c.title, { caseId: c.id })}
                                className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 text-left">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-900">{c.title}</p>
                                        {c.critical_alert_sent && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{c.incident_type.name} · Reported {fmtDate(c.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {c.status.replace('_', ' ')}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SOPCaseManagementScreen;
