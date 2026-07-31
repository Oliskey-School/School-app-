import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { StudentsIcon, ChevronRightIcon, gradeColors, getFormattedClassName } from '../../constants';
import { ClassInfo } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import CenteredLoader from '../ui/CenteredLoader';

interface AdminResultsEntrySelectorProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    schoolId?: string;
    currentBranchId?: string;
}

const AdminResultsEntrySelector: React.FC<AdminResultsEntrySelectorProps> = ({ navigateTo, schoolId, currentBranchId }) => {
    const { data: rawClasses = [], isLoading } = useQuery({
        queryKey: ['classes', schoolId, currentBranchId],
        queryFn: () => api.getClasses(schoolId!, currentBranchId === 'all' ? undefined : currentBranchId),
        enabled: !!schoolId
    });

    useAutoSync(['classes'], () => {
        console.log('🔄 [ResultsEntrySelector] Auto-sync triggered');
    });

    const classes: ClassInfo[] = useMemo(() => {
        return rawClasses
            .filter(c => {
                const sMatch = !schoolId || c.school_id === schoolId;
                const bMatch = !currentBranchId || currentBranchId === 'all' || c.branch_id === currentBranchId || !c.branch_id;
                return sMatch && bMatch;
            })
            .map(c => ({
                id: c.id,
                // Real class name (classes have no subject column — the gradebook
                // offers the class's assigned subjects when subject is absent)
                name: (c as any).name,
                subject: c.subject,
                // Admin-assigned subjects for this class (from the class form)
                subjects: (c as any).subjects,
                grade: c.grade,
                section: c.section,
                department: c.department,
                studentCount: c.student_count || 0
            } as ClassInfo & { name?: string; subjects?: any[] }));
    }, [rawClasses, schoolId, currentBranchId]);

    const groupedClasses = useMemo(() => {
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

        // Convert Map to Array
        const finalGroups: { [key: number]: ClassInfo[] } = {};
        Object.entries(groups).forEach(([grade, map]) => {
            finalGroups[Number(grade)] = Array.from(map.values());
        });
        return finalGroups;
    }, [classes]);

    if (isLoading && classes.length === 0) {
        return <CenteredLoader message="Loading classes..." className="h-full" />;
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="bg-cyan-50 p-4 rounded-xl text-center border border-cyan-200">
                    <h3 className="font-bold text-lg text-cyan-800">Results Entry Selection</h3>
                    <p className="text-sm text-cyan-700">Choose a class to enter student academic results.</p>
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
                        <motion.div key={grade} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(gi, 10) * 0.05 }} className={`bg-white rounded-2xl shadow-sm overflow-hidden mb-4`}>
                            <div className={`${bgColor} p-4`}>
                                <h3 className={`font-bold text-lg ${textColor}`}>{getFormattedClassName(grade, "")}</h3>
                            </div>
                            <div className="p-4 space-y-3">
                                {gradeClasses.map(cls => (
                                    <motion.button
                                        key={getFormattedClassName(grade, cls.section)}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => navigateTo('classGradebook', `Gradebook: ${getFormattedClassName(grade, cls.section, true, cls.subject)}`, { classInfo: cls })}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                                                <StudentsIcon className={`h-5 w-5 ${textColor}`} />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-800">{getFormattedClassName(grade, cls.section)}</p>
                                                    {cls.subject && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{cls.subject}</span>}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    {cls.studentCount} Students recorded
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

export default AdminResultsEntrySelector;
