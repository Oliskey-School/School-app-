import React, { useState, useEffect } from 'react';
import { ChevronRightIcon, LockIcon } from '../../constants';
import { getFormattedClassName } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { ClassInfo as ClassData } from '../../types';

interface TeacherSelectClassForAttendanceProps {
    navigateTo: (view: string, title: string, props: any) => void;
    teacherId?: number | null;
}

const TeacherSelectClassForAttendance: React.FC<TeacherSelectClassForAttendanceProps> = ({ navigateTo, teacherId }) => {
    const { profile } = useProfile();

    // New Hook for classes
    const { classes: allClasses, loading, error } = useTeacherClasses(teacherId);

    const handleSelectClass = (classInfo: any) => {
        const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);
        navigateTo('markAttendance', `Attendance: ${formattedClassName}`, { classInfo });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading your assigned classes...</div>;
    }

    return (
        <div className="p-4 bg-gray-100 h-full">
            <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200 mb-6">
                <h3 className="font-bold text-lg text-purple-800">My Classes</h3>
                <p className="text-sm text-purple-700">Select a class to manage attendance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allClasses.map(classInfo => {
                    const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);

                    return (
                        <button
                            key={classInfo.id}
                            onClick={() => handleSelectClass(classInfo)}
                            className="relative w-full rounded-xl shadow-sm p-4 flex items-center justify-between text-left transition-all bg-white hover:bg-purple-50 hover:ring-2 hover:ring-purple-200 cursor-pointer"
                        >
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <p className="font-bold text-gray-800">
                                        {formattedClassName}
                                    </p>
                                </div>
                                <p className="text-sm text-gray-600">{classInfo.subject}</p>
                            </div>
                            <ChevronRightIcon className="text-gray-400" />
                        </button>
                    )
                })}
            </div>

            {allClasses.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    <p className="mb-2">No classes assigned to you.</p>
                    <p className="text-xs text-gray-400">Please contact the administrator to assign classes.</p>
                </div>
            )}
        </div>
    );
};

export default TeacherSelectClassForAttendance;