
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { XIcon, SUBJECTS_LIST, getFormattedClassName } from '../../constants';
import { toast } from 'react-hot-toast';
import { ClassInfo } from '../../types';
import MultiSelect from '../ui/MultiSelect';
import SubjectActionSheet, { Arm, SubjectAction } from './SubjectActionSheet';

interface ClassFormScreenProps {
    classToEdit?: ClassInfo;
    schoolId: string;
    currentBranchId?: string | null;
    handleBack: () => void;
    forceUpdate: () => void;
}

const ClassFormScreen: React.FC<ClassFormScreenProps> = ({ classToEdit, schoolId, currentBranchId, handleBack, forceUpdate }) => {
    const [name, setName] = useState(classToEdit?.name || '');
    // The class is saved with `level_category` (the canonical column); `level` is the
    // deprecated alias. Read level_category first so the saved Level shows on re-open
    // instead of always defaulting back to "Primary".
    const [level, setLevel] = useState(classToEdit?.level_category || classToEdit?.level || 'Primary');
    const [grade, setGrade] = useState(classToEdit?.grade.toString() || '');
    const [section, setSection] = useState(classToEdit?.section || '');
    const [department, setDepartment] = useState(classToEdit?.department || '');
    // The class's assigned subjects — what the gradebook offers for this class
    // and what enrolled students inherit unless the admin picked per-student ones.
    const [subjects, setSubjects] = useState<string[]>(
        Array.isArray((classToEdit as any)?.subjects)
            ? (classToEdit as any).subjects.map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
            : []
    );
    const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
    const queryClient = useQueryClient();
    const [subjectRows, setSubjectRows] = useState<{ id: string; name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    // Editing an existing class: each subject add/remove is applied straight
    // away, to the arms the admin picks, instead of on Update.
    const [arms, setArms] = useState<Arm[]>([]);
    const [action, setAction] = useState<SubjectAction | null>(null);
    const [actionBusy, setActionBusy] = useState(false);
    // Departments in use at this level (e.g. Science / Arts); empty = not used.
    const [departments, setDepartments] = useState<string[]>([]);
    // True once BOTH the level's arms and departments have settled. Until then a
    // subject pick would skip the arm/department questions and silently apply to
    // this arm for every department (seen on slow connections).
    const [levelLoaded, setLevelLoaded] = useState(false);

    const selfArm = (): Arm | null => classToEdit ? {
        id: classToEdit.id,
        label: getFormattedClassName(Number(classToEdit.grade), classToEdit.section || ''),
        subjects: ((classToEdit as any).subjects || []).filter((s: any) => s?.id).map((s: any) => ({ id: s.id, name: s.name })),
    } : null;

    // The other arms of this level (same grade) the admin can apply a change to.
    useEffect(() => {
        if (!classToEdit) return;
        let alive = true;
        setLevelLoaded(false);
        const armsReq = api.getClasses(schoolId, currentBranchId || undefined).then((all: any[]) => {
            if (!alive) return;
            const same: Arm[] = (Array.isArray(all) ? all : [])
                .filter(c => Number(c.grade) === Number(classToEdit.grade) && c.id && !String(c.id).startsWith('std-'))
                .map(c => ({
                    id: c.id,
                    label: getFormattedClassName(Number(c.grade), c.section || ''),
                    subjects: (Array.isArray(c.subjects) ? c.subjects : []).filter((s: any) => s?.id).map((s: any) => ({ id: s.id, name: s.name })),
                }));
            if (!same.some(a => a.id === classToEdit.id)) same.unshift(selfArm()!);
            setArms(same);
        }).catch(() => { /* falls back to this class only */ });
        const deptReq = api.getClassLevelDepartments(classToEdit.id)
            .then(list => { if (alive) setDepartments(Array.isArray(list) ? list : []); })
            .catch(() => { /* no department picker */ });
        Promise.allSettled([armsReq, deptReq]).then(() => { if (alive) setLevelLoaded(true); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classToEdit?.id, schoolId, currentBranchId]);

    // Options = the school's OWN subject rows (the backend seeds the standard
    // list for brand-new schools). Admin-added subjects appear immediately;
    // deleted ones vanish. Falls back to the catalog only if the fetch fails.
    useEffect(() => {
        const loadOptions = async () => {
            try {
                const subs = await api.getSubjects(schoolId, currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined);
                const schoolSubjects = (Array.isArray(subs) ? subs : [])
                    .map((s: any) => (typeof s === 'string' ? s : s?.name))
                    .filter(Boolean);
                setSubjectRows((Array.isArray(subs) ? subs : []).filter((s: any) => s?.id && s?.name).map((s: any) => ({ id: s.id, name: s.name })));
                if (schoolSubjects.length > 0) {
                    setSubjectOptions(Array.from(new Set(schoolSubjects)));
                    return;
                }
            } catch { /* catalog below still provides options */ }
            setSubjectOptions((SUBJECTS_LIST || []).map((s: any) => s?.name).filter(Boolean));
        };
        loadOptions();
        const onUpdate = (e: any) => { if (e?.detail?.table === 'subjects') loadOptions(); };
        window.addEventListener('realtime-update', onUpdate);
        return () => window.removeEventListener('realtime-update', onUpdate);
    }, [schoolId, currentBranchId]);

    const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const allArms = (): Arm[] => (arms.length ? arms : (classToEdit ? [selfArm()!] : []));

    const applyAdd = async (a: SubjectAction, addToCustom: boolean) => {
        setActionBusy(true);
        try {
            const res = await api.addClassSubject(classToEdit!.id, {
                ...(a.subjectId ? { subject_id: a.subjectId } : { name: a.name }),
                class_ids: a.armIds, add_to_custom: addToCustom, department: a.department || null,
            });
            const saved = res?.subject?.id ? { id: res.subject.id, name: res.subject.name } : { id: a.subjectId || '', name: a.name };
            if (saved.id && !subjectRows.some(r => r.id === saved.id)) setSubjectRows(prev => [...prev, saved]);
            setSubjectOptions(prev => (prev.includes(saved.name) ? prev : [...prev, saved.name]));
            if (a.armIds.includes(classToEdit!.id)) setSubjects(prev => (prev.includes(saved.name) ? prev : [...prev, saved.name]));
            setArms(prev => prev.map(x => (!a.armIds.includes(x.id) || x.subjects.some(s => sameName(s.name, saved.name))) ? x : { ...x, subjects: [...x.subjects, saved] }));
            // Refresh the class list without remounting this form (forceUpdate would).
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            toast.success(`${saved.name} added to ${a.armIds.length === 1 ? (a.arms.find(x => x.id === a.armIds[0])?.label || 'the class') : `${a.armIds.length} classes`}`);
            setAction(null);
        } catch (err: any) {
            toast.error(`Could not add ${a.name}: ${err?.message || 'try again'}`);
        } finally { setActionBusy(false); }
    };

    // After the arms are picked: ask about custom-list students only if there are any.
    const checkCustom = async (a: SubjectAction) => {
        setActionBusy(true);
        let customCount = 0;
        try {
            const impact = await api.getClassSubjectImpact(classToEdit!.id, a.name, a.armIds, a.department || null);
            customCount = impact?.customCount || 0;
        } catch (err: any) {
            setActionBusy(false);
            toast.error(`Could not add ${a.name}: ${err?.message || 'try again'}`);
            setAction(null);
            return;
        }
        setActionBusy(false);
        if (customCount > 0) setAction({ ...a, step: 'custom', customCount });
        else await applyAdd(a, false);
    };

    const applyRemove = async (a: SubjectAction) => {
        if (!a.subjectId) { toast.error(`Could not find ${a.name} on this class`); setAction(null); return; }
        setActionBusy(true);
        try {
            await api.removeClassSubject(classToEdit!.id, a.subjectId, a.armIds);
            if (a.armIds.includes(classToEdit!.id)) setSubjects(prev => prev.filter(n => !sameName(n, a.name)));
            setArms(prev => prev.map(x => !a.armIds.includes(x.id) ? x : { ...x, subjects: x.subjects.filter(s => !sameName(s.name, a.name)) }));
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            toast.success(`${a.name} removed. Past results are kept.`);
            setAction(null);
        } catch (err: any) {
            toast.error(`Could not remove ${a.name}: ${err?.message || 'try again'}`);
        } finally { setActionBusy(false); }
    };

    // The chip picker reports the new list. On an existing class the change
    // becomes an add or remove action instead of a local edit.
    const handleSubjectsChange: React.Dispatch<React.SetStateAction<string[]>> = (next) => {
        const list = typeof next === 'function' ? next(subjects) : next;
        if (!classToEdit) { setSubjects(list); return; }
        if (!levelLoaded) { toast.error("Still loading this level's arms — try again in a moment."); return; }
        const added = list.find(n => !subjects.includes(n));
        const removed = subjects.find(n => !list.includes(n));
        const all = allArms();
        if (added) {
            const subjectId = subjectRows.find(r => sameName(r.name, added))?.id;
            const start: SubjectAction = { mode: 'add', name: added, subjectId, step: 'arms', arms: all, armIds: [classToEdit.id], customCount: 0, departments, department: null };
            // One arm and no departments: nothing to pick, go straight to the custom-list check.
            if (all.length > 1 || departments.length > 0) setAction(start);
            else checkCustom(start);
        } else if (removed) {
            const subjectId = all.flatMap(a => a.subjects).find(s => s.id && sameName(s.name, removed))?.id
                || subjectRows.find(r => sameName(r.name, removed))?.id;
            const having = all.filter(a => a.id === classToEdit.id || a.subjects.some(s => sameName(s.name, removed)));
            setAction({ mode: 'remove', name: removed, subjectId, step: having.length > 1 ? 'arms' : 'confirm', arms: having, armIds: [classToEdit.id], customCount: 0 });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grade) {
            toast.error('Grade is required');
            return;
        }

        setIsLoading(true);
        try {
            const classData = {
                name: name || `Grade ${grade}`,
                level_category: level,
                grade: parseInt(grade),
                section,
                department: department || null,
                // An existing class's subjects are saved per action (above).
                ...(classToEdit ? {} : { subjects }),
                school_id: schoolId,
                branch_id: currentBranchId
            };

            if (classToEdit) {
                await api.updateClass(classToEdit.id, classData);
                toast.success('Class updated successfully');
            } else {
                await api.createClass(classData);
                toast.success('Class created successfully');
            }

            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error saving class:', error);
            toast.error('Failed to save class: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g., SSS 3 or Gold Class"
                                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Grade (Number)</label>
                                <input
                                    type="number"
                                    value={grade}
                                    onChange={e => setGrade(e.target.value)}
                                    placeholder="e.g., 10"
                                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                                <select
                                    value={level}
                                    onChange={e => setLevel(e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="Primary">Primary</option>
                                    <option value="JSS">JSS</option>
                                    <option value="SSS">SSS</option>
                                    <option value="Secondary">Secondary</option>
                                    <option value="Nursery">Nursery</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Section (Optional)</label>
                                <input
                                    type="text"
                                    value={section}
                                    onChange={e => setSection(e.target.value)}
                                    placeholder="e.g., A"
                                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    placeholder="e.g., Science"
                                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div>
                            <MultiSelect
                                label="Subjects (taught in this class)"
                                selected={subjects}
                                setSelected={handleSubjectsChange}
                                allowCreate
                                placeholder="Select the subjects this class takes..."
                                options={subjectOptions}
                            />
                            <p className="mt-1 text-xs text-gray-400 italic">These drive the class gradebook and what each enrolled student sees, unless a student has their own subject selection.</p>
                        </div>
                    </motion.div>
                </main>

                <div className="p-4 bg-white border-t border-gray-100 flex gap-3 pb-32 lg:pb-4">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleBack}
                        className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        whileHover={!isLoading ? { scale: 1.02 } : {}}
                        whileTap={!isLoading ? { scale: 0.98 } : {}}
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : (classToEdit ? 'Update' : 'Create')}
                    </motion.button>
                </div>
            </form>
            {action && (
                <SubjectActionSheet
                    action={action}
                    busy={actionBusy}
                    onArms={ids => setAction({ ...action, armIds: ids })}
                    onDepartment={d => setAction({ ...action, department: d })}
                    onNext={() => (action.mode === 'add' ? checkCustom(action) : applyRemove(action))}
                    onCustom={yes => applyAdd(action, yes)}
                    onConfirmRemove={() => applyRemove(action)}
                    onCancel={() => setAction(null)}
                />
            )}
        </div>
    );
};

export default ClassFormScreen;
