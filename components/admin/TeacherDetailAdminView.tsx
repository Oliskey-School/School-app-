import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Teacher } from '../../types';
import { MailIcon, PhoneIcon, ChartBarIcon, CalendarIcon, EditIcon, gradeColors, SUBJECT_COLORS, TrashIcon } from '../../constants';
import DonutChart from '../ui/DonutChart';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import ConfirmationModal from '../ui/ConfirmationModal';

interface TeacherDetailAdminViewProps {
    teacher: Teacher;
    navigateTo: (view: string, title: string, props?: any) => void;
    forceUpdate: () => void;
    handleBack: () => void;
}

// Removed legacy fetchTeacherById import
import { useTeacherStats } from '../../hooks/useTeacherStats';

const TeacherDetailAdminView: React.FC<TeacherDetailAdminViewProps> = ({ teacher: initialTeacher, navigateTo, forceUpdate, handleBack }) => {
    const [teacher, setTeacher] = useState<Teacher | undefined>(initialTeacher);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(Date.now());
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);

    // Use the new hook for real-time analytics
    const { stats, loading: statsLoading } = useTeacherStats(teacher?.id || '', teacher?.schoolId || '', null);

    const loadTeacher = async () => {
        try {
            if (!initialTeacher?.id) return;
            const freshData = await api.getTeacherById(initialTeacher.id);
            if (freshData) {
                setTeacher(freshData);
                setRefreshKey(Date.now()); // Force refresh of dependent components and images
            }
        } catch (err) {
            console.error('Failed to reload teacher data:', err);
        }
    };

    // Fetch latest data on mount
    React.useEffect(() => {
        if (!initialTeacher?.id) return;
        loadTeacher();
    }, [initialTeacher?.id]);

    useAutoSync(['teachers', 'attendance', 'academic'], () => {
        console.log('🔄 [TeacherDetail] Real-time auto-sync triggered');
        loadTeacher();
    });

    // Computed classes visualization — deduplicated by class+subject key
    const displayClasses = (() => {
        const seen = new Set<string>();
        return (teacher?.classes || []).reduce((acc: any[], classItem: any) => {
            const classNameStr = (typeof classItem === 'string'
                ? classItem
                : classItem?.class?.name || classItem?.name || 'Unknown Class') || 'Unknown Class';

            let displayName = classNameStr;
            let subject = (teacher?.subjects?.[0]) || 'General';

            if (typeof classNameStr === 'string' && classNameStr.includes('-')) {
                const parts = classNameStr.split(/\s*[-–]\s*/);
                if (parts.length > 1) { displayName = parts[0]; subject = parts[1]; }
            }

            if (/^\d+$/.test(displayName.trim())) displayName = `Grade ${displayName.trim()}`;

            const key = `${displayName}||${subject}`;
            if (seen.has(key)) return acc;
            seen.add(key);
            acc.push({ id: key, displayName, subject, studentCount: classItem?.class?.student_count || 0 });
            return acc;
        }, []);
    })();

    const handleDelete = async () => {
        try {
            // Delete using the backend API which handles relations and user accounts
            const success = await api.deleteTeacher(teacher.id);

            if (!success) throw new Error('Failed to delete teacher via API');

            toast.success(`${teacher.full_name || teacher.name} has been successfully deleted from the database.`);
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error deleting teacher:', error);
            toast.error('Failed to delete teacher: ' + (error.message || 'Unknown error'));
        }
    };

    if (!teacher) {
        return <div className="p-6 text-center text-sm text-gray-500">No teacher selected. Open this view from a teacher row in the Teacher List.</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Teacher Info */}
                    <div className="lg:col-span-3 bg-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0 text-center sm:text-left">
                        <img
                            key={`${teacher.id}-${refreshKey}`}
                            src={`${teacher.avatarUrl || teacher.avatar_url}${ (teacher.avatarUrl || teacher.avatar_url)?.includes('uploads/') ? `?t=${refreshKey}` : '' }`} 
                            alt={teacher.full_name || teacher.name} 
                            className="w-20 h-20 rounded-full object-cover border-4 border-indigo-100 flex-shrink-0" 
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.full_name || teacher.name)}&background=random`;
                            }}
                        />
                        <div className="flex-grow min-w-0 w-full">
                            <div className="flex flex-col sm:flex-row items-center sm:space-x-2 justify-center sm:justify-start">
                                <h3 className="text-xl font-bold text-gray-800 truncate max-w-full">{teacher.full_name || teacher.name}</h3>
                                <div className="flex items-center mt-1 sm:mt-0 space-x-2">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {teacher.status}
                                    </span>
                                    {teacher.schoolGeneratedId && (
                                        <span className="px-2 py-0.5 text-xs font-mono bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                            {teacher.schoolGeneratedId?.replace(/-/g, '_')}
                                        </span>
                                    )}
                                </div>
                                <div className="relative mt-2 sm:mt-0 sm:ml-2">
                                    <button
                                        onClick={() => setShowStatusDropdown(v => !v)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                                    >
                                        Change
                                    </button>
                                    {showStatusDropdown && (
                                        <div className="absolute left-0 top-6 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                                            {['Active', 'On Leave', 'Inactive'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => { setPendingStatus(s); setShowStatusDropdown(false); }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${teacher.status === s ? 'font-bold text-indigo-600' : 'text-gray-700'}`}
                                                >{s}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className={`text-sm font-semibold inline-block px-2 py-0.5 rounded mt-2 ${SUBJECT_COLORS[teacher.subjects?.[0] || ''] || 'bg-gray-200'}`}>{(teacher.subjects || []).join(', ')}</p>
                            {((teacher as any).branch_name || (teacher as any).branchName) && (
                                <p className="text-xs text-gray-500 mt-1">
                                    <span className="font-medium">Branch:</span> {(teacher as any).branch_name || (teacher as any).branchName}
                                </p>
                            )}
                            {(teacher as any).curriculum_eligibility?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
                                    {((teacher as any).curriculum_eligibility as string[]).map((c: string) => (
                                        <span key={c} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full font-medium">{c}</span>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
                                <a href={`mailto:${teacher.email}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-indigo-600"><MailIcon className="w-4 h-4" /><span>Email</span></a>
                                <a href={`tel:${teacher.phone}`} className="flex items-center space-x-1 text-sm text-gray-600 hover:text-indigo-600"><PhoneIcon className="w-4 h-4" /><span>Call</span></a>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs sm:text-sm text-gray-500">Attendance</p>
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mt-1">
                                    <DonutChart percentage={statsLoading ? 0 : stats.attendanceRate} color="#4f46e5" size={80} strokeWidth={9} />
                                    <div className="absolute inset-0 flex items-center justify-center text-lg sm:text-xl font-bold text-gray-800">
                                        {statsLoading ? '...' : `${stats.attendanceRate}%`}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm text-center">
                                <p className="text-xs sm:text-sm text-gray-500">Avg. Student Score</p>
                                <p className="text-3xl sm:text-5xl font-bold text-indigo-600 mt-2 truncate">
                                    {statsLoading ? '...' : `${stats.avgStudentScore}%`}
                                </p>
                            </div>
                        </div>

                        {/* Assigned Classes */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-2">Assigned Classes ({displayClasses.length})</h4>
                            <div className="space-y-2">
                                {displayClasses.length > 0 ? displayClasses.map((c, idx) => (
                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                        <p className="font-semibold text-gray-700 text-sm sm:text-base truncate mr-2">{c.displayName} - {c.subject}</p>
                                        <span className={`text-xs sm:text-xs font-semibold px-2 py-1 rounded-full bg-gray-200 flex-shrink-0 whitespace-nowrap`}>{c.studentCount > 0 ? `${c.studentCount} students` : 'Class Info'}</span>
                                    </div>
                                )) : <p className="text-gray-500 text-sm italic">No classes assigned.</p>}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        {/* Actions */}
                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-2">
                            <button onClick={() => navigateTo('teacherPerformance', 'Performance Evaluation', { teacher })} className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                                <ChartBarIcon className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                                <span className="font-semibold text-gray-700 text-sm sm:text-base">Performance Evaluation</span>
                            </button>
                            <button onClick={() => navigateTo('teacherAttendanceDetail', `${teacher.full_name || teacher.name}'s Attendance`, { teacher })} className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                                <CalendarIcon className="w-6 h-6 text-indigo-500 flex-shrink-0" />
                                <span className="font-semibold text-gray-700 text-sm sm:text-base">Full Attendance Record</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <div className="p-4 mt-auto bg-white border-t space-y-2">
                <h3 className="text-sm font-bold text-gray-500 text-center uppercase">Admin Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigateTo('addTeacher', `Edit ${teacher.full_name || teacher.name}`, { teacherToEdit: teacher })} className="flex items-center justify-center space-x-2 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-semibold hover:bg-indigo-200 transition-colors text-sm sm:text-base"><EditIcon className="w-4 h-4 sm:w-5 sm:h-5" /><span>Edit Profile</span></button>
                    <button onClick={() => setShowDeleteModal(true)} className="flex items-center justify-center space-x-2 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition-colors text-sm sm:text-base"><TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" /><span>Delete Account</span></button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Teacher Account"
                message={`Are you sure you want to delete ${teacher.full_name || teacher.name}? This action cannot be undone.`}
                confirmText="Delete"
                isDanger
            />

            <ConfirmationModal
                isOpen={!!pendingStatus}
                onClose={() => setPendingStatus(null)}
                onConfirm={async () => {
                    if (!pendingStatus) return;
                    try {
                        await api.updateTeacher(teacher.id, { status: pendingStatus });
                        setTeacher({ ...teacher, status: pendingStatus as any });
                        toast.success(`Status changed to ${pendingStatus}`);
                        forceUpdate();
                    } catch (err: any) {
                        toast.error('Failed to update status: ' + err.message);
                    } finally {
                        setPendingStatus(null);
                    }
                }}
                title="Change Teacher Status"
                message={`Change ${teacher.full_name || teacher.name}'s status to "${pendingStatus}"?`}
                confirmText="Confirm"
            />
        </div>
    );
};

export default TeacherDetailAdminView;
