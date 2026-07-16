import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { HeartHandshake, X } from 'lucide-react';

interface ChildRisk {
    student_id: string;
    student_name: string;
    message: string;
}

/** A deliberately gentle, non-technical notice for parents — no scores or
 * jargon, just a nudge to check in with the teacher. */
const ChildRiskBanner = () => {
    const [flags, setFlags] = useState<ChildRisk[]>([]);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    const fetchFlags = useCallback(async () => {
        try {
            const data = await api.getMyChildrenRisk();
            setFlags(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching child risk notices:', err);
        }
    }, []);

    useEffect(() => { fetchFlags(); }, [fetchFlags]);

    const visible = flags.filter(f => !dismissedIds.includes(f.student_id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-3">
            {visible.map(f => (
                <div key={f.student_id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <HeartHandshake className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-amber-900">A Note About {f.student_name}</p>
                        <p className="text-sm text-amber-700 mt-0.5">{f.message}</p>
                    </div>
                    <button onClick={() => setDismissedIds(d => [...d, f.student_id])}
                        className="p-1 text-amber-400 hover:text-amber-600 flex-shrink-0" aria-label="Dismiss">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ChildRiskBanner;
