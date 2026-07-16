import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, ClipboardCheck } from 'lucide-react';

const GatePassApprovals = () => {
    const [pending, setPending] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actingId, setActingId] = useState<string | null>(null);

    const fetchPending = useCallback(async () => {
        try {
            const result = await api.getDepartures({ status: 'Pending' });
            setPending(Array.isArray(result) ? result.filter((d: any) => d.type === 'EarlyDismissal') : []);
        } catch (err) {
            console.error('Error loading gate pass requests:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPending(); }, [fetchPending]);

    const handleDecision = async (id: string, approve: boolean) => {
        setActingId(id);
        try {
            if (approve) await api.approveDeparture(id); else await api.denyDeparture(id);
            toast.success(approve ? 'Gate pass approved' : 'Gate pass denied');
            setPending(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update');
        } finally {
            setActingId(null);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">Gate Pass Approvals</h1>
                <p className="text-gray-500">Early dismissal requests awaiting your decision.</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : pending.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <ClipboardCheck className="w-12 h-12 text-green-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">All clear</h3>
                    <p className="text-gray-500 mt-1">No pending gate pass requests.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pending.map(d => (
                        <div key={d.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <p className="font-bold text-gray-900">{d.student_name}</p>
                            <p className="text-sm text-gray-500">Pickup: {d.pickup_person_name || 'Unspecified'}</p>
                            {d.reason && <p className="text-sm text-gray-600 mt-1 italic">"{d.reason}"</p>}
                            <div className="flex gap-2 mt-3">
                                <button disabled={actingId === d.id} onClick={() => handleDecision(d.id, true)}
                                    className="flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60">
                                    <CheckCircle2 className="w-4 h-4" /> Approve
                                </button>
                                <button disabled={actingId === d.id} onClick={() => handleDecision(d.id, false)}
                                    className="flex items-center gap-1.5 bg-red-50 text-red-600 text-sm font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60">
                                    <XCircle className="w-4 h-4" /> Deny
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GatePassApprovals;
