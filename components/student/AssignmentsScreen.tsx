import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { Assignment, Submission, StudentAssignment } from '../../types';
import api from '../../lib/api';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, DocumentTextIcon, SUBJECT_COLORS } from '../../constants';

interface StudentAssignmentsScreenProps {
    studentId: string | number;
    schoolId?: string;
    currentBranchId?: string | null;
    subjectFilter?: string;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AssignmentsScreen: React.FC<StudentAssignmentsScreenProps> = ({ studentId, subjectFilter, navigateTo, schoolId, currentBranchId }) => {

    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAssignmentsAndSubmissions = useCallback(async () => {
        try {
            // 1. Fetch Assignments (scoped by backend)
            const assignmentsData = await api.getAssignments(schoolId || '', {
                classId: undefined, 
            });

            // 2. Fetch Student Submissions via Unified API
            const submissionsData = await api.getMySubmissions();

            const studentSubmissionsMap = new Map<string, Submission>();
            if (submissionsData) {
                submissionsData.forEach((s: any) => {
                    studentSubmissionsMap.set(s.assignment_id, {
                        id: s.id,
                        assignmentId: s.assignment_id,
                        student: { id: studentId.toString(), name: 'You', avatarUrl: '' },
                        submittedAt: s.submitted_at || new Date().toISOString(),
                        isLate: s.is_late || false,
                        files: s.files ? [{ name: 'Submission', size: 0 }] : [],
                        status: s.status || 'Ungraded',
                        grade: s.grade,
                        feedback: s.feedback
                    });
                });
            }

            if (assignmentsData) {
                const mapped: StudentAssignment[] = assignmentsData.map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    subject: a.subject,
                    description: a.description,
                    dueDate: a.due_date,
                    className: a.class_name || 'General',
                    totalStudents: a.total_students || 0,
                    submissionsCount: a.submissions_count || 0,
                    submission: studentSubmissionsMap.get(a.id)
                }));
                setAssignments(mapped);
            }

        } catch (err) {
            console.error('Error fetching assignments:', err);
        } finally {
            setLoading(false);
        }
    }, [studentId, schoolId]);

    // Real-time synchronization
    useAutoSync(['assignments', 'submissions'], fetchAssignmentsAndSubmissions);

    useEffect(() => {
        fetchAssignmentsAndSubmissions();
    }, [fetchAssignmentsAndSubmissions]);

    const filteredAssignments = useMemo(() => {
        return assignments
            .filter(assignment => !subjectFilter || assignment.subject === subjectFilter)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [assignments, subjectFilter]);

    // "Due soon" = not yet submitted and due within the next 2 days (and not overdue).
    const DUE_SOON_MS = 2 * 24 * 60 * 60 * 1000;
    const isDueSoon = useCallback((a: StudentAssignment) => {
        if (a.submission) return false;
        const diff = new Date(a.dueDate).getTime() - Date.now();
        return diff > 0 && diff <= DUE_SOON_MS;
    }, []);

    const dueSoonCount = useMemo(
        () => filteredAssignments.filter(isDueSoon).length,
        [filteredAssignments, isDueSoon]
    );

    // Auto-reminder: drop one notification into the student's bell per due-soon
    // assignment (deduped per student+assignment so it never spams).
    useEffect(() => {
        const notifyDueSoon = async () => {
            const soon = assignments.filter(isDueSoon);
            if (soon.length === 0) return;
            let me: any;
            try { me = await api.getMe(); } catch { return; }
            const uid = me?.id;
            if (!uid) return;
            for (const a of soon) {
                const key = `dueSoonNotified:${uid}:${a.id}`;
                if (localStorage.getItem(key)) continue;
                try {
                    await api.createNotification({
                        school_id: schoolId || me.school_id,
                        user_id: uid,
                        category: 'Homework',
                        title: 'Assignment Due Soon',
                        message: `"${a.title}" is due ${new Date(a.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}. Submit before the deadline.`,
                        timestamp: new Date().toISOString(),
                        is_read: false,
                        audience: ['student'],
                        related_id: a.id,
                    } as any);
                    localStorage.setItem(key, '1');
                } catch { /* non-fatal â€” the on-screen banner still reminds them */ }
            }
        };
        notifyDueSoon();
    }, [assignments, isDueSoon, schoolId]);

    const getStatus = (assignment: StudentAssignment) => {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();

        if (assignment.submission) {
            if (assignment.submission.status === 'Graded') {
                return { text: `Graded: ${assignment.submission.grade}/100`, icon: <CheckCircleIcon />, color: 'text-green-600', isComplete: true };
            }
            return { text: 'Submitted', icon: <CheckCircleIcon />, color: 'text-sky-600', isComplete: true };
        }

        if (dueDate < now) {
            return { text: 'Overdue', icon: <ExclamationCircleIcon />, color: 'text-red-600', isComplete: false };
        }
        return { text: 'Pending', icon: <ClockIcon />, color: 'text-amber-600', isComplete: false };
    };

    const getButtonInfo = (assignment: StudentAssignment) => {
        const isOverdue = new Date(assignment.dueDate) < new Date() && !assignment.submission;

        if (assignment.submission?.status === 'Graded') {
            return { text: 'View Grade', style: 'bg-green-100 text-green-700 hover:bg-green-200' };
        }
        if (assignment.submission) {
            return { text: 'View Submission', style: 'bg-sky-100 text-sky-700 hover:bg-sky-200' };
        }
        if (isOverdue) {
            return { text: 'Submit Late', style: 'bg-red-500 text-white hover:bg-red-600' };
        }
        return { text: 'Submit Now', style: 'bg-orange-500 text-white hover:bg-orange-600' };
    };

    const handleButtonClick = (assignment: StudentAssignment, buttonText: string) => {
        switch (buttonText) {
            case 'View Grade':
                navigateTo('assignmentFeedback', 'View Feedback', { assignment });
                break;
            case 'Submit Now':
            case 'Submit Late':
            case 'View Submission':
                // Assuming we want to facilitate submission.
                navigateTo('assignmentSubmission', 'Submit Assignment', { assignment });
                break;
            default:
                console.log("No action defined for:", buttonText);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading assignments...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                {dueSoonCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800"
                    >
                        <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-semibold">
                            {dueSoonCount} assignment{dueSoonCount > 1 ? 's' : ''} due in 2 days or less — submit before the deadline.
                        </span>
                    </motion.div>
                )}
                {filteredAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredAssignments.map((assignment, i) => {
                            const status = getStatus(assignment);
                            const subjectColor = SUBJECT_COLORS[assignment.subject] || 'bg-gray-100 text-gray-800';
                            const buttonInfo = getButtonInfo(assignment);
                            const dueSoon = isDueSoon(assignment);

                            return (
                                <motion.div
                                    key={assignment.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.04 }}
                                    className={`bg-white rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md ${dueSoon ? 'ring-2 ring-amber-400' : ''}`}
                                >
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg text-gray-800 pr-2 flex-1">{assignment.title}</h4>
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${subjectColor}`}>
                                                {assignment.subject}
                                            </span>
                                        </div>

                                        <div className="flex items-center text-sm text-gray-500">
                                            <ClockIcon className="w-4 h-4 mr-1.5" />
                                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                            {dueSoon && (
                                                <span className="ml-2 px-2 py-0.5 text-xs font-bold uppercase tracking-wide rounded-full bg-amber-100 text-amber-700">
                                                    Due soon
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                                        <div className={`flex items-center space-x-2 text-sm font-semibold ${status.color}`}>
                                            {React.cloneElement(status.icon, { className: `w-5 h-5 ${status.isComplete ? 'animate-checkmark-pop' : ''}`.trim() })}
                                            <span>{status.text}</span>
                                        </div>

                                        <motion.button
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleButtonClick(assignment, buttonInfo.text)}
                                            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${buttonInfo.style}`}
                                        >
                                            {buttonInfo.text}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm mt-8">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Assignments Found</h3>
                        <p className="mt-1 text-sm text-gray-500">{subjectFilter ? `There are no assignments for this subject yet.` : `You're all caught up!`}</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AssignmentsScreen;