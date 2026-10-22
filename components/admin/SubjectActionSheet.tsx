import React from 'react';
import { motion } from 'framer-motion';

export type Arm = { id: string; label: string; subjects: { id: string; name: string }[] };
export type SubjectAction = {
    mode: 'add' | 'remove';
    name: string;
    subjectId?: string;
    step: 'arms' | 'custom' | 'confirm';
    arms: Arm[];          // arms of this level the admin may pick from
    armIds: string[];     // arms picked
    customCount: number;  // students with a custom subject list (add only)
    departments?: string[];      // departments in use at this level; empty = hide the picker
    department?: string | null;  // null = all departments
};

/**
 * Asks how a subject change on an existing class should apply: which arms of
 * this level, and (when adding) whether students with their own subject list
 * get it too. Removal always states that past results are kept.
 */
const SubjectActionSheet: React.FC<{
    action: SubjectAction;
    busy: boolean;
    onArms: (ids: string[]) => void;
    onDepartment?: (department: string | null) => void;
    onNext: () => void;
    onCustom: (addToCustom: boolean) => void;
    onConfirmRemove: () => void;
    onCancel: () => void;
}> = ({ action, busy, onArms, onDepartment, onNext, onCustom, onConfirmRemove, onCancel }) => {
    const allIds = action.arms.map(a => a.id);
    const allPicked = allIds.length > 0 && allIds.every(id => action.armIds.includes(id));
    const toggle = (id: string) => onArms(action.armIds.includes(id) ? action.armIds.filter(x => x !== id) : [...action.armIds, id]);
    const picked = action.arms.find(a => a.id === action.armIds[0])?.label || 'this class';

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={busy ? undefined : onCancel}>
            <motion.div
                role="dialog" aria-modal="true" aria-labelledby="subject-action-title"
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                {action.step === 'arms' && (
                    <>
                        <div>
                            <h2 id="subject-action-title" className="text-xl font-bold text-gray-900">{action.mode === 'add' ? `Add ${action.name}` : `Remove ${action.name}`}</h2>
                            <p className="text-sm text-gray-500">{action.mode === 'add' ? `Which classes at this level should take ${action.name}?` : `Remove ${action.name} from which classes at this level?`}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl bg-gray-50 font-bold text-sm text-gray-800 cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={allPicked} onChange={() => onArms(allPicked ? [] : allIds)} />
                                Select all
                            </label>
                            {action.arms.map(a => (
                                <label key={a.id} className="flex items-center gap-3 min-h-[44px] px-3 rounded-xl text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                                    <input type="checkbox" className="w-5 h-5 accent-indigo-600" checked={action.armIds.includes(a.id)} onChange={() => toggle(a.id)} />
                                    {a.label}
                                </label>
                            ))}
                        </div>
                        {action.mode === 'add' && (action.departments || []).length > 0 && (
                            <div>
                                <label htmlFor="subject-department" className="block text-sm font-medium text-gray-700 mb-1">Which department?</label>
                                <select
                                    id="subject-department"
                                    value={action.department || ''}
                                    onChange={e => onDepartment?.(e.target.value || null)}
                                    className="w-full min-h-[44px] p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">All departments</option>
                                    {(action.departments || []).map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                {action.department && <p className="mt-1 text-xs text-gray-500">Only {action.department} students in these classes will take {action.name}.</p>}
                            </div>
                        )}
                        {action.mode === 'remove' && <p className="text-xs text-gray-500">Past results, grades and scores for {action.name} are kept.</p>}
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={onCancel} disabled={busy} className="py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">Cancel</button>
                            <button type="button" onClick={onNext} disabled={busy || action.armIds.length === 0} className={`py-3 rounded-2xl font-bold text-white transition-colors disabled:opacity-50 ${action.mode === 'remove' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                                {busy ? 'Saving...' : action.mode === 'remove' ? 'Remove' : 'Continue'}
                            </button>
                        </div>
                    </>
                )}

                {action.step === 'custom' && (
                    <>
                        <div>
                            <h2 id="subject-action-title" className="text-xl font-bold text-gray-900">Students with their own subjects</h2>
                            <p className="text-sm text-gray-500">
                                {action.customCount} {action.department ? `${action.department} ` : ''}{action.customCount === 1 ? 'student has' : 'students have'} a custom subject list. Also add {action.name} to {action.customCount === 1 ? 'that student' : `those ${action.customCount} students`}? Their other subjects stay as they are.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => onCustom(false)} disabled={busy} className="py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">No</button>
                            <button type="button" onClick={() => onCustom(true)} disabled={busy} className="py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">{busy ? 'Saving...' : 'Yes, add it'}</button>
                        </div>
                        <button type="button" onClick={onCancel} disabled={busy} className="w-full min-h-[44px] text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
                    </>
                )}

                {action.step === 'confirm' && (
                    <>
                        <div>
                            <h2 id="subject-action-title" className="text-xl font-bold text-gray-900">Remove {action.name}?</h2>
                            <p className="text-sm text-gray-500">{action.name} will be taken off {picked} and off its students' subject lists. Past results, grades and scores for {action.name} are kept.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={onCancel} disabled={busy} className="py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50">Cancel</button>
                            <button type="button" onClick={onConfirmRemove} disabled={busy} className="py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50">{busy ? 'Saving...' : 'Remove'}</button>
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
};

export default SubjectActionSheet;
