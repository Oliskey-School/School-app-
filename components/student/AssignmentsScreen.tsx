
import React, { useMemo } from 'react';
import { Assignment, Submission, StudentAssignment } from '../../types';
import { mockAssignments, mockSubmissions } from '../../data';
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, DocumentTextIcon, SUBJECT_COLORS } from '../../constants';

interface StudentAssignmentsScreenProps {
    studentId: number;
    subjectFilter?: string;
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AssignmentsScreen: React.FC<StudentAssignmentsScreenProps> = ({ studentId, subjectFilter, navigateTo }) => {
    
    const studentAssignments = useMemo(() => {
        const studentSubmissionsMap = new Map<number, Submission>();
        mockSubmissions
            .filter(s => s.student.id === studentId)
            .forEach(s => studentSubmissionsMap.set(s.assignmentId, s));

        return mockAssignments
            .filter(assignment => !subjectFilter || assignment.subject === subjectFilter)
            .map(assignment => ({
                ...assignment,
                submission: studentSubmissionsMap.get(assignment.id)
            }))
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [studentId, subjectFilter]);

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
        switch(buttonText) {
            case 'View Grade':
                navigateTo('assignmentFeedback', 'View Feedback', { assignment });
                break;
            case 'Submit Now':
            case 'Submit Late':
            case 'View Submission':
                navigateTo('assignmentSubmission', 'Submit Assignment', { assignment });
                break;
            default:
                console.log("No action defined for:", buttonText);
        }
    };


    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                {studentAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {studentAssignments.map(assignment => {
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