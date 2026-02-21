import React, { useState, useMemo, useEffect } from 'react';
import { Assignment } from '../../types';
import { ChevronRightIcon, PlusIcon, CheckCircleIcon, ClipboardListIcon } from '../../constants';
import { useRealtimeAssignments } from '../../lib/hooks/useRealtimeAssignments';

interface TeacherAssignmentsListScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
    forceUpdate: () => void;
    teacherId?: number | null;
}

const TeacherAssignmentsListScreen: React.FC<TeacherAssignmentsListScreenProps> = ({ navigateTo, handleBack, forceUpdate, teacherId }) => {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Use real-time hook - automatically subscribes and updates
    const { data: rawAssignments, loading, isSubscribed } = useRealtimeAssignments(
        teacherId ? String(teacherId) : undefined
    );

    // Map raw data to TypeScript interface
    const assignments: Assignment[] = useMemo(() => {
        return rawAssignments.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            className: item.class_name,
            subject: item.subject,
            dueDate: item.due_date,
            totalStudents: item.total_students || 0,
            submissionsCount: item.submissions_count || 0
        }));
    }, [rawAssignments]);


    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleAssignmentAdded = (newAssignmentData: Omit<Assignment, 'id'>) => {
        // No need to manually refetch - real-time subscription handles it automatically!
        setSuccessMessage('Assignment added successfully!');
        handleBack();
    };

    const assignmentsByClass = useMemo(() => {
        // Simple grouping without strict teacher subject/class filtering for now
        // to ensure created assignments appear.
        return assignments.reduce((acc, assignment) => {
            const className = assignment.className;
            if (!acc[className]) {
                acc[className] = [];
            }
            acc[className].push(assignment);
            return acc;
        }, {} as Record<string, Assignment[]>);
    }, [assignments]);

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {/* Real-time Connection Indicator */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm">
                {isSubscribed ? (
                    <>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-700 font-medium">Live</span>
                    </>
                ) : (
                    <>
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs text-yellow-700 font-medium">Connecting...</span>
                    </>
                )}
            </div>

            <main className="flex-grow p-4 overflow-y-auto pb-24">
                {/* Empty State */}
                {!loading && assignments.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <ClipboardListIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No assignments found</p>
                        <p className="text-sm">Create one to get started!</p>
                    </div>
                )}

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
                                        <ClipboardListIcon className="h-6 w-6 text-purple-600" />
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
            <div className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 z-40">
                <button
                    onClick={() => navigateTo('assignmentCreator', 'Create Assignment', {})}
                    className="p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};

export default TeacherAssignmentsListScreen;