
import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { XIcon, SUBJECTS_LIST } from '../../constants';
import { toast } from 'react-hot-toast';
import { ClassInfo } from '../../types';
import MultiSelect from '../ui/MultiSelect';

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
    const [isLoading, setIsLoading] = useState(false);

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
                subjects,
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
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
                                setSelected={setSubjects}
                                placeholder="Select the subjects this class takes..."
                                options={subjectOptions}
                            />
                            <p className="mt-1 text-xs text-gray-400 italic">These drive the class gradebook and what each enrolled student sees, unless a student has their own subject selection.</p>
                        </div>
                    </div>
                </main>

                <div className="p-4 bg-white border-t border-gray-100 flex gap-3 pb-32 lg:pb-4">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : (classToEdit ? 'Update' : 'Create')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ClassFormScreen;
