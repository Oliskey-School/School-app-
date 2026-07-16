import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Shield, ChevronRight, Plus, AlertTriangle } from 'lucide-react';

interface MySOPCasesScreenProps {
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

const MySOPCasesScreen: React.FC<MySOPCasesScreenProps> = ({ navigateTo }) => {
    const [cases, setCases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCases = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get<any[]>('/sop/cases');
            setCases(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading my SOP cases:', err);
            toast.error('Failed to load your reported cases');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCases(); }, [fetchCases]);

    return (
        <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6 pb-24">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 font-outfit">My Reported Cases</h1>
                    <p className="text-sm text-gray-500">Incidents you've reported and their progress.</p>
                </div>
                <button onClick={() => navigateTo('reportIncident', 'Report Incident')}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-sm">
                    <Plus className="w-4 h-4" /> Report
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : cases.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                    <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-semibold">You haven't reported any incidents yet.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-50">
                        {cases.map(c => (
                            <button key={c.id} onClick={() => navigateTo('sopCaseDetail', c.title, { caseId: c.id })}
                                className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-gray-50/50 text-left">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
                                        {c.critical_alert_sent && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{c.incident_type.name} · {fmtDate(c.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {c.status.replace('_', ' ')}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-gray-300" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MySOPCasesScreen;
