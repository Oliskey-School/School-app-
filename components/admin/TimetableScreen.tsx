import React, { useState, useEffect } from 'react';
import { CalendarIcon, EyeIcon, EditIcon, PlusIcon, CheckCircleIcon, ClockIcon } from '../../constants';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface TimetableOverviewProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

interface ClassTimetable {
    className: string;
    status: 'Draft' | 'Published';
    totalPeriods: number;
    lastUpdated: string;
}

const TimetableOverview: React.FC<TimetableOverviewProps> = ({ navigateTo }) => {
    const [timetables, setTimetables] = useState<ClassTimetable[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

    useEffect(() => {
        fetchTimetables();
    }, []);

    const fetchTimetables = async () => {
        setLoading(true);
        try {
            // Get all timetable entries groups
            // Since we need to aggregate by class, we can select distinct class_names or just fetch all and reduce.
            // Fetching all might be heavy if lots of data, but for now it's fine.
            const { data, error } = await supabase
                .from('timetable')
                .select('class_name, updated_at');

            if (error) throw error;

            if (data) {
                // Group by class name
                const grouped = data.reduce((acc: any, entry: any) => {
                    const className = entry.class_name;
                    if (!acc[className]) {
                        acc[className] = {
                            className,
                            status: 'Published', // Assume published if in DB
                            totalPeriods: 0,
                            lastUpdated: entry.updated_at || new Date().toISOString(),
                        };
                    }
                    acc[className].totalPeriods += 1; // Count periods (entries)

                    // Use the most recent update time
                    if (entry.updated_at && new Date(entry.updated_at) > new Date(acc[className].lastUpdated)) {
                        acc[className].lastUpdated = entry.updated_at;
                    }
                    return acc;
                }, {});

                setTimetables(Object.values(grouped));
            }
        } catch (error) {
            console.error('Error fetching timetables:', error);
            toast.error('Failed to load timetables');
        } finally {
            setLoading(false);
        }
    };

    const filteredTimetables = timetables.filter(tt => {
        if (filter === 'all') return true;
        return tt.status.toLowerCase() === filter;
    });

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Timetable Management</h2>
                        <p className="text-gray-600 text-sm mt-1">Create, edit, and publish class timetables</p>
                    </div>
                    <button
                        onClick={() => navigateTo('timetableGenerator', 'Generate Timetable')}
                        className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Create New Timetable</span>
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex space-x-2 mt-4 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filter === 'all'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        All ({timetables.length})
                    </button>
                    <button
                        onClick={() => setFilter('published')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filter === 'published'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Published ({timetables.filter(t => t.status === 'Published').length})
                    </button>
                    <button
                        onClick={() => setFilter('draft')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filter === 'draft'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                            }`}
                    >
                        Drafts ({timetables.filter(t => t.status === 'Draft').length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                {filteredTimetables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-dashed border-gray-300">
                        <CalendarIcon className="w-16 h-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Timetables Found</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            {filter === 'all'
                                ? 'Get started by creating your first timetable'
                                : `No ${filter} timetables available`
                            }
                        </p>
                        {filter === 'all' && (
                            <button
                                onClick={() => navigateTo('timetableGenerator', 'Generate Timetable')}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                            >
                                Create Timetable
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTimetables.map((tt) => (
                            <div
                                key={tt.className}
                                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-200 group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2.5 bg-indigo-100 rounded-lg">
                                            <CalendarIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{tt.className}</h3>
                                            <p className="text-sm text-gray-500">{tt.totalPeriods} periods/week</p>
                                        </div>
                                    </div>
                                    <span
                                        className={`px-3 py-1 text-xs font-bold rounded-full ${tt.status === 'Published'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-amber-100 text-amber-800'
                                            }`}
                                    >
                                        {tt.status === 'Published' ? (
                                            <span className="flex items-center space-x-1">
                                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                                <span>Published</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center space-x-1">
                                                <ClockIcon className="w-3.5 h-3.5" />
                                                <span>Draft</span>
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className="mb-4 pb-4 border-b border-gray-100">
                                    <p className="text-xs text-gray-500">
                                        Last updated: <span className="font-medium text-gray-700">{formatDate(tt.lastUpdated)}</span>
                                    </p>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => {
                                            // Navigate to view mode (you can create a view-only component)
                                            console.log('View timetable for', tt.className);
                                        }}
                                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-semibold"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                        <span>View</span>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            // Fetch data for this class
                                            try {
                                                const { data: entries, error } = await supabase
                                                    .from('timetable')
                                                    .select('*')
                                                    .eq('class_name', tt.className);

                                                if (error) throw error;

                                                // Reconstruct the internal format for the Editor
                                                const schedule: any = {};
                                                const teacherAssignments: any = {};
                                                const teacherIds = new Set(entries.map((e: any) => e.teacher_id).filter(Boolean));

                                                // Fetch teacher names
                                                let teacherMap = new Map();
                                                if (teacherIds.size > 0) {
                                                    const { data: teachers } = await supabase.from('teachers').select('id, name').in('id', Array.from(teacherIds));
                                                    if (teachers) {
                                                        teachers.forEach((t: any) => teacherMap.set(t.id, t.name));
                                                    }
                                                }

                                                entries.forEach((e: any) => {
                                                    const key = `${e.day_of_week}-${e.period_index}`;
                                                    schedule[key] = e.subject;
                                                    if (e.teacher_id) {
                                                        teacherAssignments[key] = teacherMap.get(e.teacher_id);
                                                    }
                                                });

                                                navigateTo('timetableEditor', 'Edit Timetable', {
                                                    timetableData: {
                                                        className: tt.className,
                                                        schedule,
                                                        teacherAssignments
                                                    }
                                                });

                                            } catch (err) {
                                                console.error("Error loading timetable:", err);
                                                toast.error("Could not load timetable");
                                            }
                                        }}
                                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                                    >
                                        <EditIcon className="w-4 h-4" />
                                        <span>Edit</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableOverview;
