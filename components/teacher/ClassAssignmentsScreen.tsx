
import React, { useState, useEffect } from 'react';
import { Assignment } from '../../types';
import { ChevronRightIcon } from '../../constants';
import { supabase } from '../../lib/supabase';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

interface ClassAssignmentsScreenProps {
    className: string;
    navigateTo: (view: string, title: string, props: any) => void;
}

const ClassAssignmentsScreen: React.FC<ClassAssignmentsScreenProps> = ({ className, navigateTo }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAssignments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('assignments')
                .select('*')
                .eq('class_name', className)
                .order('due_date', { ascending: false });

            if (error) throw error;

            if (data) {
                setAssignments(data.map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    description: a.description,
                    className: a.class_name,
                    subject: a.subject,
                    dueDate: a.due_date,
                    totalStudents: a.total_students || 0,
                    submissionsCount: a.submissions_count || 0
                })));
            }
        } catch (err) {
            console.error('Error fetching class assignments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [className]);

    useRealtimeRefresh(['assignments'], fetchAssignments);


    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading assignments...</div>;
    }

    return (
        <div className="p-4 bg-gray-100 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map(assignment => (
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
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {assignments.length === 0 && (
                <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-500">No assignments found for this class.</p>
                </div>
            )}
        </div>
    );
};

export default ClassAssignmentsScreen;