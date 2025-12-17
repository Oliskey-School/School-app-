import React, { useState, useEffect } from 'react';
import { ChevronRightIcon, LockIcon } from '../../constants';
import { getFormattedClassName } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';

interface ClassData {
    id: string; // e.g. '10A'
    grade: number;
    section: string;
    subject: string;
    department?: string;
}

interface TeacherSelectClassForAttendanceProps {
    navigateTo: (view: string, title: string, props: any) => void;
}

const TeacherSelectClassForAttendance: React.FC<TeacherSelectClassForAttendanceProps> = ({ navigateTo }) => {
    const { profile } = useProfile();
    const [allClasses, setAllClasses] = useState<ClassData[]>([]);
    const [allowedClassIds, setAllowedClassIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch all classes for the directory
                const { data: classesData, error: classesError } = await supabase
                    .from('classes')
                    .select('*')
                    .order('grade', { ascending: true })
                    .order('section', { ascending: true });

                if (classesError) throw classesError;
                setAllClasses(classesData || []);

                // 2. Fetch classes assigned to this teacher
                // We need to find the teacher record associated with the current user
                if (profile.email) {
                    const { data: teacherData, error: teacherError } = await supabase
                        .from('teachers')
                        .select('id')
                        .eq('email', profile.email)
                        .single();

                    if (teacherData && !teacherError) {
                        const { data: assignments, error: assignmentError } = await supabase
                            .from('teacher_classes')
                            .select('class_name')
                            .eq('teacher_id', teacherData.id);

                        if (!assignmentError && assignments) {
                            setAllowedClassIds(assignments.map(a => a.class_name));
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching class data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile.email]);

    const handleSelectClass = (classInfo: ClassData) => {
        // DEMO MODE: Allow picking any class
        // if (!allowedClassIds.includes(classInfo.id)) return;

        const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);
        navigateTo('markAttendance', `Attendance: ${formattedClassName}`, { classInfo });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading class directory...</div>;
    }

    return (
        <div className="p-4 bg-gray-100 h-full">
            <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200 mb-6">
                <h3 className="font-bold text-lg text-purple-800">Class Attendance Directory</h3>
                <p className="text-sm text-purple-700">Select any class to manage attendance (Demo Mode Enabled).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allClasses.map(classInfo => {
                    const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);
                    // DEMO MODE: All classes unlocked for demonstration purposes
                    // const isAllowed = allowedClassIds.includes(classInfo.id);
                    const isAllowed = true;

                    return (
                        <button
                            key={classInfo.id}
                            onClick={() => handleSelectClass(classInfo)}
                            disabled={!isAllowed}
                            className={`
                                relative w-full rounded-xl shadow-sm p-4 flex items-center justify-between text-left transition-all
                                ${isAllowed
                                    ? 'bg-white hover:bg-purple-50 hover:ring-2 hover:ring-purple-200 cursor-pointer'
                                    : 'bg-gray-50 opacity-70 cursor-not-allowed border border-gray-200'
                                }
                            `}
                        >
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <p className={`font-bold ${isAllowed ? 'text-gray-800' : 'text-gray-500'}`}>
                                        {formattedClassName}
                                    </p>
                                    {!isAllowed && <LockIcon className="w-4 h-4 text-gray-400" />}
                                </div>
                                <p className="text-sm text-gray-600">{classInfo.subject}</p>
                            </div>
                            {isAllowed && <ChevronRightIcon className="text-gray-400" />}
                        </button>
                    )
                })}
            </div>

            {allClasses.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    No classes found in the system.
                </div>
            )}
        </div>
    );
};

export default TeacherSelectClassForAttendance;