import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    loadSchedule, saveSchedule, loadDaySchedule, saveDaySchedule,
    clearDayOverride, hasDayOverride, DAY_NAMES, PeriodDef,
} from '../../lib/timetableSchedule';

/**
 * Shared "Edit Period & Break Times" modal.
 *  - Edit the default times for all weekdays, OR custom times for a specific day
 *    (e.g. a half-day Wednesday/Friday).
 *  - Persists to the shared schedule used by both the Timetable Builder and Editor.
 */
interface Props {
    schoolId?: string;
    open: boolean;
    onClose: () => void;
    onSaved?: () => void; // called after a successful save (to refresh the caller)
}

const EditTimesModal: React.FC<Props> = ({ schoolId, open, onClose, onSaved }) => {
    const [editDay, setEditDay] = useState<string>('All');
    const [draft, setDraft] = useState<PeriodDef[]>([]);

    useEffect(() => {
        if (open) { setEditDay('All'); setDraft(loadSchedule(schoolId)); }
    }, [open, schoolId]);

    const selectDay = (d: string) => {
        setEditDay(d);
        setDraft(d === 'All' ? loadSchedule(schoolId) : loadDaySchedule(schoolId, d));
    };
    const update = (i: number, field: 'start' | 'end', value: string) =>
        setDraft(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
    const save = () => {
        if (editDay === 'All') saveSchedule(draft, schoolId);
        else saveDaySchedule(draft, schoolId, editDay);
        onSaved?.();
        onClose();
    };
    const resetDay = () => {
        if (editDay !== 'All') clearDayOverride(schoolId, editDay);
        setDraft(loadSchedule(schoolId));
    };

    return (
        <AnimatePresence>
        {open && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Edit Period &amp; Break Times</h3>
                            <p className="text-xs text-gray-500">{editDay === 'All' ? 'Applies to all weekdays (the default).' : `Custom times for ${editDay} only.`}</p>
                        </div>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</motion.button>
                    </div>

                    {/* Day selector: All days (base) or a specific day */}
                    <div className="px-5 pt-4 flex flex-wrap gap-2">
                        {['All', ...DAY_NAMES].map(d => (
                            <button key={d} onClick={() => selectDay(d)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${editDay === d ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                                {d === 'All' ? 'All days' : d.slice(0, 3)}
                                {d !== 'All' && hasDayOverride(schoolId, d) && <span className="ml-1 text-amber-500">•</span>}
                            </button>
                        ))}
                    </div>

                    <div className="p-5 space-y-2">
                        {draft.map((p, i) => (
                            <div key={i} className={`flex items-center gap-3 rounded-xl border p-2.5 ${p.isBreak ? 'border-amber-200 bg-amber-50' : 'border-gray-200'}`}>
                                <span className={`flex-1 text-sm font-semibold ${p.isBreak ? 'text-amber-700' : 'text-gray-700'}`}>{p.name}</span>
                                <input type="time" value={p.start} onChange={e => update(i, 'start', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                                <span className="text-gray-400">–</span>
                                <input type="time" value={p.end} onChange={e => update(i, 'end', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                            </div>
                        ))}
                    </div>

                    <div className="p-5 border-t border-gray-100 flex justify-between gap-2">
                        {editDay !== 'All'
                            ? <button onClick={resetDay} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Reset {editDay.slice(0, 3)} to default</button>
                            : <span />}
                        <div className="flex gap-2">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</motion.button>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={save} className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">Save times</motion.button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
    );
};

export default EditTimesModal;
