import React from 'react';
import { Assignment } from '../../types';
import { mockAssignments } from '../../data';
import { ChevronRightIcon } from '../../constants';

interface ClassAssignmentsScreenProps {
    className: string;
    navigateTo: (view: string, title: string, props: any) => void;
}

const ClassAssignmentsScreen: React.FC<ClassAssignmentsScreenProps> = ({ className, navigateTo }) => {
    const classAssignments = mockAssignments.filter(assignment => assignment.className === className)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    return (
        <div className="p-4 bg-gray-100 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classAssignments.map(assignment => (
                    <div key={assignment.id} className="bg-white p-4 rounded-lg shadow-sm space-y-3 transition-all hover:shadow-md border">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg text-gray-800">{assignment.title}</h4>
                                <p className="text-sm text-gray-500">{assignment.subject}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-2xl text-purple-700">{assignment.submissionsCount}/{assignment.totalStudents}</p>
                                <p className="text-sm text-gray-500">Submitted</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                            Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <div className="border-t border-gray-100 pt-3">
                            <button
                                onClick={() => navigateTo('assignmentSubmissions', `Submissions: ${assignment.title}`, { assignment })}
                                className="w-full text-center py-2 px-4 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors flex justify-center items-center space-x-2"
                                aria-label={`View submissions for ${assignment.title}`}
                            >
                                <span>View Submissions</span>
                                <ChevronRightIcon className="h-5 w-5"/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {classAssignments.length === 0 && (
                 <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-500">No assignments found for this class.</p>
                </div>
            )}
        </div>
    );
};

export default ClassAssignmentsScreen;