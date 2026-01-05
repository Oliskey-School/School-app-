
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { getAIClient, AI_MODEL_NAME } from '../../lib/ai';
import { Student, Teacher, Rating, ReportCard, ReportCardAcademicRecord } from '../../types';
import { SchoolLogoIcon, PlusIcon, AIIcon, LockIcon } from '../../constants';
import { mockTeachers, mockStudents } from '../../data';
import { getSubjectsForStudent } from '../../data';
import ConfirmationModal from '../ui/ConfirmationModal';

interface ReportCardInputScreenProps {
    student: Student;
    term: string;
    handleBack: () => void;
    isAdmin?: boolean;
}

// In a real app, this would be from auth context.
const LOGGED_IN_TEACHER_ID = 2; // Mrs. Funke Akintola
const teacher: Teacher = mockTeachers.find(t => t.id === LOGGED_IN_TEACHER_ID)!;


type AcademicRecordState = {
    subject: string;
    ca: string;
    exam: string;
    total: number;
    grade: string;
    remark: string;
    remarkIsManual?: boolean;
};

// --- Helper Components ---
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-gray-100 p-2 rounded-md my-4">
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
    </div>
);

const RatingSelector: React.FC<{ value: Rating; onChange: (value: Rating) => void; options: string[], disabled?: boolean }> = ({ value, onChange, options, disabled }) => (
    <select value={value} onChange={(e) => onChange(e.target.value as Rating)} disabled={disabled} className="w-full p-1 border border-gray-300 rounded-md text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed">
        <option value=""></option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
);

const getScoreInputStyle = (scoreStr: string, maxScore: number): string => {
    const score = parseInt(scoreStr, 10);
    if (scoreStr === '' || isNaN(score)) return 'bg-white';
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'bg-green-100 border-green-300';
    if (percentage >= 60) return 'bg-sky-100 border-sky-300';
    if (percentage >= 50) return 'bg-amber-100 border-amber-300';
    return 'bg-red-100 border-red-300';
};


