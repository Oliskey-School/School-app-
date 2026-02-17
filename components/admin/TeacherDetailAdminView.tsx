import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Teacher } from '../../types';
import { MailIcon, PhoneIcon, ChartBarIcon, CalendarIcon, EditIcon, gradeColors, SUBJECT_COLORS, TrashIcon } from '../../constants';
import DonutChart from '../ui/DonutChart';
import { supabase } from '../../lib/supabase';
import ConfirmationModal from '../ui/ConfirmationModal';

interface TeacherDetailAdminViewProps {
    teacher: Teacher;
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
}

import { fetchTeacherById } from '../../lib/database';
import { useTeacherStats } from '../../hooks/useTeacherStats';

const TeacherDetailAdminView: React.FC<TeacherDetailAdminViewProps> = ({ teacher: initialTeacher, navigateTo, forceUpdate, handleBack }) => {
    const [teacher, setTeacher] = useState<Teacher>(initialTeacher);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Use the new hook for real-time analytics
    // Note: initialTeacher might not have school_id typed correctly if it's a partial type, 
    // but usually it should. If missing, we might need to fetch it or fallback.
    const { stats, loading: statsLoading } = useTeacherStats(teacher.id, teacher.schoolId || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1');

    // Fetch latest data on mount
    React.useEffect(() => {
        const loadTeacher = async () => {
            const freshData = await fetchTeacherById(initialTeacher.id);
            if (freshData) {
                setTeacher(freshData);
            }
        };
        loadTeacher();
    }, [initialTeacher.id]);

    // Computed classes visualization
    // If we have detailed class info in mockClasses, use it. Otherwise, create a placeholder.
    const displayClasses = teacher.classes.map(className => {
        // Parse "Grade 7 - Math" or "10A - Physics"
        let grade = 0;
        let section = '';
        let subject = teacher.subjects[0] || 'General';

        // Normalized: remove "Grade " prefix
        const clean = className.replace(/^Grade\s+/i, '').trim();

        // Regex to split "Part1 - Part2"
        const parts = clean.split(/\s*[-–]\s*/);

        // First part is Class (e.g. "7" or "10A")
        const classPart = parts[0];
        const subjectPart = parts.length > 1 ? parts[1] : '';

        // Parse Grade/Section from classPart
        const match = classPart.match(/^(\d+)([A-Za-z]+)?$/);
        if (match) {
            grade = parseInt(match[1]);
            section = match[2] || '';
        } else {
            // Check if just number
            const numMatch = classPart.match(/^(\d+)$/);
            if (numMatch) {
                grade = parseInt(numMatch[1]);
            }
        }

        if (subjectPart) {
            subject = subjectPart;
        }

        return {
            id: Math.random(),
            grade,
            section,
            subject,
            studentCount: 0 // Still hard to map individual class counts without more complex query
        };
    });

    const handleDelete = async () => {
        try {
            // Delete from database first
            const { error: deleteTeacherError } = await supabase
                .from('teachers')
                .delete()
                .eq('id', teacher.id);

            if (deleteTeacherError) throw deleteTeacherError;

            // Delete associated user account if exists
            if (teacher.user_id) {
                const { error: deleteUserError } = await supabase
                    .from('users')
                    .delete()
                    .eq('id', teacher.user_id);

                if (deleteUserError) console.warn('Warning: Could not delete user account:', deleteUserError);
            }

            // Delete login credentials
            const { error: deleteAuthError } = await supabase
                .from('auth_accounts')
                .delete()
                .eq('user_id', teacher.user_id);

            if (deleteAuthError) console.warn('Warning: Could not delete auth account:', deleteAuthError);

            toast.success(`${teacher.name} has been successfully deleted from the database.`);
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error deleting teacher:', error);
            toast.error('Failed to delete teacher: ' + (error.message || 'Unknown error'));
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Teacher Info */}
                    <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm flex items-center space-x-4">
                        <img src={teacher.avatarUrl} alt={teacher.name} className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100" />
                        <div className="flex-grow">
                            <div className="flex items-center space-x-2">
                                <h3 className="text-xl font-bold text-gray-800">{teacher.name}</h3>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {teacher.status}
                                </span>
                                {teacher.schoolGeneratedId && (
                                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                        {teacher.schoolGeneratedId?.replace(/-/g, '_')}
                                    </span>
                                )}
                                <button
                                    onClick={async () => {
                                        try {
                                            const newStatus = teacher.status === 'Active' ? 'On Leave' : 'Active';
                                            const { error } = await supabase
                                                .from('teachers')
                                                .update({ status: newStatus })
                                                .eq('id', teacher.id);

                                            if (error) throw error;

                                            setTeacher({ ...teacher, status: newStatus });
                                            forceUpdate();
                                        } catch (err: any) {
                                            toast.error('Failed to update status: ' + err.message);
                                        }
                                    }}
                                    className="ml-2 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                                >
                                    Change
                                </button>
                            </div>
                            <p className={`text-sm font-semibold inline-block px-2 py-0.5 rounded ${SUBJECT_COLORS[teacher.subjects[0]] || 'bg-gray-200'}`}>{teacher.subjects.join(', ')}</p>
                            <div className="flex space-x-4 mt-2">
                                <a href={`mailto:${teacher.email}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-indigo-600"><MailIcon className="w-4 h-4" /><span>Email</span></a>
                                <a href={`tel:${teacher.phone}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-indigo-600"><PhoneIcon className="w-4 h-4" /><span>Call</span></a>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-gray-500">Attendance</p>
                                <div className="relative w-20 h-20 mx-auto mt-1">
                                    <DonutChart percentage={statsLoading ? 0 : stats.attendanceRate} color="#4f46e5" size={80} strokeWidth={9} />
                                    <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-800">
                                        {statsLoading ? '...' : `${stats.attendanceRate}%`}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                                <p className="text-sm text-gray-500">Avg. Student Score</p>
                                <p className="text-5xl font-bold text-indigo-600 mt-2">
                                    {statsLoading ? '...' : `${stats.avgStudentScore}%`}
                                </p>
                            </div>
                        </div>

                        {/* Assigned Classes */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-2">Assigned Classes ({statsLoading ? '...' : stats.totalClasses})</h4>
                            <div className="space-y-2">
                                {displayClasses.length > 0 ? displayClasses.map((c, idx) => (
                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-gray-700">Grade {c.grade}{c.section} - {c.subject}</p>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${gradeColors[c.grade] || 'bg-gray-200'}`}>{c.studentCount > 0 ? `${c.studentCount} students` : 'Class Info'}</span>
                                    </div>
                                )) : <p className="text-gray-500 text-sm italic">No classes assigned.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        {/* Actions */}
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                            <button onClick={() => navigateTo('teacherPerformance', 'Performance Evaluation', { teacher })} className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                <ChartBarIcon className="w-6 h-6 text-indigo-500" />
                                <span className="font-semibold text-gray-700">Performance Evaluation</span>
                            </button>
                            <button onClick={() => navigateTo('teacherAttendanceDetail', `${teacher.name}'s Attendance`, { teacher })} className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg">
                                <CalendarIcon className="w-6 h-6 text-indigo-500" />
                                <span className="font-semibold text-gray-700">Full Attendance Record</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <div className="p-4 mt-auto bg-white border-t space-y-2">
                <h3 className="text-sm font-bold text-gray-500 text-center uppercase">Admin Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigateTo('addTeacher', `Edit ${teacher.name}`, { teacherToEdit: teacher })} className="flex items-center justify-center space-x-2 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-semibold"><EditIcon /><span>Edit Profile</span></button>
                    <button onClick={() => setShowDeleteModal(true)} className="flex items-center justify-center space-x-2 py-3 bg-red-100 text-red-700 rounded-xl font-semibold"><TrashIcon /><span>Delete Account</span></button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Teacher Account"
                message={`Are you sure you want to delete ${teacher.name}? This action cannot be undone.`}
                confirmText="Delete"
                isDanger
            />
        </div>
    );
};

export default TeacherDetailAdminView;
