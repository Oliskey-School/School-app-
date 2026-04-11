import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertCircle, Wand2 } from 'lucide-react';
import { saveGradeResilient } from '../../lib/academic-service';
import { calculateGrade, CurriculumType } from '../../lib/grading-utils';
import { useAuth } from '../../context/AuthContext';

interface StudentRow {
    id: string;
    name: string;
    ca: number;
    exam: number;
}

export const GradebookGrid: React.FC<{ 
    students: StudentRow[], 
    subject: string, 
    term: string, 
    curriculum: CurriculumType 
}> = ({ students, subject, term, curriculum }) => {
    const { currentSchool } = useAuth();
    const [marks, setMarks] = useState<Record<string, { ca: number, exam: number }>>(
        Object.fromEntries(students.map(s => [s.id, { ca: s.ca, exam: s.exam }]))
    );
    const [saving, setSaving] = useState<string | null>(null);

    const handleUpdate = async (studentId: string) => {
        if (!currentSchool) return;
        setSaving(studentId);
        
        const entry = marks[studentId];
        await saveGradeResilient({
            student_id: studentId,
            subject,
            term,
            session: '2025/2026', // Dynamic in production
            ca_score: entry.ca,
            exam_score: entry.exam,
            school_id: currentSchool.id
        }, curriculum);

        setTimeout(() => setSaving(null), 1000);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Student Name</th>
                        <th className="px-6 py-4 font-semibold w-24">CA (40)</th>
                        <th className="px-6 py-4 font-semibold w-24">Exam (60)</th>
                        <th className="px-6 py-4 font-semibold w-24">Total</th>
                        <th className="px-6 py-4 font-semibold w-20">Grade</th>
                        <th className="px-6 py-4 font-semibold w-16"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {students.map((student) => {
                        const entry = marks[student.id];
                        const total = (entry?.ca || 0) + (entry?.exam || 0);
                        const gradeInfo = calculateGrade(total, curriculum);

                        return (
                            <motion.tr key={student.id} layout>
                                <td className="px-6 py-4">
                                    <p className="font-medium text-gray-900">{student.name}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <input 
                                        type="number"
                                        className="w-16 p-2 bg-gray-50 border-none rounded-lg text-center focus:ring-2 focus:ring-indigo-500"
                                        value={entry?.ca}
                                        onChange={(e) => setMarks({...marks, [student.id]: {...entry, ca: Number(e.target.value)}})}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input 
                                        type="number"
                                        className="w-16 p-2 bg-gray-50 border-none rounded-lg text-center focus:ring-2 focus:ring-indigo-500"
                                        value={entry?.exam}
                                        onChange={(e) => setMarks({...marks, [student.id]: {...entry, exam: Number(e.target.value)}})}
                                    />
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-700">{total}</td>
                                <td className={`px-6 py-4 font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={() => handleUpdate(student.id)}
                                        disabled={saving === student.id}
                                        className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600 transition-colors"
                                    >
                                        {saving === student.id ? (
                                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                                <Save className="w-4 h-4 opacity-50" />
                                            </motion.div>
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                    </button>
                                </td>
                            </motion.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
