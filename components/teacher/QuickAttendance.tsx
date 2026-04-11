import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Users, Send } from 'lucide-react';
import { getCachedRoster, submitBulkAttendance, AttendanceStatus } from '../../lib/attendance-service';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useCallback } from 'react';

export const QuickAttendance: React.FC<{ classId: string }> = ({ classId }) => {
    const { currentSchool } = useAuth();
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [showSuccess, setShowSuccess] = useState(false);

    const load = useCallback(async () => {
        const roster = await getCachedRoster(classId);
        setStudents(roster);
        // Default ALL to present
        setAttendance(Object.fromEntries(roster.map((s: any) => [s.id, 'present'])));
    }, [classId]);

    useEffect(() => {
        load();
    }, [load]);

    useAutoSync(['students', 'enrollments'], load);

    const toggleStatus = (studentId: string) => {
        setAttendance(prev => {
            const current = prev[studentId];
            let next: AttendanceStatus = 'present';
            if (current === 'present') next = 'late';
            else if (current === 'late') next = 'absent';
            return { ...prev, [studentId]: next };
        });
    };

    const handleSubmit = async () => {
        if (!currentSchool) return;
        
        const records = students.map(s => ({
            student_id: s.id,
            status: attendance[s.id],
            school_id: currentSchool.id,
            date: new Date().toISOString().split('T')[0]
        }));

        await submitBulkAttendance(records);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    return (
        <div className="relative bg-gray-50 min-h-screen pb-24">
            {/* Success Flash */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-emerald-500/20 backdrop-blur-sm pointer-events-none flex items-center justify-center"
                    >
                        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-full shadow-2xl">
                            <Check className="w-16 h-16 text-emerald-500" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="p-4 flex justify-between items-center bg-white border-b sticky top-0 z-10">
                <div>
                    <h2 className="font-bold text-lg">Class Attendance</h2>
                    <p className="text-xs text-gray-500">{students.length} Students • Default: Present</p>
                </div>
                <button 
                    onClick={() => setAttendance(Object.fromEntries(students.map(s => [s.id, 'present'])))}
                    className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full"
                >
                    RESET ALL
                </button>
            </div>

            <div className="p-4 space-y-3">
                {students.map((student) => {
                    const status = attendance[student.id];
                    return (
                        <motion.div 
                            key={student.id}
                            onClick={() => toggleStatus(student.id)}
                            className={`p-4 rounded-2xl flex items-center justify-between transition-colors border-2 cursor-pointer ${
                                status === 'present' ? 'bg-white border-transparent' : 
                                status === 'late' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                                    {student.avatar_url && <img src={student.avatar_url} alt="" />}
                                </div>
                                <span className="font-bold text-gray-800">{student.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {status === 'present' && <Check className="w-6 h-6 text-emerald-500" />}
                                {status === 'late' && <div className="flex items-center gap-1.5 text-amber-600 font-bold text-sm"><Clock className="w-5 h-5"/> LATE</div>}
                                {status === 'absent' && <div className="flex items-center gap-1.5 text-red-600 font-bold text-sm"><X className="w-5 h-5"/> ABSENT</div>}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Float Action Button */}
            <div className="fixed bottom-6 left-4 right-4">
                <button 
                    onClick={handleSubmit}
                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Send className="w-5 h-5" />
                    SUBMIT ATTENDANCE
                </button>
            </div>
        </div>
    );
};
