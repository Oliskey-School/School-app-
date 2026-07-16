import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { ClipboardCheck, Star } from 'lucide-react';

interface Criterion { key: string; label: string; max_score: number; }
interface Response { criterion_key: string; score: number; comment: string | null; }
interface Observation {
    id: string; date: string; overall_score: number; overall_grade: string; notes: string | null;
    responses: Response[]; criteria: Criterion[];
}

const GRADE_STYLES: Record<string, string> = {
    A: 'bg-green-50 text-green-700', B: 'bg-blue-50 text-blue-700', C: 'bg-amber-50 text-amber-700',
    D: 'bg-orange-50 text-orange-700', F: 'bg-red-50 text-red-700',
};

const MyObservations = () => {
    const [observations, setObservations] = useState<Observation[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const result = await api.getMyObservations();
                setObservations(Array.isArray(result) ? result : []);
            } catch (err) {
                console.error('Error loading observations:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">Classroom Observation Feedback</h1>
                <p className="text-gray-500">Feedback from classroom observations conducted by your school's admin.</p>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : observations.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No observations yet</h3>
                    <p className="text-gray-500 mt-1">Feedback will appear here after your first classroom observation.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {observations.map(o => (
                        <div key={o.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                                <div>
                                    <p className="font-bold text-gray-900">{new Date(o.date).toLocaleDateString()}</p>
                                    {o.notes && <p className="text-sm text-gray-500">{o.notes}</p>}
                                </div>
                                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${GRADE_STYLES[o.overall_grade] || 'bg-gray-100 text-gray-600'}`}>
                                    {o.overall_score}% ({o.overall_grade})
                                </span>
                            </div>
                            {expanded === o.id && (
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                    {o.criteria.map(c => {
                                        const resp = o.responses.find(r => r.criterion_key === c.key);
                                        return (
                                            <div key={c.key}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-semibold text-gray-700">{c.label}</p>
                                                    <div className="flex items-center gap-1">
                                                        {Array.from({ length: c.max_score }, (_, i) => i + 1).map(n => (
                                                            <Star key={n} className={`w-3.5 h-3.5 ${(resp?.score || 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                                {resp?.comment && <p className="text-xs text-gray-500">{resp.comment}</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyObservations;
