import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Submission, Assignment, Student } from '../../types';
import { CheckCircleIcon, ClockIcon, MailIcon } from '../../constants';

interface AssignmentSubmissionsScreenProps {
    assignment: Assignment;
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
    forceUpdate: () => void;
}

const SubmissionCard: React.FC<{ student: Student; submission: Submission; onGrade: (submission: Submission) => void }> = ({ student, submission, onGrade }) => (
    <div className="bg-white rounded-xl shadow-sm p-3 flex items-center space-x-3">
        <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{student.name}</p>
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
        <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
        <div className="flex-grow">
            <p className="font-bold text-gray-800">{student.name}</p>
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

const AssignmentSubmissionsScreen: React.FC<AssignmentSubmissionsScreenProps> = ({ assignment, navigateTo, handleBack, forceUpdate }) => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [allClassStudents, setAllClassStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Students in the class
                const gradeMatch = assignment.className.match(/\d+/);
                const sectionMatch = assignment.className.match(/[A-Z]/);

                let classStudents: Student[] = [];
                if (gradeMatch && sectionMatch) {
                    const grade = parseInt(gradeMatch[0], 10);
                    const section = sectionMatch[0];

                    const { data: studentsData } = await supabase
                        .from('students')
                        .select('*')
                        .eq('grade', grade)
                        .eq('section', section);

                    if (studentsData) {
                        classStudents = studentsData.map((s: any) => ({
                            ...s,
                            avatarUrl: s.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`
                        }));
                    }
                }
                setAllClassStudents(classStudents);

                // 2. Fetch Submissions for this assignment
                const { data: submissionsData } = await supabase
                    .from('submissions')
                    .select('*')
                    .eq('assignment_id', assignment.id);

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
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [assignment.id, assignment.className, forceUpdate]); // forceUpdate in deps ensures re-fetch on parent trigger

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

    const handleGradeSubmission = async (submissionId: number, grade: number, feedback: string) => {
        try {
            const { error } = await supabase
                .from('submissions')
                .update({
                    grade,
                    feedback,
                    status: 'Graded'
                })
                .eq('id', submissionId);

            if (error) throw error;

            // Optimistic update
            setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, grade, feedback, status: 'Graded' } : s));
            handleBack(); // Go back to summary
        } catch (err) {
            console.error("Error saving grade:", err);
            alert("Failed to save grade. Please try again.");
        }
    };

    const viewOrGrade = (submission: Submission) => {
        navigateTo('gradeSubmission', 'Grade Submission', {
            submission: submission,
            assignment: assignment,
            onGrade: handleGradeSubmission,
        });
    };

    const handleRemind = (student: Student) => {
        // Navigate to Chat with this student
        navigateTo('chat', student.name, {
            participantId: student.id,
            participantRole: 'Student',
            participantName: student.name,
            participantAvatar: student.avatarUrl
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                {/* Summary Header */}
                <div className="bg-white p-4 rounded-xl shadow-sm text-center grid grid-cols-3 divide-x divide-gray-200">
                    <div>
                        <p className="text-2xl font-bold text-purple-700">{submissions.length}/{assignment.totalStudents}</p>
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