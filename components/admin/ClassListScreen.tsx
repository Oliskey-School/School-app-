
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { fetchClasses, fetchStudentsByClassId } from '../../lib/database';
import { api } from '../../lib/api';
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { StudentsIcon, ChevronRightIcon, gradeColors, getFormattedClassName, BookOpenIcon, PlusIcon, EditIcon, TrashIcon, XIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { ClassInfo, Student } from '../../types';
import CenteredLoader from '../ui/CenteredLoader';
import { useAutoSync } from '../../hooks/useAutoSync';

interface ClassListScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId?: string;
    currentBranchId?: string | null;
}


const ClassListScreen: React.FC<ClassListScreenProps> = ({ navigateTo, schoolId, currentBranchId }) => {
    const queryKey = ['classes', schoolId, currentBranchId];

    const { data: classes = [], isLoading } = useQuery({
        queryKey,
        queryFn: () => fetchClasses(schoolId, currentBranchId || undefined),
        enabled: !!schoolId,
    });

    const queryClient = useQueryClient();
    useAutoSync(['classes'], () => {
        console.log('🔄 [ClassList] Auto-sync triggered');
        queryClient.invalidateQueries({ queryKey });
    });

    const createMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (newClass: Partial<ClassInfo>) => {
            return api.createClass({ ...newClass, school_id: schoolId, branch_id: currentBranchId });
        },
        updateFn: (old, newClass) => [...old, { ...newClass, id: 'temp-' + Date.now(), studentCount: 0 }],
        onSuccessMessage: 'Class created successfully',
    });

    const updateMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (updates: any) => {
            return api.updateClass(updates.id, updates);
        },
        updateFn: (old, updates) => old.map((c: any) => c.id === updates.id ? { ...c, ...updates } : c),
        onSuccessMessage: 'Class updated successfully',
    });

    const deleteMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async (id: string) => {
            await api.deleteClass(id);
            return id;
        },
        updateFn: (old, id) => old.filter((c: any) => c.id !== id),
        onSuccessMessage: 'Class deleted',
    });


    const handleDeleteClass = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this class? This may fail if there are enrolled students.')) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (err) {
                toast.error('Could not delete class. Please ensure it is empty first.');
            }
        }
    };

    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
    const [classStudents, setClassStudents] = useState<Record<string, Student[]>>({});
    const [loadingStudents, setLoadingStudents] = useState<Record<string, boolean>>({});

    const toggleExpandClass = async (classId: string) => {
        if (expandedClassId === classId) {
            setExpandedClassId(null);
            return;
        }

        setExpandedClassId(classId);

        if (!classStudents[classId] && !loadingStudents[classId]) {
            setLoadingStudents(prev => ({ ...prev, [classId]: true }));
            try {
                const students = await fetchStudentsByClassId(classId);
                setClassStudents(prev => ({ ...prev, [classId]: students }));
            } catch (error) {
                console.error("Failed to load students for class", classId);
                toast.error("Failed to load students");
            } finally {
                setLoadingStudents(prev => ({ ...prev, [classId]: false }));
            }
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


    if (isLoading && classes.length === 0) return <CenteredLoader fullScreen={false} message="Loading classes..." className="h-screen" />;

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-32 lg:pb-4">
                <div className="flex justify-between items-center px-2">
                    <p className="text-sm font-medium text-gray-500">{classes.length} Total Classes</p>
                    <button
                        onClick={() => navigateTo('classForm', 'Add New Class')}
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
                    // Use true for includeGradeWord to distinguish SSS 3 from Primary 3 etc.
                    const formattedClassNameWithoutSection = getFormattedClassName(grade, '', true);

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
                                                className={`w-full bg-gray-50 rounded-xl border transition-colors group ${expandedClassId === cls.id ? 'border-indigo-200 ring-2 ring-indigo-100 bg-white' : 'border-gray-200/50 hover:bg-gray-100'}`}
                                            >
                                                <div className="flex items-center justify-between p-3">
                                                    <button
                                                        onClick={() => toggleExpandClass(cls.id)}
                                                        className="flex items-center space-x-3 flex-grow text-left"
                                                    >
                                                        <div className={`p-2 rounded-lg border border-gray-200 transition-colors ${expandedClassId === cls.id ? 'bg-indigo-50 text-indigo-600' : 'bg-white text-gray-500'}`}>
                                                            {expandedClassId === cls.id ? <ChevronRightIcon className="h-5 w-5 rotate-90 transition-transform" /> : <StudentsIcon className={`h-5 w-5 ${textColor}`} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <p className="font-semibold text-gray-800">{cls.name || getFormattedClassName(cls.grade, cls.section)}</p>
                                                                {cls.department && (
                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 uppercase font-bold">
                                                                        {cls.department}
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 uppercase font-bold">
                                                                    {cls.level}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {cls.studentCount || 0} Students
                                                            </p>
                                                        </div>
                                                    </button>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => navigateTo('studentList', group.name, { filter: { grade: cls.grade } })}
                                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="View in Student List"
                                                        >
                                                            <BookOpenIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => navigateTo('classForm', 'Edit Class', { classToEdit: cls })}
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
                                                    </div>
                                                </div>

                                                {expandedClassId === cls.id && (
                                                    <div className="px-4 pb-4 pt-0 animate-fadeIn">
                                                        <div className="h-px w-full bg-gray-100 mb-3"></div>
                                                        {loadingStudents[cls.id] ? (
                                                            <div className="py-4">
                                                                <CenteredLoader size="sm" className="min-h-[50px]" />
                                                            </div>
                                                        ) : (classStudents[cls.id]?.length || 0) > 0 ? (
                                                            <div className="space-y-2">
                                                                {classStudents[cls.id].map(student => (
                                                                    <button
                                                                        key={student.id}
                                                                        onClick={() => navigateTo('studentProfileAdminView', student.name, { student })}
                                                                        className="w-full flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                                                    >
                                                                        <img src={student.avatarUrl} alt={student.name} className="w-8 h-8 rounded-full object-cover mr-3" />
                                                                        <div>
                                                                            <p className="text-sm font-semibold text-gray-700">{student.name}</p>
                                                                            <p className="text-xs text-gray-400">{student.schoolGeneratedId}</p>
                                                                        </div>
                                                                        <div className="ml-auto">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${student.attendanceStatus === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                {student.attendanceStatus}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-center text-sm text-gray-400 py-2">No students enrolled</p>
                                                        )}
                                                    </div>
                                                )}
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
                            onClick={() => navigateTo('classForm', 'Add New Class')}
                            className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                        >
                            Create Class Now
                        </button>
                    </div>
                )}
            </main>

        </div>
    );
};

export default ClassListScreen;
