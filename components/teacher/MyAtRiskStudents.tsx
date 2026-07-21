import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface RiskReason { category: string; detail: string; }
interface FlaggedStudent {
    id: string; student_id: string; student_name: string; class_name: string | null;
    score: number; level: 'Low' | 'Medium' | 'High'; reasons: RiskReason[];
}

const LEVEL_STYLES: Record<string, string> = {
    High: 'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const MyAtRiskStudents = () => {
    const [students, setStudents] = useState<FlaggedStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorOccurred, setErrorOccurred] = useState(false);

    const fetchFlaggedStudents = async () => {
        try {
            setLoading(true);
            setErrorOccurred(false);
            const result = await api.getMyFlaggedStudents();
            setStudents(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error('Error loading at-risk students:', err);
            setErrorOccurred(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFlaggedStudents(); }, []);

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">At-Risk Students</h1>
                <p className="text-gray-500">Students in your classes who may need extra support.</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : errorOccurred ? (
                <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">Couldn't load at-risk students</h3>
                    <p className="text-gray-500 mt-1 mb-4">There was a problem reaching the server. Please try again.</p>
                    <button
                        onClick={fetchFlaggedStudents}
                        className="px-5 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm"
                    >
                        Retry
                    </button>
                </div>
            ) : students.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No at-risk students</h3>
                    <p className="text-gray-500 mt-1">Everyone in your classes is currently on track.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {students.map(s => (
                        <div key={s.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${LEVEL_STYLES[s.level] || 'border-gray-100'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <ShieldAlert className="w-7 h-7 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-gray-900">{s.student_name}</p>
                                    <p className="text-sm text-gray-500">{s.class_name || 'No class'}</p>
                                </div>
                                <span className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full border ${LEVEL_STYLES[s.level]}`}>{s.level} Risk</span>
                            </div>
                            <ul className="space-y-1.5">
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

export default MyAtRiskStudents;
