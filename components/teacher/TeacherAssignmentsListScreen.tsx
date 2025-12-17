import React, { useState, useMemo, useEffect } from 'react';
import { Assignment } from '../../types';
import { ChevronRightIcon, PlusIcon, CheckCircleIcon, ClipboardListIcon } from '../../constants';
import { supabase } from '../../lib/supabase';

interface TeacherAssignmentsListScreenProps {
    navigateTo: (view: string, title: string, props: any) => void;
    handleBack: () => void;
    forceUpdate: () => void;
}

const TeacherAssignmentsListScreen: React.FC<TeacherAssignmentsListScreenProps> = ({ navigateTo, handleBack, forceUpdate }) => {
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Fetch assignments from Supabase
    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('assignments')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;

            if (data) {
                // Map DB columns (snake_case) to TypeScript interface (camelCase)
                const mappedAssignments: Assignment[] = data.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    className: item.class_name,
                    subject: item.subject,
                    dueDate: item.due_date,
                    totalStudents: item.total_students || 0,
                    submissionsCount: item.submissions_count || 0
                }));
                setAssignments(mappedAssignments);
            }
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [forceUpdate]); // Re-fetch when forceUpdate changes

    const handleAssignmentAdded = (newAssignmentData: Omit<Assignment, 'id'>) => {
        // Optimistic update or simple re-fetch
        setSuccessMessage('Assignment added successfully!');
        fetchAssignments();
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