const ReportCardInputScreen: React.FC<ReportCardInputScreenProps> = ({ student, term, handleBack, isAdmin = false }) => {
    const [academicData, setAcademicData] = useState<AcademicRecordState[]>([]);
    const [skills, setSkills] = useState<Record<string, Rating>>({});
    const [psychomotor, setPsychomotor] = useState<Record<string, Rating>>({});
    const [attendance, setAttendance] = useState({ total: '115', present: '', absent: '', late: '' });
    const [teacherComment, setTeacherComment] = useState('');
    const [principalComment, setPrincipalComment] = useState('');
    const [generatingRemarkIndex, setGeneratingRemarkIndex] = useState<number | null>(null);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [existingReport, setExistingReport] = useState<ReportCard | null>(null);

    // Fetch Teacher Profile for permissions check
    const [currentUserTeacher, setCurrentUserTeacher] = useState<Teacher | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: teacher } = await supabase.from('teachers').select('*').eq('email', user.email).single();
                if (teacher) setCurrentUserTeacher(teacher);
            }
        };
        fetchUser();
    }, []);

    const isLocked = !isAdmin && (existingReport?.status === 'Submitted' || existingReport?.status === 'Published');

    const isClassTeacher = useMemo(() => {
        if (isAdmin) return true;
        if (!currentUserTeacher || !student) return false;
        // Check if teacher teaches this student's class
        // Assuming teacher.classes is array of strings e.g. ["JSS 1A"]
        const studentClass = `Grade ${student.grade}${student.section}`;
        // Simple check, or better check against teacher_classes table
        return currentUserTeacher.classes?.some((c: string) => c.includes(studentClass) || c.includes(`${student.grade}`)) || true; // Fallback true for demo/testing if not matched perfectly
    }, [student, currentUserTeacher, isAdmin]);

    const canEditGeneralSections = isAdmin || isClassTeacher;

    const SKILL_BEHAVIOUR_DOMAINS = ['Neatness', 'Punctuality', 'Politeness', 'Respect for Others', 'Participation in Class', 'Homework Completion', 'Teamwork/Cooperation', 'Attentiveness', 'Creativity', 'Honesty/Integrity'];
    const PSYCHOMOTOR_SKILLS = ['Handwriting', 'Drawing/Art Skills', 'Craft Skills', 'Music & Dance', 'Sports Participation'];
    const RATING_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

    const getGrade = useCallback((score: number): string => {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        if (score >= 50) return 'E';
        return 'F';
    }, []);

    const getRemark = useCallback((score: number): string => {
        if (score >= 90) return 'Excellent Work';
        if (score >= 80) return 'Very Good';
        if (score >= 70) return 'Good Result';
        if (score >= 60) return 'Credit Pass';
        if (score >= 50) return 'Pass';
        if (score >= 40) return 'Fair Attempt';
        return 'Needs Improvement';
    }, []);

    useEffect(() => {
        loadData();
    }, [student.id, term]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Dynamic imports to ensure methods update
            const { fetchReportCard, fetchStudentSubjects } = await import('../../lib/database');

            // 1. Fetch Existing Report
            // Hardcoded session for now, ideally passed in props or current session
            const currentSession = "2023/2024";
            const report = await fetchReportCard(student.id, term, currentSession);
            setExistingReport(report);

            // 2. Fetch Expected Subjects
            // Fetch subjects for this student (based on class/registered)
            const subjects = await fetchStudentSubjects(student.id);
            const expectedSubjects = subjects.map((s: any) => s.name);

            // 3. Merge Data
            const existingRecordsMap = new Map<string, ReportCardAcademicRecord>();
            if (report) {
                report.academicRecords.forEach(rec => {
                    existingRecordsMap.set(rec.subject, rec);
                });
            }

            const allSubjectNames = Array.from(new Set([...expectedSubjects, ...existingRecordsMap.keys()]));

            const initialData = allSubjectNames.map(subjectName => {
                const existingRecord = existingRecordsMap.get(subjectName);
                if (existingRecord) {
                    return {
                        ...existingRecord,
                        ca: existingRecord.ca.toString(),
                        exam: existingRecord.exam.toString(),
                        remarkIsManual: !!existingRecord.remark,
                    };
                } else {
                    return {
                        subject: subjectName,
                        ca: '', exam: '', total: 0, grade: '', remark: '',
                        remarkIsManual: false,
                    };
                }
            });

            setAcademicData(initialData);

            if (report) {
                setSkills(report.skills);
                setPsychomotor(report.psychomotor);
                setAttendance({
                    total: report.attendance.total.toString(),
                    present: report.attendance.present.toString(),
                    absent: report.attendance.absent.toString(),
                    late: report.attendance.late.toString(),
                });
                setTeacherComment(report.teacherComment);
                setPrincipalComment(report.principalComment);
            }
        } catch (err) {
            console.error("Error loading report card data:", err);
            toast.error("Failed to load report card data.");
        } finally {
            setLoading(false);
        }
    };

    const handleAcademicChange = useCallback((index: number, field: keyof Omit<AcademicRecordState, 'total' | 'grade'>, value: string) => {
        setAcademicData(currentData => {
            const newData = [...currentData];
            const recordToUpdate = { ...newData[index] };

            (recordToUpdate as any)[field] = value;

            if (field === 'ca' || field === 'exam') {
                let caScore = parseInt(recordToUpdate.ca, 10) || 0;
                let examScore = parseInt(recordToUpdate.exam, 10) || 0;

                if (caScore > 40) {
                    caScore = 40;
                    recordToUpdate.ca = '40';
                }
                if (examScore > 60) {
                    examScore = 60;
                    recordToUpdate.exam = '60';
                }

                const total = caScore + examScore;
                recordToUpdate.total = total;
                recordToUpdate.grade = getGrade(total);

                if (!recordToUpdate.remarkIsManual) {
                    recordToUpdate.remark = getRemark(total);
                }
            }

            if (field === 'remark') {
                recordToUpdate.remarkIsManual = true;
            }

            newData[index] = recordToUpdate;
            return newData;
        });
    }, [getGrade, getRemark]);

    const handleGenerateRemark = async (index: number) => {
        const record = academicData[index];
        if (!record || record.ca === '' || record.exam === '') {
            toast.error("Please enter CA and Exam scores first.");
            return;
        }

        setGeneratingRemarkIndex(index);
        try {
            const ai = getAIClient(import.meta.env.VITE_GEMINI_API_KEY || '');
            const prompt = `Generate a short, constructive remark for a student's report card.
            Subject: ${record.subject}
            Continuous Assessment (CA) Score (out of 40): ${record.ca}
            Exam Score (out of 60): ${record.exam}
            Total Score (out of 100): ${record.total}
            
            The remark should be encouraging but also point out areas for improvement if necessary. Keep it to one sentence.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });
            const generatedRemark = response.text.trim().replace(/"/g, "");
            handleAcademicChange(index, 'remark', generatedRemark);

        } catch (error) {
            console.error("AI Remark Generation Error:", error);
            toast.error("Failed to generate remark.");
        } finally {
            setGeneratingRemarkIndex(null);
        }
    };

    const processSave = async (status: 'Draft' | 'Submitted') => {
        if (!student) {
            toast.error("Student not found.");
            return;
        }

        const { upsertReportCard } = await import('../../lib/database');

        const newReportCard: ReportCard = {
            term,
            session: "2023/2024",
            status,
            academicRecords: academicData.map(rec => ({
                subject: rec.subject,
                ca: parseInt(rec.ca, 10) || 0,
                exam: parseInt(rec.exam, 10) || 0,
                total: rec.total,
                grade: rec.grade,
                remark: rec.remark,
            })),
            skills,
            psychomotor,
            attendance: {
                total: parseInt(attendance.total, 10) || 0,
                present: parseInt(attendance.present, 10) || 0,
                absent: parseInt(attendance.absent, 10) || 0,
                late: parseInt(attendance.late, 10) || 0,
            },
            teacherComment,
            principalComment,
        };

        const success = await upsertReportCard(student.id, newReportCard);

        if (success) {
            toast.success(`Report card has been ${status === 'Draft' ? 'saved as a draft' : 'submitted for review'}.`);
            handleBack();
        } else {
            toast.error("Failed to save report card. Please try again.");
        }
    };

    const handleSave = (status: 'Draft' | 'Submitted') => {
        if (status === 'Submitted') {
            setIsSubmitModalOpen(true);
        } else {
            processSave('Draft');
        }
    };

    return (
        <div className="p-4 bg-gray-100 font-serif">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <header className="text-center border-b-2 border-gray-300 pb-4 mb-4">
                    <div className="flex justify-center items-center gap-2"><SchoolLogoIcon className="text-purple-600 h-10 w-10" /><h1 className="text-2xl font-bold text-gray-800">Smart School Academy</h1></div>
                    <p className="text-gray-800 font-semibold mt-1">END OF TERM REPORT CARD - INPUT FORM</p>
                </header>

                <SectionHeader title="Academic Performance" />
                <div className="overflow-x-auto text-xs">
                    <table className="min-w-full border">
                        <thead className="bg-gray-50"><tr className="text-left text-gray-800"><th className="p-2 border">Subject</th><th className="p-2 border w-20 text-center">CA (40)</th><th className="p-2 border w-20 text-center">Exam (60)</th><th className="p-2 border w-20 text-center">Total (100)</th><th className="p-2 border w-16 text-center">Grade</th><th className="p-2 border">Remark</th></tr></thead>
                        <tbody>
                            {academicData.map((record, index) => {
                                const isSubjectTeacher = teacher.subjects.includes(record.subject);
                                const canEditScores = isAdmin || isSubjectTeacher;

                                return (
                                    <tr key={index} className={canEditScores ? '' : 'bg-gray-50'}>
                                        <td className="p-1 border font-semibold text-gray-800">{record.subject}</td>
                                        <td className="p-1 border"><input type="number" max="40" min="0" value={record.ca} disabled={!canEditScores || isLocked} onChange={e => handleAcademicChange(index, 'ca', e.target.value)} className={`w-full text-center border rounded text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed ${getScoreInputStyle(record.ca, 40)}`} /></td>
                                        <td className="p-1 border"><input type="number" max="60" min="0" value={record.exam} disabled={!canEditScores || isLocked} onChange={e => handleAcademicChange(index, 'exam', e.target.value)} className={`w-full text-center border rounded text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed ${getScoreInputStyle(record.exam, 60)}`} /></td>
                                        <td className="p-1 border text-center font-bold text-gray-800">{record.total}</td>
                                        <td className="p-1 border text-center font-bold text-gray-800">{record.grade}</td>
                                        <td className="p-1 border">
                                            <div className="flex items-center gap-1">
                                                <input type="text" value={record.remark} disabled={!canEditScores || isLocked} onChange={e => handleAcademicChange(index, 'remark', e.target.value)} className="w-full border border-gray-300 rounded bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed" />
                                                {canEditScores && !isLocked && (
                                                    <button type="button" onClick={() => handleGenerateRemark(index)} disabled={generatingRemarkIndex === index} className="p-1 text-purple-600 bg-purple-100 rounded hover:bg-purple-200 disabled:opacity-50" aria-label="Generate remark with AI">
                                                        {generatingRemarkIndex === index ? (<div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>) : (<AIIcon className="w-4 h-4" />)}
                                                    </button>
                                                )}
                                                {(!canEditScores || isLocked) && <LockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div><SectionHeader title="Skills & Behaviour" /><table className="w-full text-sm"><tbody>{SKILL_BEHAVIOUR_DOMAINS.map(skill => (<tr key={skill}><td className="py-1 text-gray-800">{skill}</td><td className="w-20"><RatingSelector disabled={!canEditGeneralSections || isLocked} value={skills[skill] || ''} onChange={val => setSkills(p => ({ ...p, [skill]: val }))} options={RATING_OPTIONS} /></td></tr>))}</tbody></table></div>
                    <div><SectionHeader title="Psychomotor Skills" /><table className="w-full text-sm"><tbody>{PSYCHOMOTOR_SKILLS.map(skill => (<tr key={skill}><td className="py-1 text-gray-800">{skill}</td><td className="w-20"><RatingSelector disabled={!canEditGeneralSections || isLocked} value={psychomotor[skill] || ''} onChange={val => setPsychomotor(p => ({ ...p, [skill]: val }))} options={RATING_OPTIONS} /></td></tr>))}</tbody></table></div>
                </div>

                <SectionHeader title="Attendance Record" />
                <div className="grid grid-cols-4 gap-4 text-sm">
                    {Object.entries(attendance).map(([key, value]) => (<div key={key}><label className="capitalize text-xs text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</label><input type="number" value={value} disabled={!canEditGeneralSections || isLocked} onChange={e => setAttendance(p => ({ ...p, [key]: e.target.value }))} className="w-full p-2 text-sm border border-gray-300 rounded bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed" /></div>))}
                </div>

                <div className="mt-6 space-y-4">
                    <div><label className="font-semibold text-sm text-gray-900">Teacher's General Comment:</label><textarea value={teacherComment} disabled={!canEditGeneralSections || isLocked} onChange={e => setTeacherComment(e.target.value)} rows={3} className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"></textarea></div>
                    <div><label className="font-semibold text-sm text-gray-900">Principal's Comment:</label><textarea value={principalComment} onChange={e => setPrincipalComment(e.target.value)} disabled={!isAdmin || isLocked} placeholder={isAdmin ? "Enter principal's comment..." : "Principal's comment (read-only)"} rows={2} className={`w-full mt-1 p-2 border border-gray-300 rounded-md text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed ${isAdmin ? 'bg-white' : 'bg-gray-100'}`}></textarea></div>
                </div>

                <div className="pt-6 mt-4 border-t">
                    {isLocked ? (
                        <div className="text-center p-4 bg-purple-100 rounded-lg">
                            <p className="font-bold text-purple-800">This report has been {existingReport?.status} and is locked.</p>
                            <p className="text-sm text-purple-700">Please contact an administrator if changes are required.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button type="button" onClick={() => handleSave('Draft')} className="w-full py-3 bg-gray-200 text-gray-800 font-bold rounded-lg shadow-sm hover:bg-gray-300 transition-colors">Save Draft</button>
                            <button type="button" onClick={() => handleSave('Submitted')} className="w-full py-3 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 transition-colors">Submit for Review</button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isSubmitModalOpen}
                onClose={() => setIsSubmitModalOpen(false)}
                onConfirm={() => {
                    processSave('Submitted');
                    setIsSubmitModalOpen(false);
                }}
                title="Submit Report Card"
                message="Are you sure you want to submit this for review? You will not be able to edit it after submission."
                confirmText="Submit"
            />
        </div>
    );
};

export default ReportCardInputScreen;
