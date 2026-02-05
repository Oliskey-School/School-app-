import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Calendar, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';

interface HeatmapData {
    date: string;
    class_id: number;
    class_name: string;
    attendance_percentage: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    total_students: number;
    absence_pattern: string;
}

interface Class {
    id: number;
    class_name: string;
}

interface AttendanceHeatmapProps {
    schoolId?: string;
}

const AttendanceHeatmap: React.FC<AttendanceHeatmapProps> = ({ schoolId }) => {
    const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
    const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
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
        fetchClasses();
        fetchHeatmapData();
    }, [selectedClass, dateRange, viewMode]);

    const fetchClasses = async () => {
        if (!schoolId) return;
        try {
            const { data, error } = await supabase
                .from('classes')
                .select('id, class_name')
                .eq('school_id', schoolId)
                .order('class_name');

            if (error) throw error;
            setClasses(data || []);
        } catch (error: any) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchHeatmapData = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('attendance_heatmaps')
                .select(`
                    *,
                    classes (class_name)
                `)
                .gte('date', dateRange.start)
                .lte('date', dateRange.end)
                .order('date', { ascending: false });

            if (selectedClass !== 'all') {
                query = query.eq('class_id', selectedClass);
            }

            const { data, error } = await supabase
                .from('student_attendance')
                .select(`
                    date,
                    status,
                    students (
                        class_id,
                        classes (class_name)
                    )
                `)
                .eq('school_id', schoolId)
                .gte('date', dateRange.start)
                .lte('date', dateRange.end);

            if (error) throw error;

            // Process data to create heatmap
            const processedData = processAttendanceData(data || []);
            setHeatmapData(processedData);
            calculateStats(processedData);

        } catch (error: any) {
            console.error('Error fetching heatmap data:', error);
            toast.error('Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    };

    const processAttendanceData = (rawData: any[]): HeatmapData[] => {
        const dataByClassAndDate: { [key: string]: HeatmapData } = {};

        rawData.forEach(record => {
            const classId = record.students?.class_id;
            const className = record.students?.classes?.class_name || 'Unknown';
            const date = record.date;
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

            if (record.status === 'Present') {
                dataByClassAndDate[key].present_count++;
            } else if (record.status === 'Absent') {
                dataByClassAndDate[key].absent_count++;
            } else if (record.status === 'Late') {
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

        // Calculate trend (compare first half vs second half)
        const midpoint = Math.floor(data.length / 2);
        const firstHalf = data.slice(midpoint).reduce((sum, item) => sum + item.attendance_percentage, 0) / Math.max(data.length - midpoint, 1);
        const secondHalf = data.slice(0, midpoint).reduce((sum, item) => sum + item.attendance_percentage, 0) / Math.max(midpoint, 1);

        const trendDiff = secondHalf - firstHalf;
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

    // Group data by week for weekly view
    const groupByWeek = (data: HeatmapData[]) => {
        const weeks: { [key: string]: HeatmapData[] } = {};
        data.forEach(item => {
            const date = new Date(item.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            if (!weeks[weekKey]) weeks[weekKey] = [];
            weeks[weekKey].push(item);
        });
        return weeks;
    };

    const renderHeatmap = () => {
        if (loading) {
            return <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
        }

        if (heatmapData.length === 0) {
            return <div className="text-center py-12 text-gray-500">No attendance data for selected period</div>;
        }

        // Get unique dates
        const uniqueDates = [...new Set(heatmapData.map(item => item.date))].sort().reverse();

        return (
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 p-2 bg-gray-100 sticky left-0 z-10">Class</th>
                            {uniqueDates.map(date => (
                                <th key={date} className="border border-gray-300 p-2 bg-gray-100 text-xs">
                                    {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map(cls => (
                            <tr key={cls.id}>
                                <td className="border border-gray-300 p-2 font-semibold sticky left-0 bg-white z-10">
                                    {cls.class_name}
                                </td>
                                {uniqueDates.map(date => {
                                    const cellData = heatmapData.find(item => item.class_id === cls.id && item.date === date);
                                    return (
                                        <td
                                            key={date}
                                            className={`border border-gray-300 p-4 text-center cursor-pointer hover:opacity-80 transition-opacity ${cellData ? getColorForPercentage(cellData.attendance_percentage) : 'bg-gray-200'
                                                }`}
                                            title={cellData ? `${cellData.attendance_percentage}% (${cellData.present_count}/${cellData.total_students})` : 'No data'}
                                        >
                                            {cellData && (
                                                <span className="text-white font-bold text-xs">
                                                    {cellData.attendance_percentage}%
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-full mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">📊 Attendance Heatmap</h1>
                <p className="text-indigo-100">Visual attendance patterns across classes and time periods</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Average Attendance</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.averageAttendance}%</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Calendar className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Trend</p>
                            <div className="flex items-center space-x-2">
                                <p className="text-3xl font-bold text-gray-900">{stats.trendPercentage}%</p>
                                {stats.trend === 'up' ? (
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                ) : stats.trend === 'down' ? (
                                    <TrendingDown className="h-6 w-6 text-red-600" />
                                ) : null}
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg ${stats.trend === 'up' ? 'bg-green-100' : stats.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <span className="text-2xl">{stats.trend === 'up' ? '📈' : stats.trend === 'down' ? '📉' : '➡️'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Critical Days</p>
                            <p className="text-3xl font-bold text-red-600">{stats.criticalDays}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <span className="text-3xl">⚠️</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value === 'all' ? 'all' : Number(e.target.value))}
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
                        <button
                            onClick={exportToCSV}
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center justify-center space-x-2"
                        >
                            <Download className="h-5 w-5" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>

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
            <div className="bg-white rounded-xl shadow-sm p-6">
                {renderHeatmap()}
            </div>
        </div>
    );
};

export default AttendanceHeatmap;
