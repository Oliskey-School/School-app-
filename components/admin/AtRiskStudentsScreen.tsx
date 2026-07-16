import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldAlert } from 'lucide-react';

interface RiskReason { category: string; detail: string; points: number; }
interface FlaggedStudent {
    id: string;
    student_id: string;
    student_name: string;
    avatar_url: string | null;
    class_name: string | null;
    score: number;
    level: 'Low' | 'Medium' | 'High';
    reasons: RiskReason[];
    computed_at: string;
}

const LEVEL_STYLES: Record<string, string> = {
    High: 'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const AtRiskStudentsScreen = () => {
    const [students, setStudents] = useState<FlaggedStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [levelFilter, setLevelFilter] = useState<string>('');
    const [resolvingId, setResolvingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await api.getFlaggedStudents(levelFilter ? { level: levelFilter } : undefined);
            setStudents(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error('Error loading at-risk students:', err);
            toast.error('Failed to load at-risk students');
        } finally {
            setLoading(false);
        }
    }, [levelFilter]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleScan = async () => {
        setScanning(true);
        try {
            const result = await api.runRiskScan();
            toast.success(`Scan complete — ${result.flaggedCount} student${result.flaggedCount !== 1 ? 's' : ''} flagged`);
            fetchData();
        } catch (err: any) {
            toast.error(err?.message || 'Scan failed');
        } finally {
            setScanning(false);
        }
    };

    const handleResolve = async (id: string) => {
        setResolvingId(id);
        try {
            await api.resolveRiskFlag(id);
            toast.success('Marked as resolved');
            setStudents(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to resolve');
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-outfit">At-Risk Students</h1>
                    <p className="text-gray-500">Students flagged from attendance, homework, fees, behaviour, and exam scores.</p>
                </div>
                <button onClick={handleScan} disabled={scanning}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60">
                    <RefreshCcw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} /> {scanning ? 'Scanning...' : 'Run Scan Now'}
                </button>
            </div>

            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1 w-fit">
                {['', 'High', 'Medium', 'Low'].map(lvl => (
                    <button key={lvl} onClick={() => setLevelFilter(lvl)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${levelFilter === lvl ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        {lvl || 'All'}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : students.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No at-risk students</h3>
                    <p className="text-gray-500 mt-1">Everyone is currently on track.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {students.map(s => (
                        <div key={s.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${LEVEL_STYLES[s.level] || 'border-gray-100'}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="w-8 h-8 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900">{s.student_name}</p>
                                        <p className="text-sm text-gray-500">{s.class_name || 'No class'} · Risk score {s.score}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${LEVEL_STYLES[s.level]}`}>{s.level} Risk</span>
                                    <button onClick={() => handleResolve(s.id)} disabled={resolvingId === s.id}
                                        className="text-xs font-semibold text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-lg px-2.5 py-1 disabled:opacity-60">
                                        {resolvingId === s.id ? 'Resolving...' : 'Mark Resolved'}
                                    </button>
                                </div>
                            </div>
                            <ul className="mt-3 space-y-1.5">
                                {s.reasons.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                                        <span><span className="font-semibold">{r.category}:</span> {r.detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AtRiskStudentsScreen;
