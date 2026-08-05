import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import { Calendar, Download, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import CenteredLoader from '../ui/CenteredLoader';

interface HeatmapData {
    date: string;
    class_id: string;
    class_name: string;
    attendance_percentage: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    total_students: number;
    absence_pattern: string;
}

interface Class {
    id: string;
    class_name: string;
}

interface AttendanceHeatmapProps {
    schoolId?: string;
}

const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({ schoolId }) => {
    const { currentBranchId } = useAuth();
    const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | 'all'>('all');
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        averageAttendance: 0,
        trend: 'stable' as 'up' | 'down' | 'stable',
        trendPercentage: 0,
        criticalDays: 0
    });

    useEffect(() => {
        fetchHeatmapData();
    }, [selectedClass, dateRange, viewMode, currentBranchId]);

    // Returns the fetched list directly (not just via setState) so the caller
    // can use it immediately — waiting on the next render for `classes` to
    // update caused every class name to resolve as "Unknown" the first time
    // this screen loaded.
    const fetchClasses = async (): Promise<Class[]> => {
        if (!schoolId) return [];
        try {
            const data = await api.getClasses(schoolId, (currentBranchId && currentBranchId !== 'all') ? currentBranchId : undefined);
            const mapped: Class[] = (data || []).map((c: any) => ({ id: c.id, class_name: c.name }));
            setClasses(mapped);
            return mapped;
        } catch (error: any) {
            console.error('Error fetching classes:', error);
            return [];
        }
    };

    useAutoSync(['classes'], fetchClasses);

    const fetchHeatmapData = async () => {
        if (!schoolId) return;
        try {
            setLoading(true);

            const classList = await fetchClasses();

            // First fetch all students for this school/branch to get their IDs
            const students = await api.getStudents({ schoolId, branchId: currentBranchId || undefined });
            const studentIds = students.map((s: any) => s.id);

            if (studentIds.length === 0) {
                setHeatmapData([]);
                calculateStats([]);
                return;
            }

            const data = await api.bulkFetchAttendance(
                studentIds,
                dateRange.start,
                dateRange.end,
                currentBranchId || undefined
            );

            // Process data to create heatmap
            const processedData = processAttendanceData(data || [], classList);
            setHeatmapData(processedData);
            calculateStats(processedData);

        } catch (error: any) {
            console.error('Error fetching heatmap data:', error);
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    };

    const processAttendanceData = (rawData: any[], classList: Class[]): HeatmapData[] => {
        const classNameById = new Map(classList.map(c => [c.id, c.class_name]));
        const dataByClassAndDate: { [key: string]: HeatmapData } = {};

        rawData.forEach(record => {
            // The record carries class_id directly (Attendance.class_id) —
            // there is no nested `students.classes` shape on this endpoint.
            const classId: string | undefined = record.class_id;
            if (!classId) return;
            if (selectedClass !== 'all' && classId !== selectedClass) return;

            const className = classNameById.get(classId) || 'Unknown';
            // Normalize to YYYY-MM-DD: Prisma serializes `date` as a full ISO
            // timestamp, and comparing/sorting raw ISO strings across rows is
            // fine, but re-parsing them for display is safer without the time part.
            const date = String(record.date).slice(0, 10);
            const key = `${classId}-${date}`;

            if (!dataByClassAndDate[key]) {
                dataByClassAndDate[key] = {
                    date,
                    class_id: classId,
                    class_name: className,
                    attendance_percentage: 0,
                    present_count: 0,
                    absent_count: 0,
                    late_count: 0,
                    total_students: 0,
                    absence_pattern: 'normal'
                };
            }

            dataByClassAndDate[key].total_students++;

            // Status casing isn't consistent in the data ("Present", "present"
            // both occur depending on which flow wrote the record) — compare
            // lowercased so real attendance isn't silently miscounted as 0%.
            const status = String(record.status || '').toLowerCase();
            if (status === 'present') {
                dataByClassAndDate[key].present_count++;
            } else if (status === 'absent') {
                dataByClassAndDate[key].absent_count++;
            } else if (status === 'late') {
                dataByClassAndDate[key].late_count++;
            }
        });

        // Calculate percentages and patterns
        return Object.values(dataByClassAndDate).map(item => {
            const percentage = item.total_students > 0
                ? ((item.present_count + item.late_count) / item.total_students) * 100
                : 0;

            return {
                ...item,
                attendance_percentage: Math.round(percentage * 10) / 10,
                absence_pattern: percentage < 70 ? 'critical' : percentage < 85 ? 'high' : 'normal'
            };
        });
    };

    const calculateStats = (data: HeatmapData[]) => {
        if (data.length === 0) {
            setStats({ averageAttendance: 0, trend: 'stable', trendPercentage: 0, criticalDays: 0 });
            return;
        }

        const average = data.reduce((sum, item) => sum + item.attendance_percentage, 0) / data.length;
        const criticalCount = data.filter(item => item.absence_pattern === 'critical').length;

        // Calculate trend (older half of the range vs the more recent half).
        // The backend doesn't guarantee row order, so sort by date first —
        // without this the "trend" was comparing an arbitrary split instead
        // of actually-earlier vs actually-later days.
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        const midpoint = Math.floor(sorted.length / 2);
        const olderHalf = sorted.slice(0, midpoint);
        const recentHalf = sorted.slice(midpoint);
        const olderAvg = olderHalf.reduce((sum, item) => sum + item.attendance_percentage, 0) / Math.max(olderHalf.length, 1);
        const recentAvg = recentHalf.reduce((sum, item) => sum + item.attendance_percentage, 0) / Math.max(recentHalf.length, 1);

        const trendDiff = recentAvg - olderAvg;
        const trend = trendDiff > 2 ? 'up' : trendDiff < -2 ? 'down' : 'stable';

        setStats({
            averageAttendance: Math.round(average * 10) / 10,
            trend,
            trendPercentage: Math.abs(Math.round(trendDiff * 10) / 10),
            criticalDays: criticalCount
        });
    };

    const getColorForPercentage = (percentage: number): string => {
        if (percentage >= 95) return 'bg-green-600';
        if (percentage >= 90) return 'bg-green-500';
        if (percentage >= 85) return 'bg-green-400';
        if (percentage >= 80) return 'bg-yellow-400';
        if (percentage >= 75) return 'bg-orange-400';
        if (percentage >= 70) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Class', 'Total Students', 'Present', 'Absent', 'Late', 'Attendance %', 'Status'];
        const rows = heatmapData.map(item => [
            item.date,
            item.class_name,
            item.total_students,
            item.present_count,
            item.absent_count,
            item.late_count,
            item.attendance_percentage + '%',
            item.absence_pattern
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-heatmap-${dateRange.start}-to-${dateRange.end}.csv`;
        a.click();
        toast.success('Report exported successfully!');
    };

    // Buckets a day into the column it belongs to for the current view mode —
    // one column per day, per week (Sun-start), or per calendar month.
    const getColumn = (dateStr: string, mode: 'daily' | 'weekly' | 'monthly'): { key: string; label: string } => {
        const date = new Date(`${dateStr}T00:00:00`);
        if (mode === 'monthly') {
            // "year: 'numeric'" (not '2-digit') so "Aug 2026" can't be misread
            // as day-26 — "Aug 26" looked like a date, not a year.
            return { key: dateStr.slice(0, 7), label: date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) };
        }
        if (mode === 'weekly') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const key = weekStart.toISOString().split('T')[0];
            return { key, label: `Wk of ${weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}` };
        }
        return { key: dateStr, label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) };
    };

    // Re-aggregates the raw daily rows into the columns the current view mode
    // needs (summing counts, not averaging percentages, so a 5-student and a
    // 50-student day don't count equally toward a weekly/monthly figure).
    const { columns, cellsByKey } = useMemo(() => {
        const cells = new Map<string, { present: number; absent: number; late: number; total: number }>();
        const columnLabels = new Map<string, string>();

        heatmapData.forEach(item => {
            const { key, label } = getColumn(item.date, viewMode);
            columnLabels.set(key, label);
            const cellKey = `${item.class_id}::${key}`;
            const existing = cells.get(cellKey) || { present: 0, absent: 0, late: 0, total: 0 };
            existing.present += item.present_count;
            existing.absent += item.absent_count;
            existing.late += item.late_count;
            existing.total += item.total_students;
            cells.set(cellKey, existing);
        });

        const sortedColumns = Array.from(columnLabels.entries())
            .map(([key, label]) => ({ key, label }))
            .sort((a, b) => b.key.localeCompare(a.key));

        return { columns: sortedColumns, cellsByKey: cells };
    }, [heatmapData, viewMode]);

    const renderHeatmap = () => {
        if (loading) {
            return <CenteredLoader className="py-12" />;
        }

        if (heatmapData.length === 0) {
            return <div className="text-center py-12 text-gray-500">No attendance data for selected period</div>;
        }

        const visibleClasses = selectedClass === 'all' ? classes : classes.filter(c => c.id === selectedClass);

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 p-2 bg-gray-100 sticky left-0 z-10">Class</th>
                            {columns.map(col => (
                                <th key={col.key} className="border border-gray-300 p-2 bg-gray-100 text-xs whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {visibleClasses.map((cls, rowIdx) => (
                            <motion.tr
                                key={cls.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.25, delay: Math.min(rowIdx, 10) * 0.04 }}
                            >
                                <td className="border border-gray-300 p-2 font-semibold sticky left-0 bg-white z-10">
                                    {cls.class_name}
                                </td>
                                {columns.map((col, colIdx) => {
                                    const raw = cellsByKey.get(`${cls.id}::${col.key}`);
                                    const percentage = raw && raw.total > 0
                                        ? Math.round(((raw.present + raw.late) / raw.total) * 1000) / 10
                                        : null;
                                    return (
                                        <motion.td
                                            key={col.key}
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.2, delay: (Math.min(rowIdx, 10) * 0.04) + (Math.min(colIdx, 15) * 0.015) }}
                                            whileHover={raw ? { scale: 1.08, zIndex: 5 } : undefined}
                                            className={`relative border border-gray-300 p-4 text-center cursor-pointer transition-shadow hover:shadow-lg ${percentage !== null ? getColorForPercentage(percentage) : 'bg-gray-200'
                                                }`}
                                            title={raw ? `${percentage}% (${raw.present + raw.late}/${raw.total})` : 'No data'}
                                        >
                                            {percentage !== null && (
                                                <span className="text-white font-bold text-xs">
                                                    {percentage}%
                                                </span>
                                            )}
                                        </motion.td>
                                    );
                                })}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-full mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">📊 Attendance Heatmap</h1>
                <p className="text-indigo-100">Visual attendance patterns across classes and time periods</p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Average Attendance</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.averageAttendance}%</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Calendar className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Trend</p>
                            <div className="flex items-center space-x-2">
                                <p className="text-3xl font-bold text-gray-900">{stats.trendPercentage}%</p>
                                {stats.trend === 'up' ? (
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                ) : stats.trend === 'down' ? (
                                    <TrendingDown className="h-6 w-6 text-red-600" />
                                ) : (
                                    <Minus className="h-6 w-6 text-gray-400" />
                                )}
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${stats.trend === 'up' ? 'bg-green-100' : stats.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <span className="text-2xl">{stats.trend === 'up' ? '📈' : stats.trend === 'down' ? '📉' : '➡️'}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Critical Days</p>
                            <p className="text-3xl font-bold text-red-600">{stats.criticalDays}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <span className="text-3xl">⚠️</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filters */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.12 }} className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value === 'all' ? 'all' : e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">All Classes</option>
                            {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.class_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            max={dateRange.end}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            min={dateRange.start}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-end">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={exportToCSV}
                            disabled={heatmapData.length === 0}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="h-5 w-5" />
                            <span>Export CSV</span>
                        </motion.button>
                    </div>
                </div>

                {/* View mode */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Filter className="h-4 w-4" /> Group by
                    </span>
                    <div className="relative flex p-1 bg-gray-100 rounded-lg">
                        {(['daily', 'weekly', 'monthly'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`relative px-4 py-1.5 text-sm font-semibold rounded-md capitalize transition-colors ${viewMode === mode ? 'text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {viewMode === mode && (
                                    <motion.div
                                        layoutId="heatmapViewMode"
                                        className="absolute inset-0 bg-white rounded-md shadow-sm"
                                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                    />
                                )}
                                <span className="relative">{mode}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Legend */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Attendance Rate Legend:</h3>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-600 rounded"></div>
                        <span className="text-sm text-gray-700">95-100%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-500 rounded"></div>
                        <span className="text-sm text-gray-700">90-94%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-400 rounded"></div>
                        <span className="text-sm text-gray-700">85-89%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded"></div>
                        <span className="text-sm text-gray-700">80-84%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-orange-400 rounded"></div>
                        <span className="text-sm text-gray-700">75-79%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-orange-500 rounded"></div>
                        <span className="text-sm text-gray-700">70-74%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-red-500 rounded"></div>
                        <span className="text-sm text-gray-700">Below 70%</span>
                    </div>
                </div>
            </div>

            {/* Heatmap */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }} className="bg-white rounded-xl shadow-sm p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${viewMode}-${selectedClass}-${dateRange.start}-${dateRange.end}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {renderHeatmap()}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default AttendanceHeatmap;
