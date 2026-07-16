import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Users, UserCheck, UserX, Bus, Wrench, Receipt, HeartPulse, Contact, Gauge, ShieldAlert, RefreshCcw } from 'lucide-react';

interface Snapshot {
    students_present: number;
    teachers_present: number;
    teachers_absent: number;
    buses_active: number;
    open_maintenance_requests: number;
    unpaid_fees_today: number;
    medical_incidents_today: number;
    visitors_on_campus: number;
    classes_running_pct: number;
    ai_alerts: number;
    generated_at: string;
    estimates: string[];
}

const CARDS: { key: keyof Snapshot; label: string; icon: React.ElementType; color: string; suffix?: string }[] = [
    { key: 'students_present', label: 'Students Present', icon: Users, color: 'bg-emerald-50 text-emerald-700' },
    { key: 'teachers_present', label: 'Teachers Present', icon: UserCheck, color: 'bg-blue-50 text-blue-700' },
    { key: 'teachers_absent', label: 'Teachers Absent', icon: UserX, color: 'bg-red-50 text-red-700' },
    { key: 'buses_active', label: 'Buses Active', icon: Bus, color: 'bg-amber-50 text-amber-700' },
    { key: 'open_maintenance_requests', label: 'Maintenance Requests', icon: Wrench, color: 'bg-orange-50 text-orange-700' },
    { key: 'unpaid_fees_today', label: 'Unpaid Fees', icon: Receipt, color: 'bg-rose-50 text-rose-700' },
    { key: 'medical_incidents_today', label: 'Medical Incidents Today', icon: HeartPulse, color: 'bg-pink-50 text-pink-700' },
    { key: 'visitors_on_campus', label: 'Visitors On Campus', icon: Contact, color: 'bg-cyan-50 text-cyan-700' },
    { key: 'classes_running_pct', label: 'Classes Running', icon: Gauge, color: 'bg-indigo-50 text-indigo-700', suffix: '%' },
    { key: 'ai_alerts', label: 'AI Alerts', icon: ShieldAlert, color: 'bg-fuchsia-50 text-fuchsia-700' },
];

const REFRESH_MS = 30000;

const DigitalTwinScreen = () => {
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSnapshot = useCallback(async () => {
        try {
            const data = await api.getDigitalTwinSnapshot();
            setSnapshot(data);
        } catch (err) {
            console.error('Error loading Digital Twin snapshot:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSnapshot();
        const interval = setInterval(fetchSnapshot, REFRESH_MS);
        return () => clearInterval(interval);
    }, [fetchSnapshot]);

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit flex items-center gap-2">🏫 School Status</h1>
                    <p className="text-gray-500">A live snapshot of everything happening right now.</p>
                </div>
                <button onClick={fetchSnapshot} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    <RefreshCcw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {loading || !snapshot ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {CARDS.map(c => {
                            const Icon = c.icon;
                            const isEstimate = snapshot.estimates?.includes(c.key);
                            return (
                                <div key={c.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${c.color}`}>
                                        <Icon className="w-4.5 h-4.5" />
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{snapshot[c.key]}{c.suffix || ''}</p>
                                    <p className="text-xs text-gray-500">{c.label}{isEstimate ? ' (est.)' : ''}</p>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-gray-400">Last updated {new Date(snapshot.generated_at).toLocaleTimeString()} — refreshes automatically every 30 seconds. Buses and classes running are best-effort estimates, not live tracking.</p>
                </>
            )}
        </div>
    );
};

export default DigitalTwinScreen;
