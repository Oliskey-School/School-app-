import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { ChevronRightIcon, getFormattedClassName } from '../../constants';

interface ClassAttendanceSummary {
    grade: number;
    section: string;
    present: number;
    total: number;
    status: 'Submitted' | 'Pending';
}

interface AttendanceOverviewScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId?: string;
    currentBranchId?: string | null;
}

const AttendanceOverviewScreen: React.FC<AttendanceOverviewScreenProps> = ({ navigateTo, schoolId, currentBranchId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState<ClassAttendanceSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, percentage: 0 });

    useEffect(() => {
        if (schoolId) fetchAttendanceData();
    }, [selectedDate, schoolId, currentBranchId]);

    const fetchAttendanceData = async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            // 1. Fetch all classes scoped to the current school and branch
            let classesQuery = supabase.from('classes').select('id, name, grade, section').eq('school_id', schoolId);
            if (currentBranchId && currentBranchId !== 'all') {
                classesQuery = classesQuery.eq('branch_id', currentBranchId);
            }
            const { data: classesData } = await classesQuery.order('grade');

            // 2. Fetch attendance for the selected date using Hybrid API
            const attendanceRecords = await api.getAttendanceByDate(schoolId, selectedDate);

            // 3. Fetch all students to match with classes, scoped by branch
            const allStudents = await api.getStudents(schoolId, currentBranchId || undefined);

            const processedData: ClassAttendanceSummary[] = [];

            if (classesData && allStudents) {
                for (const cls of classesData) {
                    const classStudents = allStudents.filter((s: any) => s.grade === cls.grade && s.section === cls.section);
                    const studentIds = classStudents.map((s: any) => s.id);

                    const classRecords = (attendanceRecords || []).filter((r: any) => studentIds.includes(r.student_id));
                    const presentCount = classRecords.filter((r: any) => r.status === 'Present' || r.status === 'Late').length;

                    processedData.push({
                        grade: cls.grade,
                        section: cls.section,
                        present: presentCount,
                        total: classStudents.length,
                        status: classRecords.length > 0 ? 'Submitted' : 'Pending'
                    });
                }
            }

            setAttendanceData(processedData);

            // Calc stats
            const totalP = (attendanceRecords || []).filter((r: any) => r.status === 'Present').length;
            const totalA = (attendanceRecords || []).filter((r: any) => r.status === 'Absent').length;
            const totalL = (attendanceRecords || []).filter((r: any) => r.status === 'Late').length;
            const totalRecorded = (attendanceRecords || []).length;

            setStats({
                present: totalP,
                absent: totalA,
                late: totalL,
                percentage: totalRecorded > 0 ? Math.round(((totalP + totalL) / totalRecorded) * 100) : 0
            });

        } catch (error) {
            console.error('Error fetching attendance overview:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
                <div>
                    <label htmlFor="attendance-date" className="block text-sm font-medium text-gray-700">Select Date</label>
                    <input
                        type="date"
                        id="attendance-date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="mt-1 p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Daily Average</p>
                    <p className="text-xl font-bold text-indigo-600">{stats.percentage}%</p>
                </div>
            </div>

            <div className="flex-grow p-4 space-y-3 overflow-y-auto">
                {loading ? <div className="text-center p-10 text-gray-500">Loading attendance data...</div> : (
                    <>
                        {attendanceData.length === 0 && <div className="text-center p-10 text-gray-500">No classes found</div>}
                        {attendanceData.map((item, idx) => (
                            <button
                                key={`${item.grade}-${item.section}`}
                                onClick={() => navigateTo('classAttendanceDetail', getFormattedClassName(item.grade, item.section), { classInfo: item })}
                                className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:ring-2 hover:ring-indigo-300 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">{getFormattedClassName(item.grade, item.section)}</h3>
                                        <p className="text-sm text-gray-500">{item.present}/{item.total} Present</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${item.status === 'Submitted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {item.status}
                                        </span>
                                        <ChevronRightIcon className="text-gray-400" />
                                    </div>
                                </div>
                            </button>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};

export default AttendanceOverviewScreen;
