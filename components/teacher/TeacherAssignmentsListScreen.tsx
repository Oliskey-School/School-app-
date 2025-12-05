import React, { useState, useMemo, useEffect } from 'react';
import { Assignment, Teacher } from '../../types';
import { mockAssignments, mockTeachers } from '../../data';
import { ChevronRightIcon, PlusIcon, CheckCircleIcon, ClipboardListIcon } from '../../constants';

interface TeacherAssignmentsListScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
    forceUpdate: () => void;
}

const LOGGED_IN_TEACHER_ID = 2;

const TeacherAssignmentsListScreen: React.FC<TeacherAssignmentsListScreenProps> = ({ navigateTo, handleBack, forceUpdate }) => {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const teacher = useMemo(() => mockTeachers.find(t => t.id === LOGGED_IN_TEACHER_ID)!, []);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleAssignmentAdded = (newAssignmentData: Omit<Assignment, 'id'>) => {
        const newAssignment: Assignment = {
            id: Date.now(),
            ...newAssignmentData,
        };
        mockAssignments.unshift(newAssignment);
        forceUpdate();
        setSuccessMessage('Assignment added successfully!');
        handleBack();
    };

    const assignmentsByClass = useMemo(() => {
        const teacherAssignments = mockAssignments.filter(a => 
            teacher.subjects.includes(a.subject) && 
            teacher.classes.some(c => a.className.includes(c))
        );
        return teacherAssignments.reduce((acc, assignment) => {
            const className = assignment.className;
            if (!acc[className]) {
                acc[className] = [];
            }
            acc[className].push(assignment);
            return acc;
        }, {} as Record<string, Assignment[]>);
    }, [teacher, forceUpdate]); // Depend on forceUpdate to re-calculate

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 overflow-y-auto pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(assignmentsByClass).map(([className, classAssignments]: [string, Assignment[]]) => {
                        const totalSubmissions = classAssignments.reduce((sum, a) => sum + a.submissionsCount, 0);
                        const totalStudentsPossibleSubmissions = classAssignments.reduce((sum, a) => sum + a.totalStudents, 0);

                        return (
                            <button
                                key={className}
                                onClick={() => navigateTo('classAssignments', `Assignments: ${className}`, { className })}
                                className="w-full bg-white p-4 rounded-xl shadow-sm flex justify-between items-center text-left hover:bg-purple-50 transition-colors"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-purple-100 rounded-lg">
                                        <ClipboardListIcon className="h-6 w-6 text-purple-600"/>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{className}</h3>
                                        <p className="text-sm text-gray-500">{classAssignments.length} Assignments</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="text-right">
                                        <p className="font-semibold text-purple-700">{totalSubmissions} / {totalStudentsPossibleSubmissions}</p>
                                        <p className="text-xs text-gray-500">Submissions</p>
                                    </div>
                                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </main>
            {successMessage && (
                <div className="fixed bottom-24 right-6 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-up">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>{successMessage}</span>
                </div>
            )}
            <div className="absolute bottom-6 right-6">
                <button
                    onClick={() => navigateTo('createAssignment', 'Create Assignment', { onAssignmentAdded: handleAssignmentAdded, handleBack: handleBack })}
                    className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    aria-label="Create new assignment"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};

export default TeacherAssignmentsListScreen;