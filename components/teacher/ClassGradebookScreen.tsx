import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Student, ClassInfo } from '../../types';
import { toast } from 'react-hot-toast';
import { SaveIcon, CalculatorIcon, CheckCircleIcon, ExclamationIcon } from '../../constants';
import { mockStudents } from '../../data'; // Fallback

interface GradebookEntry {
    studentId: number;
    studentName: string;
    avatarUrl: string;
    ca: string;   // max 40
    exam: string; // max 60
    total: number;
    grade: string;
    remark: string;
    isDirty: boolean; // has unsaved changes
}

const getGrade = (score: number): string => {
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D';
    return 'F';
};

const getRemark = (score: number, grade: string): string => {
    if (grade === 'A') return 'Excellent';
    if (grade === 'B') return 'Very Good';
    if (grade === 'C') return 'Good';
    if (grade === 'D') return 'Fair';
    return 'Needs Improvement';
};

const ClassGradebookScreen: React.FC<{ teacherId: number; handleBack: () => void }> = ({ teacherId, handleBack }) => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [students, setStudents] = useState<GradebookEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Teacher's Classes (Mock or Real)
    useEffect(() => {
        // ideally fetch from supabase 'classes' or 'teachers' table
        // For MVP, we'll hardcode or use mock data structure relevant to the logged-in teacher
        const mockClasses: ClassInfo[] = [
            { id: 'JSS1-A', grade: 7, section: 'A', subject: 'Mathematics', studentCount: 25 },
            { id: 'JSS1-B', grade: 7, section: 'B', subject: 'Mathematics', studentCount: 24 },
            { id: 'SSS1-A', grade: 10, section: 'A', subject: 'Physics', studentCount: 20 },
        ];
        setClasses(mockClasses);
        if (mockClasses.length > 0) {
            setSelectedClass(mockClasses[0].id);
            setSelectedSubject(mockClasses[0].subject);
        }
    }, [teacherId]);

    // Fetch Students and Grades for selected Class/Subject
    useEffect(() => {
        if (!selectedClass || !selectedSubject) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // Parse class
                // e.g., "JSS1-A" -> grade=?, section=? 
                // This parsing depends on how you store it. For now let's assume valid mock Students have this data.

                // 1. Fetch Students
                // For MVP showing mockStudents as fallback if DB empty
                let { data: studentData } = await supabase
                    .from('students')
                    .select('id, name, avatar_url, grade, section')
                    // .eq('grade', ...) // implement parsing if needed
                    .order('name');

                if (!studentData || studentData.length === 0) {
                    // Fallback to mock for demo
                    studentData = mockStudents.map(s => ({ ...s, avatar_url: s.avatarUrl }));
                }

                // 2. Fetch Existing Scores
                const { data: scores } = await supabase
                    .from('academic_performance')
                    .select('*')
                    .eq('subject', selectedSubject)
                    .eq('term', 'First Term'); // Hardcoded term for MVP

                // Merge
                const merged: GradebookEntry[] = studentData.map((s: any) => {
                    const scoreRecord = scores?.find((sc: any) => sc.student_id === s.id);
                    const ca = scoreRecord?.ca_score || 0;
                    const exam = scoreRecord?.exam_score || 0;
                    const total = scoreRecord?.score || (ca + exam);

                    return {
                        studentId: s.id,
                        studentName: s.name,
                        avatarUrl: s.avatar_url || '',
                        ca: ca === 0 ? '' : ca.toString(),
                        exam: exam === 0 ? '' : exam.toString(),
                        total: total,
                        grade: getGrade(total),
                        remark: scoreRecord?.remark || getRemark(total, getGrade(total)),
                        isDirty: false
                    };
                });

                setStudents(merged);

            } catch (err) {
                console.error("Error loading gradebook:", err);
                toast.error("Failed to load gradebook.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedClass, selectedSubject]);

    const handleScoreChange = (index: number, field: 'ca' | 'exam', value: string) => {
        const newStudents = [...students];
        const entry = { ...newStudents[index] };

        // Validation
        let numVal = parseInt(value, 10);
        if (isNaN(numVal)) numVal = 0;

        if (field === 'ca' && numVal > 40) return; // Max 40
        if (field === 'exam' && numVal > 60) return; // Max 60

        if (value === '' || !isNaN(parseInt(value))) {
            (entry as any)[field] = value;
            entry.isDirty = true;

            // Recalculate
            const ca = parseInt(entry.ca || '0', 10);
            const exam = parseInt(entry.exam || '0', 10);
            entry.total = ca + exam;
            entry.grade = getGrade(entry.total);

            newStudents[index] = entry;
            setStudents(newStudents);
        }
    };

    const handleSave = async () => {
        const dirtyEntries = students.filter(s => s.isDirty);
        if (dirtyEntries.length === 0) {
            toast('No changes to save.');
            return;
        }

        setSaving(true);
        try {
            const upserts = dirtyEntries.map(s => ({
                student_id: s.studentId,
                subject: selectedSubject,
                term: 'First Term',
                ca_score: parseInt(s.ca || '0', 10),
                exam_score: parseInt(s.exam || '0', 10),
                score: s.total, // Total
                remark: s.remark,
                session: '2024/2025'
            }));

            // We need to handle upsert. Supabase `upsert` works if we have a unique constraint.
            // Assuming (student_id, subject, term, session) is unique or we rely on ID.
            // Since we don't have IDs here, we might need a constraint. 
            // For now, let's look up individually or check if our schema supports bulk upsert on unique keys.
            // We added migration, but maybe didn't add unique constraint.

            // Safer approach for MVP: Iterate and upsert (inefficient but safe) or use `upsert` if constraint exists.
            // Let's assume we can insert.

            for (const record of upserts) {
                // Check exist
                const { data: existing } = await supabase.from('academic_performance')
                    .select('id')
                    .eq('student_id', record.student_id)
                    .eq('subject', record.subject)
                    .eq('term', record.term)
                    .maybeSingle();

                if (existing) {
                    await supabase.from('academic_performance').update(record).eq('id', existing.id);
                } else {
                    await supabase.from('academic_performance').insert([record]);
                }
            }

            // Mark all as clean
            setStudents(students.map(s => ({ ...s, isDirty: false })));
            toast.success(`Saved ${dirtyEntries.length} student records!`);

        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save grades.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="px-3 sm:px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Class Gradebook</h2>
                        <p className="text-xs sm:text-sm text-gray-500">Manage CA and Exam scores efficiently</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
                        <select
                            value={selectedClass}
                            onChange={e => {
                                const cls = classes.find(c => c.id === e.target.value);
                                setSelectedClass(e.target.value);
                                if (cls) setSelectedSubject(cls.subject);
                            }}
                            className="p-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 font-medium focus:ring-2 focus:ring-purple-500"
                        >
                            {classes.map(c => <option key={c.id} value={c.id}>{c.id} - {c.subject}</option>)}
                        </select>

                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm text-sm font-semibold"
                            >
                                {saving ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div> : <SaveIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
                                <span className="hidden sm:inline">Save Changes</span>
                                <span className="sm:hidden">Save</span>
                            </button>

                            <button onClick={handleBack} className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content - Table for desktop, Cards for mobile */}
            <div className="flex-grow overflow-auto p-3 sm:p-6">
                {loading ? (
                    <div className="bg-white rounded-xl p-10 text-center text-gray-500">
                        Loading students...
                    </div>
                ) : students.length === 0 ? (
                    <div className="bg-white rounded-xl p-10 text-center text-gray-500">
                        No students found in this class.
                    </div>
                ) : (
                    <>
                        {/* Desktop Table - hidden on mobile */}
                        <div className="hidden lg:block bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">CA (40)</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Exam (60)</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Total</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Grade</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remark</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {students.map((student, idx) => (
                                        <tr key={student.studentId} className={student.isDirty ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {student.avatarUrl ? (
                                                            <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={student.avatarUrl} alt="" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                                                                {student.studentName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-gray-900">{student.studentName}</div>
                                                        <div className="text-xs text-gray-500">ID: {student.studentId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="text"
                                                    value={student.ca}
                                                    onChange={e => handleScoreChange(idx, 'ca', e.target.value)}
                                                    className="w-20 text-center border border-gray-300 rounded-md py-1 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="text"
                                                    value={student.exam}
                                                    onChange={e => handleScoreChange(idx, 'exam', e.target.value)}
                                                    className="w-20 text-center border border-gray-300 rounded-md py-1 focus:ring-purple-500 focus:border-purple-500"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.total >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {student.total}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                                                {student.grade}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.remark}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards - hidden on desktop */}
                        <div className="lg:hidden space-y-3">
                            {students.map((student, idx) => (
                                <div
                                    key={student.studentId}
                                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${student.isDirty ? 'bg-yellow-50 border-yellow-300' : ''}`}
                                >
                                    {/* Student Header */}
                                    <div className="flex items-center mb-3 pb-3 border-b border-gray-100">
                                        <div className="flex-shrink-0 h-12 w-12">
                                            {student.avatarUrl ? (
                                                <img className="h-12 w-12 rounded-full object-cover border border-gray-200" src={student.avatarUrl} alt="" />
                                            ) : (
                                                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xl">
                                                    {student.studentName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <div className="text-sm font-bold text-gray-900">{student.studentName}</div>
                                            <div className="text-xs text-gray-500">ID: {student.studentId}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${student.total >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {student.total}
                                            </span>
                                            <span className="text-lg font-bold text-purple-600">{student.grade}</span>
                                        </div>
                                    </div>

                                    {/* Score Inputs */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">CA (40)</label>
                                            <input
                                                type="text"
                                                value={student.ca}
                                                onChange={e => handleScoreChange(idx, 'ca', e.target.value)}
                                                className="w-full text-center border border-gray-300 rounded-lg py-2 text-lg font-semibold focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Exam (60)</label>
                                            <input
                                                type="text"
                                                value={student.exam}
                                                onChange={e => handleScoreChange(idx, 'exam', e.target.value)}
                                                className="w-full text-center border border-gray-300 rounded-lg py-2 text-lg font-semibold focus:ring-purple-500 focus:border-purple-500"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    {/* Remark */}
                                    <div className="text-xs text-gray-500 text-center px-2 py-1 bg-gray-50 rounded">
                                        {student.remark}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Summary / Legend */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-700 mb-2 flex items-center text-sm"><CalculatorIcon className="w-4 h-4 mr-1 text-purple-600" /> Grading Scale</h4>
                        <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                            <div className="flex justify-between"><span>A (Excellent)</span><span>75 - 100</span></div>
                            <div className="flex justify-between"><span>B (Very Good)</span><span>65 - 74</span></div>
                            <div className="flex justify-between"><span>C (Good)</span><span>50 - 64</span></div>
                            <div className="flex justify-between"><span>D (Fair)</span><span>45 - 49</span></div>
                            <div className="flex justify-between text-red-600 font-medium"><span>F (Fail)</span><span>0 - 44</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClassGradebookScreen;
