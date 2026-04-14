import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { Submission, Assignment, Student } from '../../types';
import { CheckCircleIcon, ClockIcon, MailIcon, TrashIcon } from '../../constants';
import { useAutoSync } from '../../hooks/useAutoSync';
import { fetchStudentsByClassId } from '../../lib/database';

interface AssignmentSubmissionsScreenProps {
    assignment: Assignment;
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
    forceUpdate: () => void;
    schoolId: string;
}

const SubmissionCard: React.FC<{ student: Student; submission: Submission; onGrade: (submission: Submission) => void }> = ({ student, submission, onGrade }) => (
    <div className="bg-white rounded-xl shadow-sm p-3 flex items-center space-x-3">
        {student.avatarUrl ? (
            <img src={student.avatarUrl} alt={student.name || 'Student'} className="w-12 h-12 rounded-full object-cover" />
        ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 font-bold">
                {student.name?.charAt(0) || '?'}
            </div>
        )}
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{student.name || 'Unknown Student'}</p>
            <div className="flex items-center text-sm text-gray-500 space-x-2">
                <span>{new Date(submission.submittedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${submission.isLate ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {submission.isLate ? 'Late' : 'On Time'}
                </span>
            </div>
        </div>
        <div className="flex items-center space-x-3">
            <div className="flex flex-col items-center">
                {submission.status === 'Graded' ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <ClockIcon className="w-6 h-6 text-gray-400" />}
                {submission.status === 'Graded' && (
                    <span className="font-bold text-green-600 text-sm">{submission.grade}/100</span>
                )}
            </div>
            <button
                onClick={() => onGrade(submission)}
                className="py-2 px-4 bg-purple-100 text-purple-700 text-sm font-semibold rounded-lg hover:bg-purple-200 transition-colors">
                {submission.status === 'Graded' ? 'View' : 'Grade'}
            </button>
        </div>
    </div>
);

const NotSubmittedCard: React.FC<{ student: Student; onRemind: (student: Student) => void }> = ({ student, onRemind }) => (
    <div className="bg-white rounded-xl shadow-sm p-3 flex items-center space-x-3">
        {student.avatarUrl ? (
            <img src={student.avatarUrl} alt={student.name || 'Student'} className="w-12 h-12 rounded-full object-cover" />
        ) : (
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 font-bold">
                {student.name?.charAt(0) || '?'}
            </div>
        )}
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{student.name || 'Unknown Student'}</p>
            <p className="text-sm text-red-500 font-semibold">Not Submitted</p>
        </div>
        <button
            onClick={() => onRemind(student)}
            className="py-2 px-4 bg-blue-100 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2">
            <MailIcon className="w-4 h-4" />
            <span>Remind</span>
        </button>
    </div>
);

const AssignmentSubmissionsScreen: React.FC<AssignmentSubmissionsScreenProps> = ({ assignment, navigateTo, handleBack, forceUpdate, schoolId }) => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [allClassStudents, setAllClassStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Students in the class using new enrollment logic
            let classStudents: Student[] = [];

            if (assignment.classId) {
                classStudents = await fetchStudentsByClassId(assignment.classId);
            } else if (assignment.className) {
                // Fallback to legacy grade/section match if classId is missing
                const data = await api.getStudents(schoolId);
                const gradeMatch = assignment.className.match(/\d+/);
                const sectionMatch = assignment.className.match(/[A-Z]/);

                classStudents = data || [];
                if (gradeMatch && sectionMatch) {
                    const grade = parseInt(gradeMatch[0]);
                    const section = sectionMatch[0];
                    classStudents = classStudents.filter(s => s.grade === grade && s.section === section);
                }
            } else {
                console.warn('Assignment has no classId or className');
                classStudents = [];
            }
            setAllClassStudents(classStudents);

            // 2. Fetch Submissions using Hybrid API
            const submissionsData = await api.getSubmissions(assignment.id);

            if (submissionsData) {
                const mappedSubmissions: Submission[] = submissionsData.map((sub: any) => {
                    const student = classStudents.find(s => s.id === sub.student_id) || { id: sub.student_id, name: 'Unknown', avatarUrl: '', grade: 0, section: '' };
                    return {
                        id: sub.id,
                        assignmentId: sub.assignment_id,
                        student: { id: student.id, name: student.name, avatarUrl: student.avatarUrl },
                        submittedAt: sub.submitted_at,
                        status: sub.status,
                        grade: sub.grade,
                        feedback: sub.feedback,
                        isLate: sub.is_late || false,
                        textSubmission: sub.text_submission,
                        fileUrl: sub.file_url
                    } as Submission;
                });
                setSubmissions(mappedSubmissions);
            }

        } catch (error) {
            console.error("Error loading submissions:", error);
            toast.error("Failed to load submissions.");
        } finally {
            setLoading(false);
        }
    }, [assignment.id, assignment.classId, assignment.className, schoolId]);

    useEffect(() => {
        fetchData();
    }, [fetchData, forceUpdate]);

    useAutoSync(['assignment_submissions'], fetchData);


    const { submittedStudents, notSubmittedStudents } = useMemo(() => {
        const submittedStudentIds = new Set(submissions.map(s => s.student.id));

        const submitted = allClassStudents
            .filter(s => submittedStudentIds.has(s.id))
            .map(student => ({
                student,
                submission: submissions.find(s => s.student.id === student.id)!
            }));

        const notSubmitted = allClassStudents.filter(s => !submittedStudentIds.has(s.id));

        return { submittedStudents: submitted, notSubmittedStudents: notSubmitted };
    }, [allClassStudents, submissions]);

    const gradedCount = submissions.filter(s => s.status === 'Graded').length;
    const ungradedCount = submissions.length - gradedCount;

    const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
        try {
            await api.gradeSubmission(submissionId, {
                grade,
                feedback,
                status: 'Graded'
            });

            // Send Notification to Student (Optional but good)
            try {
                const submission = submissions.find(s => s.id === submissionId);
                const studentProfile = allClassStudents.find(s => s.id === submission?.student.id);
                // @ts-ignore
                const studentUserId = studentProfile?.user_id;

                if (studentUserId) {
                    await api.createNotification({
                        school_id: schoolId,
                        user_id: studentUserId,
                        category: 'Homework',
                        title: 'Assignment Graded',
                        summary: `Your assignment for ${assignment.title} has been graded. Score: ${grade}/100`,
                        timestamp: new Date().toISOString(),
                        is_read: false,
                        audience: ['student'],
                        student_id: submission?.student.id,
                        related_id: assignment.id
                    });
                }
            } catch (notifErr) { console.error(notifErr); }

            toast.success("Grade saved successfully");
            fetchData();
            handleBack();
        } catch (err) {
            console.error("Error saving grade:", err);
            toast.error("Failed to save grade");
        }
    };

    const viewOrGrade = (submission: Submission) => {
        navigateTo('gradeSubmission', 'Grade Submission', {
            submission: submission,
            assignment: assignment,
            onGrade: handleGradeSubmission,
        });
    };

    const handleRemind = async (student: Student) => {
        if (!student.user_id) {
            toast.error("Cannot send reminder: Student has no user account");
            return;
        }

        try {
            await api.createNotification({
                school_id: schoolId,
                user_id: student.user_id,
                category: 'Homework',
                title: 'Assignment Reminder',
                message: `Reminder to submit your assignment: "${assignment.title}"`,
                timestamp: new Date().toISOString(),
                is_read: false,
                audience: ['student']
            } as any);

            toast.success(`Reminder sent to ${student.name}`);
        } catch (err) {
            console.error("Error sending reminder:", err);
            toast.error("Failed to send reminder");
        }
    };

    const handleDeleteAssignment = async () => {
        if (!window.confirm("Are you sure you want to delete this assignment? All submissions will be lost.")) return;

        try {
            setLoading(true);
            await api.deleteAssignment(assignment.id);
            toast.success("Assignment deleted successfully");
            handleBack();
        } catch (err) {
            console.error("Error deleting assignment:", err);
            toast.error("Failed to delete assignment");
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Header Actions */}
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-gray-800">{assignment.title}</h2>
                    <button
                        onClick={handleDeleteAssignment}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-1"
                        title="Delete Assignment"
                    >
                        <TrashIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold">Delete</span>
                    </button>
                </div>

                {/* Summary Header */}
                <div className="bg-white p-4 rounded-xl shadow-sm text-center grid grid-cols-3 divide-x divide-gray-200">
                    <div>
                        <p className="text-2xl font-bold text-purple-700">{submissions.length}/{allClassStudents.length || assignment.totalStudents}</p>
                        <p className="text-xs text-gray-500 font-medium">Submitted</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-600">{gradedCount}</p>
                        <p className="text-xs text-gray-500 font-medium">Graded</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-blue-600">{ungradedCount}</p>
                        <p className="text-xs text-gray-500 font-medium">Ungraded</p>
                    </div>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading submissions...</div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Submitted List */}
                        <div>
                            <h3 className="font-bold text-gray-700 mb-2 px-1">Submitted ({submittedStudents.length})</h3>
                            <div className="space-y-3">
                                {submittedStudents.length > 0 ? submittedStudents.map(item => (
                                    <SubmissionCard key={item.student.id} student={item.student} submission={item.submission} onGrade={viewOrGrade} />
                                )) : <p className="text-sm text-gray-500 p-4 bg-white rounded-xl text-center">No submissions yet.</p>}
                            </div>
                        </div>

                        {/* Not Submitted List */}
                        <div>
                            <h3 className="font-bold text-gray-700 mb-2 px-1">Not Submitted ({notSubmittedStudents.length})</h3>
                            <div className="space-y-3">
                                {notSubmittedStudents.length > 0 ? notSubmittedStudents.map(student => (
                                    <NotSubmittedCard key={student.id} student={student} onRemind={handleRemind} />
                                )) : <p className="text-sm text-gray-500 p-4 bg-white rounded-xl text-center">All students have submitted!</p>}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AssignmentSubmissionsScreen;