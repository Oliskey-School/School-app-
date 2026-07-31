import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { ClipboardCheck, History, Star } from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

interface Criterion { key: string; label: string; max_score: number; }
interface Teacher { id: string; full_name: string; }

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const GRADE_STYLES: Record<string, string> = {
    A: 'bg-green-50 text-green-700', B: 'bg-blue-50 text-blue-700', C: 'bg-amber-50 text-amber-700',
    D: 'bg-orange-50 text-orange-700', F: 'bg-red-50 text-red-700',
};

const ClassroomObservationScreen = () => {
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [teacherId, setTeacherId] = useState('');
    const [date, setDate] = useState(todayStr());
    const [scores, setScores] = useState<Record<string, number>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [tab, setTab] = useState<'new' | 'history'>('new');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [tmpl, tchrs] = await Promise.all([api.getObservationTemplate(), api.getTeachers()]);
                setCriteria(tmpl.criteria || []);
                setTeachers(Array.isArray(tchrs) ? tchrs : []);
            } catch (err) {
                console.error('Error loading observation setup:', err);
                toast.error('Failed to load observation form');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const fetchHistory = useCallback(async (tid: string) => {
        if (!tid) { setHistory([]); return; }
        try {
            const result = await api.getObservationsForTeacher(tid);
            setHistory(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error('Error loading observation history:', err);
        }
    }, []);

    useEffect(() => { if (teacherId) fetchHistory(teacherId); }, [teacherId, fetchHistory]);

    const handleSubmit = async () => {
        if (!teacherId) { toast.error('Choose a teacher'); return; }
        if (criteria.some(c => scores[c.key] === undefined)) { toast.error('Score every criterion'); return; }
        setSubmitting(true);
        try {
            await api.createObservation({
                teacher_id: teacherId, date,
                scores: criteria.map(c => ({ criterion_key: c.key, score: scores[c.key], comment: comments[c.key] || undefined })),
                notes: notes.trim() || undefined,
            });
            toast.success('Observation recorded — the teacher has been notified');
            setScores({}); setComments({}); setNotes('');
            fetchHistory(teacherId);
            setTab('history');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save observation');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">Classroom Observation</h1>
                <p className="text-gray-500">Score a teacher's lesson across the five standard criteria.</p>
            </div>

            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1 w-fit">
                <button onClick={() => setTab('new')} className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'new' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {tab === 'new' && <motion.div layoutId="observationTab" className="absolute inset-0 bg-indigo-600 rounded-xl" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className="relative flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4" /> New Observation</span>
                </button>
                <button onClick={() => setTab('history')} className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'history' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {tab === 'history' && <motion.div layoutId="observationTab" className="absolute inset-0 bg-indigo-600 rounded-xl" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                    <span className="relative flex items-center gap-1.5"><History className="w-4 h-4" /> History {history.length > 0 && `(${history.length})`}</span>
                </button>
            </div>

            {loading ? (
                <CenteredLoader className="py-12" />
            ) : (
            <AnimatePresence mode="wait">
            {tab === 'new' ? (
                <motion.div key="new" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                            <option value="">Select a teacher</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                        </select>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>

                    <div className="space-y-4">
                        {criteria.map(c => (
                            <div key={c.key} className="border border-gray-100 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-gray-900 text-sm">{c.label}</p>
                                    <span className="text-xs text-gray-400">/{c.max_score}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    {Array.from({ length: c.max_score }, (_, i) => i + 1).map(n => (
                                        <button key={n} onClick={() => setScores(s => ({ ...s, [c.key]: n }))}>
                                            <Star className={`w-5 h-5 ${(scores[c.key] || 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                                        </button>
                                    ))}
                                    {scores[c.key] !== undefined && <span className="text-xs font-semibold text-gray-500 ml-1">{scores[c.key]}/{c.max_score}</span>}
                                </div>
                                <input value={comments[c.key] || ''} onChange={e => setComments(s => ({ ...s, [c.key]: e.target.value }))}
                                    placeholder="Comment (optional)" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-400" />
                            </div>
                        ))}
                    </div>

                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Overall notes (optional)" rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />

                    <motion.button whileHover={!submitting ? { scale: 1.02 } : {}} whileTap={!submitting ? { scale: 0.98 } : {}} onClick={handleSubmit} disabled={submitting} className="bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60">
                        {submitting ? 'Saving...' : 'Submit Observation'}
                    </motion.button>
                </motion.div>
            ) : (
                <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {!teacherId ? (
                        <p className="p-8 text-center text-gray-400">Select a teacher above to see their observation history.</p>
                    ) : history.length === 0 ? (
                        <p className="p-8 text-center text-gray-400">No observations recorded yet for this teacher.</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {history.map((h: any, i: number) => (
                                <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: Math.min(i, 15) * 0.02 }} className="px-5 py-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">{new Date(h.date).toLocaleDateString()}</p>
                                        {h.notes && <p className="text-xs text-gray-500">{h.notes}</p>}
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${GRADE_STYLES[h.overall_grade] || 'bg-gray-100 text-gray-600'}`}>
                                        {h.overall_score}% ({h.overall_grade})
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
            )}
        </div>
    );
};

export default ClassroomObservationScreen;
