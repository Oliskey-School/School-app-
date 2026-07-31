import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { CalendarIcon, EyeIcon, EditIcon, PlusIcon, CheckCircleIcon, ClockIcon, TIMETABLE_PERIODS, TIMETABLE_DOW } from '../../constants';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import CenteredLoader from '../ui/CenteredLoader';


interface TimetableOverviewProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId?: string;
    currentBranchId?: string | null;
}

interface ClassTimetable {
    className: string;
    status: 'Draft' | 'Published';
    totalPeriods: number;
    lastUpdated: string;
}

const TimetableOverview: React.FC<TimetableOverviewProps> = ({ navigateTo, schoolId, currentBranchId }) => {
    const [timetables, setTimetables] = useState<ClassTimetable[]>([]);
    const [loading, setLoading] = useState(true);
    // New state for Level Filter
    const [levelFilter, setLevelFilter] = useState<'Junior' | 'Senior'>('Junior');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

    useEffect(() => {
        fetchTimetables();
    }, [schoolId, currentBranchId]);

    const fetchTimetables = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            // Fetch classes to know their levels - Hybrid API for demo mode
            const classesData = await api.getClasses(schoolId, (currentBranchId && currentBranchId !== 'all') ? currentBranchId : undefined);

            const classLevelMap = new Map<string, string>();
            classesData?.forEach((c: any) => classLevelMap.set(c.name, c.level));

            const data = await api.getTimetables(schoolId, (currentBranchId && currentBranchId !== 'all') ? currentBranchId : undefined);

            if (data) {
                // Group by class name
                const grouped = data.reduce((acc: any, entry: any) => {
                    const className = entry.class_name || 'Unknown Class';
                    // Skip if we don't know the class level (optional safety)
                    const level = classLevelMap.get(className) || 'Junior'; // Default to Junior if unknown, or handle otherwise

                    if (!acc[className]) {
                        acc[className] = {
                            className,
                            level,
                            status: entry.status || 'Draft',
                            totalPeriods: 0,
                            lastUpdated: entry.updated_at || new Date().toISOString(),
                        };
                    }
                    acc[className].totalPeriods += 1;

                    // Update timestamp
                    if (entry.updated_at && new Date(entry.updated_at) > new Date(acc[className].lastUpdated)) {
                        acc[className].lastUpdated = entry.updated_at;
                    }
                    return acc;
                }, {});

                // Also add empty classes that have no timetable yet? 
                // For now, let's just show classes that have at least one entry OR 
                // we should actually fetch ALL classes and show empty states. 
                // Let's merge with all classes to ensure we can create for them.
                classesData?.forEach((c: any) => {
                    if (!grouped[c.name]) {
                        grouped[c.name] = {
                            className: c.name,
                            level: c.level,
                            status: 'Draft',
                            totalPeriods: 0,
                            lastUpdated: new Date().toISOString()
                        };
                    }
                });

                setTimetables(Object.values(grouped));
            }
        } catch (error) {
            console.error('Error fetching timetables:', error);
            toast.error('Failed to load timetables');
        } finally {
            setLoading(false);
        }
    };

    useAutoSync(['classes', 'timetables'], fetchTimetables);

    const filteredTimetables = timetables.filter(tt => {
        // First filter by Level
        if ((tt as any).level !== levelFilter) return false;

        // Then filter by Status
        if (statusFilter === 'all') return true;
        return tt.status?.toLowerCase() === statusFilter;
    });

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (loading) {
        return <CenteredLoader className="h-full" />;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 lg:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Timetable Management</h2>
                        <p className="text-gray-600 text-sm mt-1">Manage schedules for Junior and Senior Secondary</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigateTo('timetableGenerator', 'Generate Timetable')}
                        className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>Create New Timetable</span>
                    </motion.button>
                </div>

                {/* Level Tabs (Main Switch) */}
                <div className="flex items-center space-x-8 mt-6 border-b border-gray-200">
                    {['Junior', 'Senior'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setLevelFilter(level as 'Junior' | 'Senior')}
                            className={`pb-3 text-sm font-bold transition-all relative ${levelFilter === level ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {level} Secondary
                            {levelFilter === level && (
                                <motion.span layoutId="timetableLevelTab" className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Sub-Filters (Status) */}
                <div className="flex space-x-2 mt-4">
                    {['all', 'published', 'draft'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${statusFilter === s
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6">
                {filteredTimetables.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border-2 border-dashed border-gray-300">
                        <CalendarIcon className="w-16 h-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No {levelFilter} Classes Found</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            Initialize your database with classes first.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTimetables.map((tt, ti) => (
                            <motion.div
                                key={tt.className}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: Math.min(ti, 15) * 0.04 }}
                                whileHover={{ y: -2 }}
                                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow duration-200 group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2.5 rounded-lg ${(tt.className || '').includes('SS') ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <CalendarIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{tt.className}</h3>
                                            <p className="text-sm text-gray-500">{tt.totalPeriods} periods scheduled</p>
                                        </div>
                                    </div>
                                    <span
                                        className={`px-3 py-1 text-xs font-bold rounded-full ${tt.status === 'Published'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-amber-100 text-amber-800'
                                            }`}
                                    >
                                        {tt.status}
                                    </span>
                                </div>

                                <div className="mb-4 pb-4 border-b border-gray-100">
                                    <p className="text-xs text-gray-500">
                                        Last updated: <span className="font-medium text-gray-700">{formatDate(tt.lastUpdated)}</span>
                                    </p>
                                </div>

                                <div className="flex space-x-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                // Fetch timetable entries via REST API (replaces legacy api.from('timetable') shim)
                                                const entries = await api.getTimetable(
                                                    (currentBranchId && currentBranchId !== 'all') ? currentBranchId : undefined,
                                                    tt.className
                                                );

                                                const schedule: any = {};
                                                const teacherAssignments: any = {};
                                                let classroomId: string | undefined;

                                                // Resolve teacher IDs → names via REST teachers endpoint
                                                const teacherIds = Array.from(new Set((entries || []).map((e: any) => e.teacher_id).filter(Boolean)));
                                                const teacherMap = new Map<string, string>();
                                                if (teacherIds.length > 0 && schoolId) {
                                                    const teachers = await api.getTeachers(schoolId);
                                                    (teachers || []).forEach((t: any) => teacherMap.set(String(t.id), t.full_name || t.name || ''));
                                                }

                                                (entries || []).forEach((e: any) => {
                                                    const dayName = TIMETABLE_DOW[e.day_of_week as number];
                                                    if (!dayName) return;
                                                    const periodIdx = TIMETABLE_PERIODS.findIndex(p => p.start === e.start_time);
                                                    if (periodIdx === -1) return;
                                                    const key = `${dayName}-${periodIdx}`;
                                                    schedule[key] = e.subject;
                                                    if (e.teacher_id) {
                                                        teacherAssignments[key] = teacherMap.get(String(e.teacher_id)) || '';
                                                    }
                                                    if (e.classroom_id && !classroomId) {
                                                        classroomId = e.classroom_id;
                                                    }
                                                });

                                                navigateTo('timetableEditor', `Edit ${tt.className}`, {
                                                    timetableData: {
                                                        className: tt.className,
                                                        schedule,
                                                        teacherAssignments,
                                                        classroomId,
                                                        status: tt.status
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
                                        <span>Manage</span>
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimetableOverview;
