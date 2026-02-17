
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { fetchClasses } from '../../lib/database';
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { StudentsIcon, ChevronRightIcon, gradeColors, getFormattedClassName, BookOpenIcon, PlusIcon, EditIcon, TrashIcon, XIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { ClassInfo } from '../../types';

interface ClassListScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId?: string;
}

const ClassModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: any;
    title: string;
}> = ({ isOpen, onClose, onSubmit, initialData, title }) => {
    const [grade, setGrade] = useState(initialData?.grade || '');
    const [section, setSection] = useState(initialData?.section || '');
    const [subject, setSubject] = useState(initialData?.subject || 'General');
    const [department, setDepartment] = useState(initialData?.department || '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Grade / Level (Number)</label>
                        <input 
                            type="number" 
                            value={grade} 
                            onChange={e => setGrade(e.target.value)}
                            placeholder="e.g., 10"
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department (Optional)</label>
                        <input 
                            type="text" 
                            value={department} 
                            onChange={e => setDepartment(e.target.value)}
                            placeholder="e.g., Science"
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input 
                            type="text" 
                            value={subject} 
                            onChange={e => setSubject(e.target.value)}
                            placeholder="e.g., Mathematics"
                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
                <div className="p-6 bg-gray-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={() => onSubmit({ grade: parseInt(grade), section, subject, department })} 
                        className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        {initialData ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ClassListScreen: React.FC<ClassListScreenProps> = ({ navigateTo, schoolId }) => {
    const queryKey = ['classes', schoolId];
    
    const { data: classes = [], isLoading } = useQuery({
        queryKey,
        queryFn: () => fetchClasses(schoolId),
        enabled: !!schoolId,
    });

    const createMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (newClass: Partial<ClassInfo>) => {
            const { data, error } = await supabase.from('classes').insert([{ ...newClass, school_id: schoolId }]).select().single();
            if (error) throw error;
            return data;
        },
        updateFn: (old, newClass) => [...old, { ...newClass, id: 'temp-' + Date.now(), studentCount: 0 }],
        onSuccessMessage: 'Class created successfully',
    });

    const updateMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (updates: any) => {
            const { data, error } = await supabase.from('classes').update(updates).eq('id', updates.id).select().single();
            if (error) throw error;
            return data;
        },
        updateFn: (old, updates) => old.map((c: any) => c.id === updates.id ? { ...c, ...updates } : c),
        onSuccessMessage: 'Class updated successfully',
    });

    const deleteMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('classes').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        updateFn: (old, id) => old.filter((c: any) => c.id !== id),
        onSuccessMessage: 'Class deleted',
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<any>(null);

    const handleAddClass = (data: any) => {
        createMutation.mutate(data);
        setIsModalOpen(false);
    };

    const handleUpdateClass = (data: any) => {
        updateMutation.mutate({ ...data, id: editingClass.id });
        setIsModalOpen(false);
        setEditingClass(null);
    };

    const handleDeleteClass = (id: string) => {
        if (window.confirm('Are you sure you want to delete this class?')) {
            deleteMutation.mutate(id);
        }
    };

    const groupedClasses = useMemo(() => {
        const groups: Record<string, { grade: number; name: string; student_count: number; sections: any[] }> = {};
        
        classes.forEach(cls => {
            const formattedName = getFormattedClassName(cls.grade, cls.section);
            if (!groups[formattedName]) {
                groups[formattedName] = {
                    grade: cls.grade,
                    name: formattedName,
                    student_count: 0,
                    sections: []
                };
            }
            groups[formattedName].student_count += (cls.studentCount || 0);
            groups[formattedName].sections.push(cls);
        });

        const finalGroups: Record<number, any[]> = {};
        Object.values(groups).forEach(g => {
            if (!finalGroups[g.grade]) finalGroups[g.grade] = [];
            finalGroups[g.grade].push(g);
        });
        return finalGroups;
    }, [classes]);

    if (isLoading && classes.length === 0) return <div className="p-8 text-center text-gray-500">Loading classes...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-32 lg:pb-4">
                <div className="flex justify-between items-center px-2">
                    <p className="text-sm font-medium text-gray-500">{classes.length} Total Classes</p>
                    <button 
                        onClick={() => { setEditingClass(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Add Class
                    </button>
                </div>

                {Object.keys(groupedClasses).sort((a, b) => Number(b) - Number(a)).map(gradeStr => {
                    const grade = Number(gradeStr);
                    const gradeClasses = groupedClasses[grade];
                    const gradeColorClass = gradeColors[grade] || 'bg-gray-200 text-gray-800';
                    const [bgColor, textColor] = gradeColorClass.split(' ');
                    const formattedClassNameWithoutSection = getFormattedClassName(grade, '', false);

                    return (
                        <div key={grade} className={`bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100`}>
                            <div className={`${bgColor} p-4`}>
                                <h3 className={`font-bold text-lg ${textColor}`}>{formattedClassNameWithoutSection}</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {gradeClasses.map(group => (
                                    <div key={group.name} className="space-y-2">
                                        {group.sections.map(cls => (
                                            <div
                                                key={cls.id}
                                                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/50 hover:bg-gray-100 transition-colors group"
                                            >
                                                <button
                                                    onClick={() => navigateTo('studentList', group.name, { filter: { grade: cls.grade } })}
                                                    className="flex items-center space-x-3 flex-grow text-left"
                                                >
                                                    <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                        <StudentsIcon className={`h-5 w-5 ${textColor}`} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <p className="font-semibold text-gray-800">{getFormattedClassName(cls.grade, cls.section)}</p>
                                                            {cls.department && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 uppercase font-bold">
                                                                    {cls.department}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {cls.subject} • {cls.studentCount || 0} Students
                                                        </p>
                                                    </div>
                                                </button>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => { setEditingClass(cls); setIsModalOpen(true); }}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        <EditIcon className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteClass(cls.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                    <div className="text-gray-300 ml-1">
                                                        <ChevronRightIcon />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                
                {classes.length === 0 && !isLoading && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-bold text-gray-800">No Classes Found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">Start by adding your first class or use curriculum settings to auto-generate them.</p>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                        >
                            Create Class Now
                        </button>
                    </div>
                )}
            </main>

            <ClassModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingClass(null); }}
                onSubmit={editingClass ? handleUpdateClass : handleAddClass}
                initialData={editingClass}
                title={editingClass ? 'Edit Class' : 'Add New Class'}
            />
        </div>
    );
};

export default ClassListScreen;
