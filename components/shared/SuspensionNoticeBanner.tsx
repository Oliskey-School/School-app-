import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { AlertTriangle, Paperclip, X } from 'lucide-react';

interface Suspension {
    id: string;
    student_id: string;
    student_name?: string;
    reason: string;
    start_date: string;
    return_date: string;
    return_conditions: string | null;
    attachment_urls: string[];
    status: 'active' | 'returned';
    issued_by_name: string | null;
    is_overdue: boolean;
    returned_at: string | null;
    return_note: string | null;
}

interface SuspensionNoticeBannerProps {
    /** 'student' fetches the logged-in student's own letters; 'parent' fetches all linked children's. */
    mode: 'student' | 'parent';
}

function fmtDate(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

const SuspensionNoticeBanner: React.FC<SuspensionNoticeBannerProps> = ({ mode }) => {
    const [suspensions, setSuspensions] = useState<Suspension[]>([]);
    const [open, setOpen] = useState<Suspension | null>(null);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    const fetchSuspensions = useCallback(async () => {
        try {
            const endpoint = mode === 'student' ? '/suspensions/mine/student' : '/suspensions/mine/children';
            const data = await api.get<Suspension[]>(endpoint);
            setSuspensions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching suspension notices:', err);
        }
    }, [mode]);

    useEffect(() => { fetchSuspensions(); }, [fetchSuspensions]);

    const active = suspensions.filter(s => s.status === 'active' && !dismissedIds.includes(s.id));
    if (active.length === 0 && !open) return null;

    return (
        <>
            <div className="space-y-3">
                {active.map(s => (
                    <div key={s.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-red-900">
                                {mode === 'parent' && s.student_name ? `${s.student_name} — ` : ''}Suspension Notice
                            </p>
                            <p className="text-sm text-red-700 mt-0.5">
                                Effective {fmtDate(s.start_date)} until {fmtDate(s.return_date)}
                                {s.is_overdue ? ' — return date has passed' : ''}.
                            </p>
                            <button onClick={() => setOpen(s)}
                                className="mt-2 text-sm font-bold text-red-700 underline hover:text-red-900">
                                Read Full Letter
                            </button>
                        </div>
                        <button onClick={() => setDismissedIds(d => [...d, s.id])}
                            className="p-1 text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Dismiss">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 font-outfit">Suspension Letter</h2>
                                {mode === 'parent' && open.student_name && (
                                    <p className="text-sm text-gray-500">{open.student_name}</p>
                                )}
                            </div>
                            <button onClick={() => setOpen(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div><p className="text-gray-400 font-semibold text-xs uppercase">Start Date</p><p className="font-semibold text-gray-900">{fmtDate(open.start_date)}</p></div>
                                <div><p className="text-gray-400 font-semibold text-xs uppercase">Return Date</p><p className="font-semibold text-gray-900">{fmtDate(open.return_date)}</p></div>
                            </div>
                            {open.issued_by_name && (
                                <div><p className="text-gray-400 font-semibold text-xs uppercase">Issued By</p><p className="font-semibold text-gray-900">{open.issued_by_name}</p></div>
                            )}
                            <div>
                                <p className="text-gray-400 font-semibold text-xs uppercase">Reason</p>
                                <p className="text-gray-700 whitespace-pre-wrap mt-1">{open.reason}</p>
                            </div>
                            {open.return_conditions && (
                                <div>
                                    <p className="text-gray-400 font-semibold text-xs uppercase">Conditions for Return</p>
                                    <p className="text-gray-700 whitespace-pre-wrap mt-1">{open.return_conditions}</p>
                                </div>
                            )}
                            {open.attachment_urls?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {open.attachment_urls.map((u, i) => (
                                        <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100">
                                            <Paperclip className="w-3 h-3" /> Document {i + 1}
                                        </a>
                                    ))}
                                </div>
                            )}
                            {open.status === 'returned' && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                                    <p className="text-sm font-semibold text-green-800">Return confirmed {fmtDate(open.returned_at)}</p>
                                    {open.return_note && <p className="text-sm text-green-700 mt-1">{open.return_note}</p>}
                                </div>
                            )}
                        </div>

                        <button onClick={() => setOpen(null)}
                            className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default SuspensionNoticeBanner;
