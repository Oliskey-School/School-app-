import React, { useMemo } from 'react';
import { StudentsIcon, ChevronRightIcon, gradeColors } from '../../constants';
import { useRealtime } from '../../lib/useRealtime';
import { ClassInfo } from '../../types';

interface AdminSelectClassForReportProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AdminSelectClassForReport: React.FC<AdminSelectClassForReportProps> = ({ navigateTo }) => {
    // Enable Real-time updates for classes
    const { data: rawClasses, loading: isLoading } = useRealtime<any>('classes', '*', 'grade');

    // Mapped data to ensure compatibility with UI components expecting camelCase
    const classes: ClassInfo[] = useMemo(() => {
        return rawClasses.map(c => ({
            id: c.id,
            subject: c.subject,
            grade: c.grade,
            section: c.section,
            department: c.department,
            studentCount: c.student_count || 0
        }));
    }, [rawClasses]);

    // Group classes by Grade
    const groupedClasses = React.useMemo(() => {
        const groups: { [key: number]: ClassInfo[] } = {};
        classes.forEach(cls => {
            if (!groups[cls.grade]) {
                groups[cls.grade] = [];
            }
            groups[cls.grade].push(cls);
        });
        return groups;
    }, [classes]);

    if (isLoading && classes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading live data...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-200">
                    <h3 className="font-bold text-lg text-indigo-800">Select a Class</h3>
                    <p className="text-sm text-indigo-700">Choose a class to view student report cards.</p>
                </div>

                {Object.keys(groupedClasses).length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No classes found.</p>
                    </div>
                )}

                {Object.keys(groupedClasses).sort((a, b) => Number(a) - Number(b)).map(gradeStr => {
                    const grade = Number(gradeStr);
                    const gradeClasses = groupedClasses[grade];
                    const gradeColorClass = gradeColors[grade] || 'bg-gray-200 text-gray-800';
                    const [bgColor, textColor] = gradeColorClass.split(' ');

                    return (
                        <div key={grade} className={`bg-white rounded-2xl shadow-sm overflow-hidden`}>
                            <div className={`${bgColor} p-4`}>
                                <h3 className={`font-bold text-lg ${textColor}`}>Grade {grade}</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {gradeClasses.map(cls => (
                                    <button
                                        key={cls.id}
                                        onClick={() => navigateTo('studentListForReport', `Reports: Grade ${grade}${cls.section}`, { classInfo: cls })}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                                        aria-label={`View reports for Grade ${grade} Section ${cls.section} - ${cls.subject}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                <StudentsIcon className={`h-5 w-5 ${textColor}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-800">Section {cls.section}</p>
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{cls.subject}</span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {cls.department ? `${cls.department} • ` : ''}
                                                    {cls.studentCount} Students
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-gray-400">
                                            <ChevronRightIcon />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </main>
        </div>
    );
};

export default AdminSelectClassForReport;
