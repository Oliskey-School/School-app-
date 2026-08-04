import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRightIcon, LockIcon } from '../../constants';
import { getFormattedClassName } from '../../constants';
import { api } from '../../lib/api';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useTeacherClasses } from '../../hooks/useTeacherClasses';
import { ClassInfo as ClassData } from '../../types';

interface TeacherSelectClassForAttendanceProps {
    navigateTo: (view: string, title: string, props: any) => void;
    teacherId?: string | null;
}

const TeacherSelectClassForAttendance: React.FC<TeacherSelectClassForAttendanceProps> = ({ navigateTo, teacherId }) => {
    const { profile } = useProfile();
    const { currentBranchId } = useAuth();
    const { branches } = useBranch();

    // Scoped to the teacher's currently active branch — without this, a
    // multi-branch teacher saw every branch's classes mixed together here,
    // including similarly-named ones from a branch they aren't even viewing
    // (e.g. "SSS 1 A" from another branch alongside this branch's own "SSS 1").
    const { classes: allClasses, loading, error } = useTeacherClasses(teacherId, currentBranchId);

    // The by-curriculum-track flow only makes sense for a branch actually running
    // both Nigerian and British tracks side by side — showing it unconditionally
    // on every class turned an already-simple "mark attendance" screen into a
    // confusing one for the (much more common) single-curriculum branch.
    const isDualCurriculumBranch = React.useMemo(
        () => branches.find(b => b.id === currentBranchId)?.curriculum_type?.toLowerCase() === 'dual',
        [branches, currentBranchId]
    );

    const uniqueClasses = React.useMemo(() => {
        const seen = new Set();
        return allClasses.filter(c => {
            if (seen.has(c.id)) return false;
            seen.add(c.id);
            return true;
        });
    }, [allClasses]);

    const handleSelectClass = (classInfo: any) => {
        const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);
        navigateTo('markAttendance', `Attendance: ${formattedClassName}`, { classInfo });
    };

    const handleSelectByTrack = (e: React.MouseEvent, classInfo: any) => {
        e.stopPropagation();
        const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);
        navigateTo('attendanceTrackSelector', `Attendance by Track: ${formattedClassName}`, { teacherId, classId: classInfo.id });
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
                {uniqueClasses.map((classInfo, i) => {
                    const formattedClassName = getFormattedClassName(classInfo.grade, classInfo.section);

                    return (
                        <motion.div
                            key={classInfo.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.04 }}
                            whileHover={{ y: -2 }}
                            className="relative w-full rounded-xl shadow-sm hover:shadow-md bg-white hover:ring-2 hover:ring-purple-200 transition-shadow overflow-hidden"
                        >
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSelectClass(classInfo)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-purple-50 cursor-pointer transition-colors"
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
                            </motion.button>
                            {isDualCurriculumBranch && (
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={(e) => handleSelectByTrack(e, classInfo)}
                                    className="w-full px-4 py-2 text-xs font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 border-t border-purple-100 transition-colors"
                                >
                                    Mark by Curriculum Track (Nigerian/British)
                                </motion.button>
                            )}
                        </motion.div>
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
