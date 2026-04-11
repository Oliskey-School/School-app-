import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { fetchClasses, fetchStudentsByClassId } from '../../lib/database';

import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { StudentsIcon, ChevronRightIcon, gradeColors, getFormattedClassName, BookOpenIcon, PlusIcon, EditIcon, TrashIcon, XIcon } from '../../constants';
import { DEFAULT_STANDARD_CLASSES } from '../../constants';
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
        queryFn: () => api.getClasses(schoolId, currentBranchId || undefined),
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

    const initializeMutation = useOptimisticMutation({
        queryKey,
        mutationFn: async () => {
            if (!schoolId) throw new Error("School ID is required");
            await api.initializeStandardClasses(schoolId, DEFAULT_STANDARD_CLASSES, currentBranchId);
            return true;
        },
        updateFn: (old) => old, // Will be invalidated anyway
        onSuccessMessage: 'Standard classes initialized!',
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
                const students = await api.getStudents(schoolId || '', currentBranchId || undefined, { classId });
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
        const groups: Record<number, { grade: number; name: string; student_count: number; sections: any[] }> = {};

        // 1. Pre-populate with all standard grades to ensure they show up even if empty
        DEFAULT_STANDARD_CLASSES.forEach(std => {
            if (!groups[std.grade]) {
                groups[std.grade] = {
                    grade: std.grade,
                    name: getFormattedClassName(std.grade, '', true),
                    student_count: 0,
                    sections: []
                };
            }
        });

        // 2. Add actual classes from database
        classes.forEach(cls => {
            const gradeNum = Number(cls.grade);
            // In case there's an custom grade not in our standard list
            if (!groups[gradeNum]) {
                groups[gradeNum] = {
                    grade: gradeNum,
                    name: getFormattedClassName(gradeNum, '', true),
                    student_count: 0,
                    sections: []
                };
            }
            groups[gradeNum].student_count += (cls.studentCount || 0);
            groups[gradeNum].sections.push(cls);
        });

        return groups;
    }, [classes]);


    if (isLoading && classes.length === 0) return <CenteredLoader fullScreen={false} message="Loading classes..." className="h-screen" />;

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-32 lg:pb-4">
                <div className="flex justify-between items-center px-2">
                    <div className="flex flex-col">
                        <p className="text-sm font-bold text-gray-800">{Object.keys(groupedClasses).length} Academic Levels</p>
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{classes.length} Total Sections Created</p>
                    </div>
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
                    const gradeData = groupedClasses[grade];
                    const gradeColorClass = gradeColors[grade] || 'bg-gray-200 text-gray-800';
                    const [bgColor, textColor] = gradeColorClass.split(' ');
                    const formattedClassName = gradeData.name;

                    return (
                        <div key={grade} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                            <div className={`${bgColor} p-4`}>
                                <h3 className={`font-bold text-lg ${textColor}`}>{formattedClassName}</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {gradeData.sections.length > 0 ? (
                                    gradeData.sections.map(cls => (
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
                                                            <p className="font-bold text-gray-700 leading-tight">Section {cls.section || 'A'}</p>
                                                            {cls.department && (
                                                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-bold uppercase">{cls.department}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 font-medium">{cls.studentCount || 0} Students enrolled</p>
                                                    </div>
                                                </button>
                                                <div className="flex items-center space-x-1">
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
                                                <div className="border-t border-gray-100 p-3 bg-gray-50/30">
                                                    {loadingStudents[cls.id] ? (
                                                        <div className="py-4">
                                                            <CenteredLoader size="sm" className="min-h-[50px]" />
                                                        </div>
                                                    ) : (classStudents[cls.id]?.length || 0) > 0 ? (
                                                        <div className="space-y-4">
                                                            {classStudents[cls.id].map(student => (
                                                                <div
                                                                    key={student.id}
                                                                    className="w-full bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:border-indigo-200 transition-all group"
                                                                >
                                                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                                        <div className="flex items-center flex-1 min-w-[200px]">
                                                                            <img src={student.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.name)} alt={student.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-50 mr-3" />
                                                                            <div>
                                                                                <p className="text-sm font-bold text-gray-800">{student.name}</p>
                                                                                <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">{student.schoolGeneratedId}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex flex-col gap-1 flex-1">
                                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                                <span className="w-4 h-4 flex items-center justify-center bg-gray-100 rounded text-gray-400 font-bold text-[8px]">@</span>
                                                                                <span className="truncate">{student.email || 'No Email'}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                                <span className="w-4 h-4 flex items-center justify-center bg-gray-100 rounded text-gray-400 font-bold text-[8px]">📱</span>
                                                                                <span>{student.phone || 'No Phone'}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex flex-col gap-1 flex-1">
                                                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase">{student.gender || 'N/A'}</span>
                                                                                <span className="text-[10px] text-gray-400">DOB: {student.birthday ? new Date(student.birthday).toLocaleDateString() : 'N/A'}</span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${student.attendanceStatus === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                                {student.attendanceStatus || 'Absent'}
                                                                            </span>
                                                                            {student.status && (
                                                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${student.status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                                    {student.status}
                                                                                </span>
                                                                            )}
                                                                            <button
                                                                                onClick={() => navigateTo('studentProfileAdminView', student.name, { student })}
                                                                                className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-2"
                                                                                title="View Full Profile"
                                                                            >
                                                                                <ChevronRightIcon className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-6 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                                                            <p className="text-sm text-gray-400 italic font-medium">No students enrolled in this section yet</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 opacity-60">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 rounded-lg bg-white border border-gray-100">
                                                <StudentsIcon className="h-5 w-5 text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-400 italic">No sections created for this class yet</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigateTo('classForm', 'Add New Class', { initialGrade: grade, initialLevel: (DEFAULT_STANDARD_CLASSES.find(s => s.grade === grade) as any)?.level || 'Other' })}
                                            className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
                                        >
                                            + Add Section
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {classes.length === 0 && !isLoading && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <BookOpenIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-bold text-gray-800">No Classes Found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">Start by adding your first class or initialize the standard set for your school.</p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                            <button
                                onClick={() => navigateTo('classForm', 'Add New Class')}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all w-full sm:w-auto"
                            >
                                <PlusIcon className="w-4 h-4 inline mr-2" />
                                Create Class Now
                            </button>

                            <button
                                onClick={() => initializeMutation.mutate(undefined)}
                                disabled={initializeMutation.isPending}
                                className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all w-full sm:w-auto disabled:opacity-50"
                            >
                                {initializeMutation.isPending ? 'Initializing...' : 'Use Standard Classes'}
                            </button>
                        </div>
                    </div>
                )}
            </main>

        </div>
    );
};

export default ClassListScreen;
