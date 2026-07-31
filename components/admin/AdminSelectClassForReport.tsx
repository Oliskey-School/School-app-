import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { StudentsIcon, ChevronRightIcon, gradeColors, getFormattedClassName } from '../../constants';
import { ClassInfo } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useAuth } from '../../context/AuthContext';
import CenteredLoader from '../ui/CenteredLoader';

interface AdminSelectClassForReportProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId?: string;
    currentBranchId?: string;
}

const AdminSelectClassForReport: React.FC<AdminSelectClassForReportProps> = ({ navigateTo, schoolId: propSchoolId, currentBranchId }) => {
    const { currentSchool } = useAuth();
    const schoolId = propSchoolId || currentSchool?.id;

    // Enable React Query for classes instead of legacy useRealtime
    const { data: rawClasses = [], isLoading } = useQuery({
        queryKey: ['classes', schoolId, currentBranchId],
        queryFn: () => api.getClasses(schoolId!, currentBranchId === 'all' ? undefined : currentBranchId),
        enabled: !!schoolId
    });

    useAutoSync(['classes'], () => {
        console.log('🔄 [SelectClassForReport] Auto-sync triggered');
    });

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

    // Group classes by Grade and Deduplicate by Formatted Name
    const groupedClasses = React.useMemo(() => {
        const groups: { [key: number]: Map<string, ClassInfo> } = {};
        classes.forEach(cls => {
            if (!groups[cls.grade]) {
                groups[cls.grade] = new Map();
            }
            const name = getFormattedClassName(cls.grade, cls.section);
            const existing = groups[cls.grade].get(name);
            if (existing) {
                existing.studentCount += (cls.studentCount || 0);
            } else {
                groups[cls.grade].set(name, { ...cls });
            }
        });

        // Convert Map to Array for mapping
        const finalGroups: { [key: number]: ClassInfo[] } = {};
        Object.entries(groups).forEach(([grade, map]) => {
            finalGroups[Number(grade)] = Array.from(map.values());
        });
        return finalGroups;
    }, [classes]);

    if (isLoading && classes.length === 0) {
        return <CenteredLoader message="Loading live data..." className="h-full" />;
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

                {Object.keys(groupedClasses).sort((a, b) => Number(a) - Number(b)).map((gradeStr, gi) => {
                    const grade = Number(gradeStr);
                    const gradeClasses = groupedClasses[grade];
                    const gradeColorClass = gradeColors[grade] || 'bg-gray-200 text-gray-800';
                    const [bgColor, textColor] = gradeColorClass.split(' ');

                    return (
                        <motion.div key={grade} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(gi, 10) * 0.05 }} className={`bg-white rounded-2xl shadow-sm overflow-hidden`}>
                            <div className={`${bgColor} p-4`}>
                                <h3 className={`font-bold text-lg ${textColor}`}>{getFormattedClassName(grade, "")}</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {gradeClasses.map(cls => (
                                    <motion.button
                                        key={getFormattedClassName(grade, cls.section)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => navigateTo('studentListForReport', `Reports: ${getFormattedClassName(grade, cls.section)}`, { classInfo: { ...cls, section: undefined } })}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                                        aria-label={`View reports for ${getFormattedClassName(grade, cls.section)} - ${cls.subject}`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                <StudentsIcon className={`h-5 w-5 ${textColor}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-800">{getFormattedClassName(grade, cls.section)}</p>
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
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </main>
        </div>
    );
};

export default AdminSelectClassForReport;
