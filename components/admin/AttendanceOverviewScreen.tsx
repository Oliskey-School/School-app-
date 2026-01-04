import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronRightIcon } from '../../constants';
// Removed CheckCircleIcon import if unused, or keep it.
// Removed mock data imports

interface ClassAttendanceSummary {
    grade: number;
    section: string;
    present: number;
    total: number;
    status: 'Submitted' | 'Pending'; // In real app, check if date exists in DB
}

interface AttendanceRecord {
    id: number;
    student_id: number;
    date: string;
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    class_id?: string; // We used text type for this in recent fix
}

interface AttendanceOverviewScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AttendanceOverviewScreen: React.FC<AttendanceOverviewScreenProps> = ({ navigateTo }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState<ClassAttendanceSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, percentage: 0 });

    useEffect(() => {
        fetchAttendanceData();
    }, [selectedDate]);

    const fetchAttendanceData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all classes to ensure we list everyone
            const { data: classesData } = await supabase
                .from('classes')
                .select('grade, section')
                .order('grade')
                .order('section');

            // 2. Fetch attendance for the selected date
            const { data: attendanceRecords } = await supabase
                .from('attendance')
                .select('*')
                .eq('date', selectedDate);

            // 3. Process data
            const summary: ClassAttendanceSummary[] = (classesData || []).map((cls: any) => {
                // Filter records for this class. 
                // Note: Our attendance table uses class_id (text) storing "Grade XSection Y" or similar, 
                // OR we join with students. Let's assume we filter by student-class link if needed, 
                // but simpler if attendance has class_id as expected.
                // Based on recent fixes, attendance has class_id as TEXT.
                // Let's assume class_id format matches "Grade {grade}{section}" or similar?
                // Actually, let's look for records where status is present/absent.

                // Better approach: Join with students to get grade/section if class_id is ambiguous, 
                // but for now, let's filter the fetched records.
                // Wait, the recent fix made class_id TEXT. Let's assume it stores the primary key of classes table?
                // But classes.id is BIGINT. The fix made attendance.class_id TEXT to avoid mismatch.
                // So it likely stores the string ID if it was a UUID, OR it stores the string representation?
                // Let's rely on matching student data if needed, but let's try matching class_id first.

                // Fallback: If attendance records have student_id, and students have grade/section.
                // Since we don't have a huge DB, let's fetch students too.
                return {
                    grade: cls.grade,
                    section: cls.section,
                    present: 0, // Placeholder until complex join logic is perfect
                    total: 0,
                    status: 'Pending'
                };
            });

            // refined implementation:
            // Fetch students to count total per class
            const { data: allStudents } = await supabase.from('students').select('id, grade, section');

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
            console.error(error);
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
                                onClick={() => navigateTo('classAttendanceDetail', `Grade ${item.grade}${item.section}`, { classInfo: item })}
                                className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:ring-2 hover:ring-indigo-300 transition-all"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800">Grade {item.grade}{item.section}</h3>
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
