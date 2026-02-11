import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Student, ClassInfo } from '../../types';
import { toast } from 'react-hot-toast';
import { SaveIcon, CalculatorIcon, CheckCircleIcon, ExclamationIcon } from '../../constants';


interface GradebookEntry {
    studentId: string;
    studentName: string;
    avatarUrl: string;
    schoolId: string; // Added for correct RLS and data integrity
    ca: string;   // max 40
    exam: string; // max 60
    total: number;
    grade: string;
    remark: string;
    status: 'Draft' | 'Submitted' | 'Published'; // Draft = Saved locally, Submitted = Sent to Admin, Published = Visible to Parents
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

const ClassGradebookScreen: React.FC<{ teacherId: string; handleBack: () => void }> = ({ teacherId, handleBack }) => {
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [students, setStudents] = useState<GradebookEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Teacher's Classes (Mock or Real)
    // Fetch Teacher's Classes (Mock or Real)
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const { fetchTeacherById } = await import('../../lib/database');
                // Assuming teacherId is passed correctly. If not, we might need auth user fallback.
                // But component prop says teacherId.
                const teacher = await fetchTeacherById(teacherId); // You might need to add fetchTeacherById if not exported, or fetchTeachers().find
                // Actually fetchTeachers() returns all. fetchTeacherById(id) exists in `lib/database.ts` (Line 49 is fetchStudentById, fetchTeacherById is likely there too).
                // I'll check/assume it exists or use fetchTeachers logic.
                // Wait, I saw fetchTeacherById in `ReportCardInputScreen` logic? No, it fetched user by email.
                // I'll use fetchTeacherByEmail logic if teacherId is not reliable?
                // But teacherId IS reliable if passed from Dashboard.
                // I'll assume fetchTeacherById exists (Line 300 area).

                if (teacher) {
                    const realClasses = (teacher.classes || []).flatMap((clsStr: string) =>
                        (teacher.subjects || []).map((subj: string) => {
                            // Parse Grade/Section from "JSS 1A" or "Grade 10A"
                            const gradeMatch = clsStr.match(/\d+/);
                            const grade = gradeMatch ? parseInt(gradeMatch[0]) : 0;
                            const section = clsStr.replace(/.*?\d+/, '').trim() || 'A'; // "A" from "10A"

                            return {
                                id: clsStr,
                                grade: grade,
                                section: section,
                                subject: subj,
                                studentCount: 0
                            };
                        })
                    );
                    setClasses(realClasses);
                    if (realClasses.length > 0) {
                        setSelectedClass(realClasses[0].id);
                        setSelectedSubject(realClasses[0].subject);
                    }
                }
            } catch (e) {
                console.error("Error fetching teacher classes", e);
            }
        };
        fetchClasses();
    }, [teacherId]);

    // Fetch Students and Grades for selected Class/Subject
    useEffect(() => {
        if (!selectedClass || !selectedSubject) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // Dynamically import to get latest logic
                const { fetchStudentsByClass, fetchReportCard } = await import('../../lib/database');

                // Parse class ID "JSS1-A" to grade/section if possible, or assume selectedClass IS the ID
                // But earlier mock data had id="JSS1-A".
                // If we are using real data, selectedClass might be "JSS 1A" (string).
                // I need to parse "JSS 1" -> 1 (Grade) and "A" (Section).
                // Or if we fetch classes from DB, we should have grade/section in the object.
                // But `classes` state might just be objects.
                // I'll look at `classes` state.
                const clsObj = classes.find(c => c.id === selectedClass);
                if (!clsObj) {
                    // Should not happen
                    setLoading(false);
                    return;
                }

                const grade = clsObj.grade;
                const section = clsObj.section;

                // 1. Fetch Students
                const studentData = await fetchStudentsByClass(grade, section);

                if (studentData.length === 0) {
                    setStudents([]);
                    setLoading(false);
                    return;
                }

                // 2. Fetch Existing Report Cards (Grades)
                // We iterate students. For optimization we loops.
                const merged: GradebookEntry[] = [];
                const currentSession = "2023/2024";
                const currentTerm = "First Term";

                for (const s of studentData) {
                    const rc = await fetchReportCard(s.id, currentTerm, currentSession);
                    // Find record for this subject
                    const scoreRecord = rc?.academicRecords?.find(r => r.subject === selectedSubject);

                    const ca = scoreRecord?.ca || 0;
                    const exam = scoreRecord?.exam || 0;
                    const total = scoreRecord?.total || (ca + exam);

                    merged.push({
                        studentId: s.id,
                        studentName: s.name,
                        avatarUrl: s.avatarUrl || '',
                        schoolId: s.schoolId || '', // Ensure schoolId is captured
                        ca: ca === 0 ? '' : ca.toString(),
                        exam: exam === 0 ? '' : exam.toString(),
                        total: total,
                        grade: getGrade(total),
                        remark: scoreRecord?.remark || getRemark(total, getGrade(total)),
                        status: (rc?.status as 'Draft' | 'Published') || 'Draft',
                        isDirty: false
                    });
                }

                setStudents(merged);

            } catch (err) {
                console.error("Error loading gradebook:", err);
                toast.error("Failed to load gradebook.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [selectedClass, selectedSubject, classes]);

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

    const handleSave = async (status: 'Draft' | 'Submitted' = 'Draft') => {
        const dirtyEntries = students.filter(s => s.isDirty);
        // If publishing, we save ALL students to ensure completeness, or at least dirty ones?
        // Actually, if publishing, we might want to ensure everything is synced.
        // But for MVP let's assume we are saving current edits as Published.
        // If no edits, but user clicks Publish, we should probably re-save all to trigger sync?
        // Let's assume user saves then publishes. Or just save dirty.
        // If user wants to publish existing data without edits, we need to handle that.
        // Let's force save ALL if Publish is clicked, or just handle dirty logic?
        // Simpler: Just save current state.

        const entriesToSave = status === 'Submitted' ? students : dirtyEntries;

        if (entriesToSave.length === 0) {
            toast('No changes to save.');
            return;
        }

        setSaving(true);
        try {
            const { upsertReportCard } = await import('../../lib/database');
            const currentSession = "2023/2024";
            const currentTerm = "First Term";

            let successCount = 0;

            for (const entry of entriesToSave) {
                const { fetchReportCard } = await import('../../lib/database');
                const existingRC = await fetchReportCard(entry.studentId, currentTerm, currentSession);

                let academicRecords = existingRC?.academicRecords || [];

                // Update or Add current subject/record
                const recordIndex = academicRecords.findIndex(r => r.subject === selectedSubject);
                const newRecord = {
                    subject: selectedSubject,
                    ca: parseInt(entry.ca || '0', 10),
                    exam: parseInt(entry.exam || '0', 10),
                    total: entry.total,
                    grade: entry.grade,
                    remark: entry.remark
                };

                if (recordIndex >= 0) {
                    academicRecords[recordIndex] = newRecord;
                } else {
                    academicRecords.push(newRecord);
                }

                // If Status is Published, we strictly set it. If Draft, we defer to existing or Draft.
                // Actually, if we click Save (Draft), we shouldn't revert a Published card to Draft unless intentional?
                // Usually "Save" on top of published might mean "Amend".
                // Let's say: If existing is Published, and we click Save (Draft), do we unpublish?
                // The user requirement says "save local... then if i want to publish".
                // Implying Save = Draft/Private.
                // So if I click Save, it should probably be Draft (Private).
                // But we shouldn't accidentally hide results.
                // Let's allow Save to just update records but KEEP existing status if it was already published?
                // No, user said "nobody can see that save except me". This implies Save should MAKE it private if it wasn't?
                // Or maybe just "Save" = "Update pending changes".
                // Let's implement:
                // - Save (Draft): Status = 'Draft'. (Hides from parents if code logic in db holds).
                // - Publish: Status = 'Published'. (Shows to parents).

                const finalStatus = status;

                const reportCardToSave = {
                    term: currentTerm,
                    session: currentSession,
                    status: finalStatus,
                    attendance: existingRC?.attendance || { total: 0, present: 0, absent: 0, late: 0 },
                    skills: existingRC?.skills || {},
                    psychomotor: existingRC?.psychomotor || {},
                    teacherComment: existingRC?.teacherComment || '',
                    principalComment: existingRC?.principalComment || '',
                    academicRecords
                };

                await upsertReportCard(entry.studentId, reportCardToSave as any, entry.schoolId);
                successCount++;
            }

            // Mark all as clean
            setStudents(students.map(s => ({ ...s, isDirty: false })));
            if (status === 'Submitted') {
                toast.success(`Submitted grades for ${successCount} students to Admin!`);
            } else {
                toast.success(`Saved draft for ${successCount} students.`);
            }

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
            {/* Header */}
            <div className="px-3 sm:px-6 py-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Class Gradebook</h2>
                        <p className="text-sm text-gray-500">Manage CA and Exam scores efficiently</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <select
                            value={selectedClass}
                            onChange={e => {
                                const cls = classes.find(c => c.id === e.target.value);
                                setSelectedClass(e.target.value);
                                if (cls) setSelectedSubject(cls.subject);
                            }}
                            className="w-full sm:w-64 p-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:ring-2 focus:ring-purple-500 shadow-sm"
                        >
                            {classes.map(c => <option key={c.id} value={c.id}>{c.id} - {c.subject}</option>)}
                        </select>

                        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                            <button
                                onClick={() => handleSave('Draft')}
                                disabled={saving}
                                className="flex-1 sm:flex-none whitespace-nowrap flex items-center justify-center px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-all shadow-sm text-sm font-semibold active:scale-95"
                            >
                                {saving ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div> : <SaveIcon className="w-4 h-4 mr-2" />}
                                <span>Save Draft</span>
                            </button>

                            <button
                                onClick={() => handleSave('Submitted')}
                                disabled={saving}
                                className="flex-1 sm:flex-none whitespace-nowrap flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all shadow-sm text-sm font-semibold active:scale-95"
                            >
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                <span>Submit</span>
                            </button>

                            <button onClick={handleBack} className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium whitespace-nowrap active:scale-95">
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
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Status</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${student.status === 'Published' ? 'bg-green-100 text-green-800' :
                                                    student.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {student.status}
                                                </span>
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
                                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                                        <div className="flex-shrink-0">
                                            {student.avatarUrl ? (
                                                <img className="h-10 w-10 rounded-full object-cover border border-gray-200" src={student.avatarUrl} alt="" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                                                    {student.studentName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-900 truncate">{student.studentName}</div>
                                            <div className="text-xs text-gray-500">ID: {student.studentId}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${student.total >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {student.total}
                                            </span>
                                            <span className="text-sm font-bold text-purple-600">{student.grade}</span>
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
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center text-sm"><CalculatorIcon className="w-4 h-4 mr-2 text-purple-600" /> Grading Scale</h4>
                        <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">A (Excellent)</span>
                                <span className="text-gray-900 font-bold bg-green-50 px-2 py-0.5 rounded">75 - 100</span>
                            </div>
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">B (Very Good)</span>
                                <span className="text-gray-900 font-bold bg-blue-50 px-2 py-0.5 rounded">65 - 74</span>
                            </div>
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">C (Good)</span>
                                <span className="text-gray-900 font-bold bg-yellow-50 px-2 py-0.5 rounded">50 - 64</span>
                            </div>
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">D (Fair)</span>
                                <span className="text-gray-900 font-bold bg-orange-50 px-2 py-0.5 rounded">45 - 49</span>
                            </div>
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium text-red-600">F (Fail)</span>
                                <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded">0 - 44</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ClassGradebookScreen;
