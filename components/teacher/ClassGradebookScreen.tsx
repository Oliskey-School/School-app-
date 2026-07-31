import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Student, ClassInfo } from '../../types';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { SaveIcon, CalculatorIcon, CheckCircleIcon, ExclamationIcon } from '../../constants';
import CenteredLoader from '../ui/CenteredLoader';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';



interface GradebookEntry {
    studentId: string;
    studentName: string;
    avatarUrl: string;
    schoolId: string;
    test1: string;   // max 20
    test2: string;   // max 20
    exam: string;    // max 60
    total: number;
    grade: string;
    remark: string;
    status: 'Draft' | 'Submitted' | 'Published'; // Draft = Saved locally, Submitted = Sent to Admin, Published = Visible to Parents
    isDirty: boolean; // has unsaved changes
    // false when the admin gave this student a personal subject list that does
    // NOT include the selected subject — the row shows but stays locked.
    offersSubject: boolean;
}

const getGrade = (score: number): string => {
    if (score >= 70) return 'A';
    if (score >= 60) return 'B';
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

const ClassGradebookScreen: React.FC<{
    teacherId?: string;
    schoolId?: string;
    currentBranchId?: string;
    classInfo?: { id: string, grade: number, section: string, subject: string, studentCount?: number };
    handleBack: () => void;
}> = ({ teacherId, schoolId, currentBranchId, classInfo, handleBack }) => {
    const { currentSchool } = useAuth();
    const [classes, setClasses] = useState<ClassInfo[]>(classInfo ? [classInfo as any] : []);
    const [selectedClass, setSelectedClass] = useState<string>(classInfo?.id || '');
    const [selectedSubject, setSelectedSubject] = useState<string>(classInfo?.subject || '');
    const [students, setStudents] = useState<GradebookEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sessions, setSessions] = useState<string[]>([]);
    const [terms, setTerms] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState("");
    const [currentTerm, setCurrentTerm] = useState<any>(null);
    const [isPeriodOpen, setIsPeriodOpen] = useState(true);

    // Generate full year range from school's app_start_year to SS3 future graduation
    const generateYearRange = (): string[] => {
        const settings = (currentSchool as any)?.settings;
        const startYear: number = settings?.app_start_year
            ? Number(settings.app_start_year)
            : new Date().getFullYear() - 1;
        // Show up to 3 years ahead so current SS1 students can see their SS3 year
        const endYear = new Date().getFullYear() + 3;
        const years: string[] = [];
        for (let y = startYear; y <= endYear; y++) {
            years.push(`${y}/${y + 1}`);
        }
        return years;
    };

    // Fetch Academic Periods from Backend
    useEffect(() => {
        const fetchPeriods = async () => {
            if (!currentSchool?.id) return;
            try {
                const data = await api.getAcademicTerms(currentSchool.id);
                const allYears = generateYearRange();

                if (data && data.length > 0) {
                    // Merge DB years with generated range (DB years take priority for term data)
                    const dbYears = Array.from(new Set(data.map((t: any) => t.academic_year as string)));
                    const mergedYears = Array.from(new Set([...allYears, ...dbYears])).sort();
                    setSessions(mergedYears);
                    setTerms(data);

                    // Default to current active term, or current calendar year session
                    const current = data.find((t: any) => t.is_current) || data[0];
                    setCurrentSession(current.academic_year);
                    setCurrentTerm(current);
                } else {
                    setSessions(allYears);
                    const nowYear = new Date().getFullYear();
                    const currentAcademicYear = `${nowYear}/${nowYear + 1}`;
                    const fallbackTerm = { name: "First Term", academic_year: currentAcademicYear, start_date: `${nowYear}-09-01`, end_date: `${nowYear + 1}-07-30` };
                    setTerms([fallbackTerm]);
                    setCurrentSession(currentAcademicYear);
                    setCurrentTerm(fallbackTerm);
                }
            } catch (err) {
                console.error("Error fetching academic periods:", err);
            }
        };
        fetchPeriods();
    }, [currentSchool?.id]);

    // Check if within starting/ending point
    useEffect(() => {
        if (currentTerm) {
            const now = new Date();
            const start = new Date(currentTerm.start_date);
            const end = new Date(currentTerm.end_date);
            // In a real app, you might have a specific 'results_entry_end_date'
            // For now, we'll just show the period info
            console.log(`Results Entry Period: ${currentTerm.start_date} to ${currentTerm.end_date}`);
        }
    }, [currentTerm]);

    const filteredTerms = useMemo(() => {
        return terms.filter(t => t.academic_year === currentSession);
    }, [terms, currentSession]);

    // Admin mode: the Results Entry selector passes a class WITHOUT a subject
    // (classes have no subject column). Offer the subjects the admin ASSIGNED
    // to this class (class form → Subjects); only when the class has none do we
    // fall back to the whole school list — without any of this the loader bails
    // on the empty subject and the screen sits on "No students found" forever.
    useEffect(() => {
        if (!classInfo || classInfo.subject) return;
        const loadSubjects = async () => {
            try {
                const sid = schoolId || currentSchool?.id;

                // 1. Subjects already on the class object (getClasses includes them)
                let names: string[] = Array.isArray((classInfo as any).subjects)
                    ? (classInfo as any).subjects.map((s: any) => (typeof s === 'string' ? s : s?.name)).filter(Boolean)
                    : [];

                // 2. Fetch the class's assigned subjects by id
                if (names.length === 0 && classInfo.id && !String(classInfo.id).startsWith('std-')) {
                    const clsSubs = await api.getClassSubjects(classInfo.id).catch(() => []);
                    names = (Array.isArray(clsSubs) ? clsSubs : [])
                        .map((s: any) => (typeof s === 'string' ? s : s?.name))
                        .filter(Boolean);
                }

                // 3. Fallback: the whole school's subject list
                if (names.length === 0) {
                    const subs = await api.getSubjects(sid, currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined);
                    names = (Array.isArray(subs) ? subs : [])
                        .map((s: any) => (typeof s === 'string' ? s : s?.name))
                        .filter(Boolean);
                }

                const list = Array.from(new Set(names));
                const finalList = list.length ? list : ['General'];
                const className = (classInfo as any).name
                    || `Grade ${classInfo.grade}${classInfo.section ? ` ${classInfo.section}` : ''}`;
                setClasses(finalList.map(sub => ({ ...classInfo, name: className, subject: sub } as any)));
                setSelectedClass(classInfo.id);
                setSelectedSubject(finalList[0]);
            } catch (e) {
                console.error('Error loading subjects for class', e);
            }
        };
        loadSubjects();
    }, [classInfo?.id]);

    // Fetch Teacher's Classes (Mock or Real)
    useEffect(() => {
        if (classInfo) return; // Skip if we already have class info (Admin mode)
        if (!teacherId) return;

        const fetchClasses = async () => {
            try {
                const teacher = await api.getMyTeacherProfile();
                if (teacher && teacher.classes) {
                    const realClasses = teacher.classes.map((tc: any) => {
                        // tc.subject can be a string, a Subject object, or undefined
                        const subjectVal = tc.subject;
                        const subjectName = typeof subjectVal === 'object' && subjectVal !== null
                            ? (subjectVal.name || subjectVal.code || 'General')
                            : (subjectVal || teacher.subject_specialty || 'General');
                        return {
                            id: tc.class.id,
                            name: tc.class.name,
                            grade: tc.class.grade,
                            section: tc.class.section,
                            subject: subjectName,
                            studentCount: tc.class._count?.enrollments || 0
                        };
                    });
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

    const loadData = async () => {
        if (!selectedClass || !selectedSubject) return;
        setLoading(true);
        try {

            const clsObj = classes.find(c => c.id === selectedClass && c.subject === selectedSubject);
            if (!clsObj) {
                setLoading(false);
                return;
            }

            const subject = clsObj.subject;

            // 1. Fetch Students — use classId directly to avoid grade/section parsing issues
            const allStudents = clsObj.id
                ? await api.getStudentsByClassId(clsObj.id)
                : await api.getStudentsByClass(clsObj.grade, clsObj.section, schoolId, currentBranchId);

            // Session-aware roster: a student belongs to sessions from the year
            // they were added onward — an older session's gradebook doesn't show
            // students who weren't in the school yet.
            const sessionEndYear = parseInt(String(currentSession).split('/')[1] || '', 10);
            const sessionEnd = isNaN(sessionEndYear) ? null : new Date(sessionEndYear, 7, 31, 23, 59, 59);
            const studentData = (allStudents || []).filter((s: any) =>
                !sessionEnd || !s.created_at || new Date(s.created_at) <= sessionEnd
            );

            // Per-student subject assignment: every class member stays VISIBLE,
            // but a student whose personal subject list excludes this subject is
            // locked ("not offering") instead of silently missing from the sheet.
            const offersSelected = (s: any) => {
                const assigned: string[] = Array.isArray(s.assigned_subjects) ? s.assigned_subjects.filter(Boolean) : [];
                if (assigned.length === 0) return true;
                return assigned.some(n => String(n).toLowerCase() === String(subject).toLowerCase());
            };

            if (studentData.length === 0) {
                setStudents([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Existing Report Cards (Grades) — in parallel; one request
            // per student in sequence made a 30-student class take ~10s to open.
            const reportCards = await Promise.all(
                studentData.map((s: any) =>
                    api.getReportCard(s.id, currentTerm?.name, currentSession, currentBranchId).catch(() => null)
                )
            );

            const merged: GradebookEntry[] = studentData.map((s: any, i: number) => {
                // Read by term NAME — report cards are stored keyed by term name,
                // so reads and writes must use the same key for drafts to reload.
                const rc = reportCards[i];
                // The backend now stores academic records in rc.academic_records
                const academicRecords = rc?.academic_records || [];
                // Find record for this subject
                const scoreRecord = academicRecords.find((r: any) => r.subject === selectedSubject);

                const test1 = scoreRecord?.test1 || 0;
                const test2 = scoreRecord?.test2 || 0;
                const exam = scoreRecord?.exam || 0;
                const total = scoreRecord?.total || (test1 + test2 + exam);

                return {
                    studentId: s.id,
                    studentName: s.name,
                    avatarUrl: s.avatarUrl || s.avatar_url || '',
                    // The human-readable school ID shown under the name
                    schoolId: s.school_generated_id || s.schoolId || '',
                    test1: test1 === 0 ? '' : test1.toString(),
                    test2: test2 === 0 ? '' : test2.toString(),
                    exam: exam === 0 ? '' : exam.toString(),
                    total: total,
                    grade: getGrade(total),
                    remark: scoreRecord?.remark || getRemark(total, getGrade(total)),
                    status: (rc?.status as 'Draft' | 'Submitted' | 'Published') || 'Draft',
                    isDirty: false,
                    offersSubject: offersSelected(s)
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

    useEffect(() => {
        loadData();
    }, [selectedClass, selectedSubject, classes, currentSession, currentTerm?.id, currentTerm?.name]);

    useAutoSync(['report_card_records', 'report_cards'], loadData);



    const handleScoreChange = (index: number, field: 'test1' | 'test2' | 'exam', value: string) => {
        const newStudents = [...students];
        const entry = { ...newStudents[index] };
        if (!entry.offersSubject) return; // locked — student doesn't offer this subject

        // Validation
        let numVal = parseInt(value, 10);
        if (isNaN(numVal)) numVal = 0;

        if (numVal < 0) return; // no negative scores
        if (field === 'test1' && numVal > 20) return; // Max 20
        if (field === 'test2' && numVal > 20) return; // Max 20
        if (field === 'exam' && numVal > 60) return;  // Max 60

        if (value === '' || !isNaN(parseInt(value))) {
            (entry as any)[field] = value;
            entry.isDirty = true;

            // Recalculate
            const t1 = parseInt(entry.test1 || '0', 10);
            const t2 = parseInt(entry.test2 || '0', 10);
            const exam = parseInt(entry.exam || '0', 10);
            entry.total = t1 + t2 + exam;
            entry.grade = getGrade(entry.total);
            // Keep the remark in step with the new grade — otherwise a score
            // change saves the OLD remark next to the new grade.
            entry.remark = getRemark(entry.total, entry.grade);

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
            // Using dynamic session/term from state — saved per student in
            // parallel (each student's report card is independent). Students not
            // offering this subject are never written for it.
            const targets = students.filter(s => s.offersSubject && (s.isDirty || status === 'Submitted'));
            const results = await Promise.all(targets.map(async (entry) => {
                try {
                    const rc = await api.getReportCard(entry.studentId, currentTerm?.name, currentSession, currentBranchId);

                    const academicRecords = rc?.academic_records || [];

                    // Update or Add current subject/record
                    const recordIndex = academicRecords.findIndex((r: any) => r.subject === selectedSubject);
                    const newRecord = {
                        subject: selectedSubject,
                        test1: parseInt(entry.test1 || '0', 10),
                        test2: parseInt(entry.test2 || '0', 10),
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

                    const reportCardToSave = {
                        term_id: currentTerm?.id,
                        term: currentTerm?.name,
                        session: currentSession,
                        status: status,
                        attendance: rc?.attendance || { total: 0, present: 0, absent: 0, late: 0 },
                        skills: rc?.skills || {},
                        psychomotor: rc?.psychomotor || {},
                        // The API returns these in snake_case; reading only camelCase here
                        // silently wiped existing comments on every grade save. Preserve them.
                        teacherComment: rc?.teacherComment ?? rc?.teacher_comment ?? '',
                        principalComment: rc?.principalComment ?? rc?.principal_comment ?? '',
                        academicRecords
                    };

                    return await api.upsertReportCard(entry.studentId, reportCardToSave, currentSchool?.id || schoolId, currentBranchId);
                } catch (e) {
                    console.error(`Failed to save grades for student ${entry.studentId}`, e);
                    return null;
                }
            }));
            const successCount = results.filter(Boolean).length;

            // Mark all as clean and reflect the new status on each row's chip
            setStudents(students.map(s => ({
                ...s,
                isDirty: false,
                status: status === 'Submitted' ? 'Submitted' : s.status,
            })));
            if (successCount < targets.length) {
                toast.error(`Saved ${successCount} of ${targets.length} students — some saves failed.`);
            } else if (status === 'Submitted') {
                toast.success(`Successfully submitted grades for ${successCount} students!`);
            } else {
                toast.success(`Successfully saved draft for ${successCount} students.`);
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
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <select
                                value={currentSession}
                                onChange={(e) => {
                                    const newSession = e.target.value;
                                    setCurrentSession(newSession);
                                    // Auto-select first term for this session, or clear if none
                                    const sessionTerms = terms.filter(t => t.academic_year === newSession);
                                    if (sessionTerms.length > 0) {
                                        setCurrentTerm(sessionTerms.find(t => t.is_current) || sessionTerms[0]);
                                    } else {
                                        setCurrentTerm(null);
                                    }
                                }}
                                className="text-xs font-black uppercase tracking-widest bg-gray-50 border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-purple-200"
                            >
                                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                value={currentTerm?.id || currentTerm?.name || ""}
                                onChange={(e) => {
                                    const selected = terms.find(t => t.id === e.target.value || t.name === e.target.value);
                                    if (selected) setCurrentTerm(selected);
                                }}
                                className="text-xs font-black uppercase tracking-widest bg-gray-50 border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-purple-200"
                                disabled={filteredTerms.length === 0}
                            >
                                {filteredTerms.length === 0
                                    ? <option value="">No terms set up</option>
                                    : filteredTerms.map((t, idx) => (
                                        <option key={`${t.id || t.name}-${idx}`} value={t.id || t.name}>
                                            {t.name}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                        <p className="text-sm text-gray-500">Manage CA and Exam scores efficiently</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <select
                            value={`${selectedClass}|${selectedSubject}`}
                            onChange={e => {
                                const [clsId, subject] = e.target.value.split('|');
                                const cls = classes.find(c => c.id === clsId && c.subject === subject);
                                setSelectedClass(clsId);
                                if (cls) setSelectedSubject(subject);
                            }}
                            className="w-full sm:w-64 p-2.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:ring-2 focus:ring-purple-500 shadow-sm"
                        >
                            {classes.map((c, idx) => (
                                <option key={`${c.id}-${c.subject}-${idx}`} value={`${c.id}|${c.subject}`}>
                                    {c.name} - {typeof c.subject === 'object' ? (c.subject as any)?.name ?? 'General' : c.subject}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                            <motion.button
                                whileHover={!saving ? { y: -1 } : {}}
                                whileTap={!saving ? { scale: 0.96 } : {}}
                                onClick={() => handleSave('Draft')}
                                disabled={saving}
                                className="flex-1 sm:flex-none whitespace-nowrap flex items-center justify-center px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors shadow-sm text-sm font-semibold"
                            >
                                {saving ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div> : <SaveIcon className="w-4 h-4 mr-2" />}
                                <span>Save Draft</span>
                            </motion.button>

                            <motion.button
                                whileHover={!saving ? { y: -1 } : {}}
                                whileTap={!saving ? { scale: 0.96 } : {}}
                                onClick={() => handleSave('Submitted')}
                                disabled={saving}
                                className="flex-1 sm:flex-none whitespace-nowrap flex items-center justify-center px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm text-sm font-semibold"
                            >
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                <span>Submit</span>
                            </motion.button>

                            <motion.button whileTap={{ scale: 0.96 }} onClick={handleBack} className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium whitespace-nowrap">
                                Close
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Content - Table for desktop, Cards for mobile */}
            <div className="flex-grow overflow-auto p-3 sm:p-6">
                {loading ? (
                    <CenteredLoader className="min-h-[300px]" message="Loading students..." />
                ) : students.length === 0 ? (
                    <div className="bg-white rounded-xl p-10 text-center text-gray-500">
                        No students found in this class.
                    </div>
                ) : (
                    <>
                        {/* Desktop Table - hidden on mobile */}
                        <div className="hidden lg:block bg-white rounded-xl shadow border border-gray-200 overflow-auto max-h-[calc(100vh-320px)]">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="sticky left-0 z-20 bg-gray-50 px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">Student</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Test 1 (20)</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Test 2 (20)</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Exam (60)</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Total</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Grade</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remark</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {students.map((student, idx) => (
                                        <motion.tr key={student.studentId} layout className={`transition-colors ${student.isDirty ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                                            <td className={`sticky left-0 z-[5] px-6 py-4 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] ${student.isDirty ? 'bg-yellow-50' : 'bg-white'}`}>
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
                                                        <div className="text-xs text-gray-500">ID: {student.schoolId || 'Pending'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="text"
                                                    value={student.test1}
                                                    disabled={!student.offersSubject}
                                                    onChange={e => handleScoreChange(idx, 'test1', e.target.value)}
                                                    className="w-16 text-center border border-gray-300 rounded-md py-1 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                    placeholder={student.offersSubject ? '0' : '—'}
                                                    aria-label={`Test 1 score for ${student.studentName}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="text"
                                                    value={student.test2}
                                                    disabled={!student.offersSubject}
                                                    onChange={e => handleScoreChange(idx, 'test2', e.target.value)}
                                                    className="w-16 text-center border border-gray-300 rounded-md py-1 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                    placeholder={student.offersSubject ? '0' : '—'}
                                                    aria-label={`Test 2 score for ${student.studentName}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input
                                                    type="text"
                                                    value={student.exam}
                                                    disabled={!student.offersSubject}
                                                    onChange={e => handleScoreChange(idx, 'exam', e.target.value)}
                                                    className="w-16 text-center border border-gray-300 rounded-md py-1 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                    placeholder={student.offersSubject ? '0' : '—'}
                                                    aria-label={`Exam score for ${student.studentName}`}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {student.offersSubject ? (
                                                    <motion.span
                                                        key={student.total}
                                                        initial={{ scale: 0.85, opacity: 0.6 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${student.total >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                    >
                                                        {student.total}
                                                    </motion.span>
                                                ) : (
                                                    <span className="text-sm text-gray-300 font-semibold">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                                                {student.offersSubject ? student.grade : <span className="text-gray-300">—</span>}
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
                                                {student.offersSubject
                                                    ? student.remark
                                                    : <span className="italic text-gray-400">Not offering this subject</span>}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards - hidden on desktop */}
                        <div className="lg:hidden space-y-3">
                            {students.map((student, idx) => (
                                <motion.div
                                    key={student.studentId}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: Math.min(idx, 12) * 0.03 }}
                                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-colors ${student.isDirty ? 'bg-yellow-50 border-yellow-300' : ''}`}
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
                                            <div className="text-xs text-gray-500">ID: {student.schoolId || 'Pending'}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {student.offersSubject ? (
                                                <>
                                                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${student.total >= 50 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {student.total}
                                                    </span>
                                                    <span className="text-sm font-bold text-purple-600">{student.grade}</span>
                                                </>
                                            ) : (
                                                <span className="text-sm font-bold text-gray-300">—</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Score Inputs */}
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Test 1 (20)</label>
                                            <input
                                                type="text"
                                                value={student.test1}
                                                disabled={!student.offersSubject}
                                                onChange={e => handleScoreChange(idx, 'test1', e.target.value)}
                                                className="w-full text-center border border-gray-300 rounded-lg py-1.5 text-sm font-semibold focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder={student.offersSubject ? '0' : '—'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Test 2 (20)</label>
                                            <input
                                                type="text"
                                                value={student.test2}
                                                disabled={!student.offersSubject}
                                                onChange={e => handleScoreChange(idx, 'test2', e.target.value)}
                                                className="w-full text-center border border-gray-300 rounded-lg py-1.5 text-sm font-semibold focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder={student.offersSubject ? '0' : '—'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Exam (60)</label>
                                            <input
                                                type="text"
                                                value={student.exam}
                                                disabled={!student.offersSubject}
                                                onChange={e => handleScoreChange(idx, 'exam', e.target.value)}
                                                className="w-full text-center border border-gray-300 rounded-lg py-1.5 text-sm font-semibold focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                placeholder={student.offersSubject ? '0' : '—'}
                                            />
                                        </div>
                                    </div>

                                    {/* Remark */}
                                    <div className="text-xs text-gray-500 text-center px-2 py-1 bg-gray-50 rounded">
                                        {student.offersSubject ? student.remark : <span className="italic text-gray-400">Not offering this subject</span>}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </>
                )}

                {/* Summary / Legend */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center text-sm"><CalculatorIcon className="w-4 h-4 mr-2 text-purple-600" /> Grading Scale</h4>
                        <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                            {/* Bands MUST match getGrade() above (and the backend's
                                default Nigerian scale) — a legend that disagrees with
                                the computed grade misleads teachers. */}
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">A (Excellent)</span>
                                <span className="text-gray-900 font-bold bg-green-50 px-2 py-0.5 rounded">70 - 100</span>
                            </div>
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">B (Very Good)</span>
                                <span className="text-gray-900 font-bold bg-blue-50 px-2 py-0.5 rounded">60 - 69</span>
                            </div>
                            <div className="flex justify-between items-center p-1 hover:bg-gray-50 rounded">
                                <span className="font-medium">C (Good)</span>
                                <span className="text-gray-900 font-bold bg-yellow-50 px-2 py-0.5 rounded">50 - 59</span>
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
                </motion.div>
            </div>
        </div >
    );
};

export default ClassGradebookScreen;
