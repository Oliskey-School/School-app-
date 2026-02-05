import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentsIcon, ChevronRightIcon, gradeColors, getFormattedClassName, BookOpenIcon } from '../../constants';

interface ClassListScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId?: string;
}

interface ClassInfo {
    id: number;
    grade: number;
    section: string;
    student_count: number;
    curriculum_id?: string;
    curricula?: {
        name: string;
        code: string;
    };
    academic_level?: string; // e.g., 'JSS1'
}

const ClassListScreen: React.FC<ClassListScreenProps> = ({ navigateTo, schoolId }) => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClasses = async () => {
            if (!schoolId) {
                setLoading(false);
                return;
            }
            const { data, error } = await supabase
                .from('classes')
                .select('*, curricula(name, code)')
                .eq('school_id', schoolId)
                .order('grade')
                .order('section');

            if (data) setClasses(data);
            setLoading(false);
        };
        fetchClasses();

        const channel = supabase.channel('classes_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
                fetchClasses();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Group by Grade
    const groupedClasses = React.useMemo(() => {
        return classes.reduce((acc, cls) => {
            if (!acc[cls.grade]) acc[cls.grade] = [];
            acc[cls.grade].push(cls);
            return acc;
        }, {} as Record<number, ClassInfo[]>);
    }, [classes]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading classes...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto pb-32 lg:pb-4">
                {Object.keys(groupedClasses).sort((a, b) => Number(b) - Number(a)).map(gradeStr => {
                    const grade = Number(gradeStr);
                    const gradeClasses = groupedClasses[grade];
                    const gradeColorClass = gradeColors[grade] || 'bg-gray-200 text-gray-800';
                    const [bgColor, textColor] = gradeColorClass.split(' ');
                    const formattedClassNameWithoutSection = getFormattedClassName(grade, '', false);

                    return (
                        <div key={grade} className={`bg-white rounded-2xl shadow-sm overflow-hidden`}>
                            <div className={`${bgColor} p-4`}>
                                <h3 className={`font-bold text-lg ${textColor}`}>{formattedClassNameWithoutSection}</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {gradeClasses.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => navigateTo('studentList', `Class ${cls.grade}${cls.section}`, { filter: { grade: cls.grade, section: cls.section } })}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                <StudentsIcon className={`h-5 w-5 ${textColor}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center space-x-2">
                                                    <p className="font-semibold text-gray-800">Class {cls.section}</p>
                                                    {cls.curricula ? (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${cls.curricula.code === 'NIGERIAN' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}>
                                                            {cls.curricula.code.substring(0, 3)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-50 text-gray-500 border-gray-200">
                                                            STD
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {cls.student_count || 0} Students
                                                    {cls.academic_level && <span className="text-xs text-gray-400"> • {cls.academic_level}</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-gray-400">
                                            <ChevronRightIcon />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {classes.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        <BookOpenIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No classes found. Use the curriculum settings to generate classes.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ClassListScreen;