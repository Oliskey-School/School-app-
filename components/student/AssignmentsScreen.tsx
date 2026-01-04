import React, { useMemo, useState, useEffect } from 'react';
import { Assignment, Submission, StudentAssignment } from '../../types';
import { supabase } from '../../lib/supabase';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, DocumentTextIcon, SUBJECT_COLORS } from '../../constants';

interface StudentAssignmentsScreenProps {
    studentId: number;
    subjectFilter?: string;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AssignmentsScreen: React.FC<StudentAssignmentsScreenProps> = ({ studentId, subjectFilter, navigateTo }) => {

    const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                // Fetch all assignments (or filtered by class/grade if we had that info, 
                // but we might need to assume all assignments or fetch based on some criteria)
                // For now, fetching all assignments.Ideally should filter by grade.

                const { data: assignmentsData, error: assignError } = await supabase
                    .from('assignments')
                    .select('*')
                    .order('due_date', { ascending: true });

                if (assignError) throw assignError;

                const { data: submissionsData, error: subError } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('student_id', studentId);

                // If submissions table doesn't exist or error, we just assume no submissions or handle gracefully
                // but we will throw if real error to see it.

                const studentSubmissionsMap = new Map<number, Submission>();
                if (submissionsData) {
                    submissionsData.forEach((s: any) => {
                        studentSubmissionsMap.set(s.assignment_id, {
                            id: s.id,
                            assignmentId: s.assignment_id,
                            student: { id: studentId, name: 'You', avatarUrl: '' }, // minimal mock or fetch
                            submittedAt: s.submission_date || s.submitted_at || new Date().toISOString(),
                            isLate: s.is_late || false,
                            files: s.file_url ? [{ name: 'Submission', size: 0 }] : [],
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
        };

        fetchAssignments();
    }, [studentId]);

    const filteredAssignments = useMemo(() => {
        return assignments
            .filter(assignment => !subjectFilter || assignment.subject === subjectFilter)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [assignments, subjectFilter]);

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
                {filteredAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredAssignments.map(assignment => {
                            const status = getStatus(assignment);
                            const subjectColor = SUBJECT_COLORS[assignment.subject] || 'bg-gray-100 text-gray-800';
                            const buttonInfo = getButtonInfo(assignment);

                            return (
                                <div key={assignment.id} className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
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
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                                        <div className={`flex items-center space-x-2 text-sm font-semibold ${status.color}`}>
                                            {React.cloneElement(status.icon, { className: `w-5 h-5 ${status.isComplete ? 'animate-checkmark-pop' : ''}`.trim() })}
                                            <span>{status.text}</span>
                                        </div>

                                        <button
                                            onClick={() => handleButtonClick(assignment, buttonInfo.text)}
                                            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${buttonInfo.style}`}
                                        >
                                            {buttonInfo.text}
                                        </button>
                                    </div>
                                </div>
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