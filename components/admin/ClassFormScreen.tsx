
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { XIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { ClassInfo } from '../../types';

interface ClassFormScreenProps {
    classToEdit?: ClassInfo;
    schoolId: string;
    currentBranchId?: string | null;
    handleBack: () => void;
    forceUpdate: () => void;
}

const ClassFormScreen: React.FC<ClassFormScreenProps> = ({ classToEdit, schoolId, currentBranchId, handleBack, forceUpdate }) => {
    const [name, setName] = useState(classToEdit?.name || '');
    const [level, setLevel] = useState(classToEdit?.level || 'Primary');
    const [grade, setGrade] = useState(classToEdit?.grade.toString() || '');
    const [section, setSection] = useState(classToEdit?.section || '');
    const [department, setDepartment] = useState(classToEdit?.department || '');
    const [isLoading, setIsLoading] = useState(false);

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
                level,
                grade: parseInt(grade),
                section,
                department: department || null,
                school_id: schoolId,
                branch_id: currentBranchId
            };

            if (classToEdit) {
                const { error } = await supabase
                    .from('classes')
                    .update(classData)
                    .eq('id', classToEdit.id);
                if (error) throw error;
                toast.success('Class updated successfully');
            } else {
                const { error } = await supabase
                    .from('classes')
                    .insert([classData]);
                if (error) throw error;
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
