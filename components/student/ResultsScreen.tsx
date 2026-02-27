import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import { Student, ReportCard, Rating } from '../../types';
import { supabase } from '../../lib/supabase';
import { BookOpenIcon, CheckCircleIcon, ClipboardListIcon, SchoolLogoIcon, SUBJECT_COLORS } from '../../constants';
import DonutChart from '../ui/DonutChart';
import { useAuth } from '../../context/AuthContext';

interface ResultsScreenProps {
    studentId: string | number;
    student?: Student;
    schoolId?: string;
}

const TermTab: React.FC<{ term: string; isActive: boolean; onClick: () => void; }> = ({ term, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${isActive ? 'bg-orange-500 text-white shadow' : 'text-gray-600'
            }`}
    >
        {term}
    </button>
);

const RatingBadge: React.FC<{ rating: Rating }> = ({ rating }) => {
    if (!rating) return <span className="text-gray-300 text-sm">—</span>;
    const colors: Record<string, string> = {
        'A': 'bg-green-100 text-green-700',
        'B': 'bg-blue-100 text-blue-700',
        'C': 'bg-amber-100 text-amber-700',
        'D': 'bg-orange-100 text-orange-700',
        'E': 'bg-red-100 text-red-700',
    };
    return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${colors[rating] || 'bg-gray-100 text-gray-600'}`}>{rating}</span>;
};

const ReportCardView: React.FC<{ report: ReportCard, student?: Student, schoolName?: string, logoUrl?: string, motto?: string }> = ({ report, student, schoolName, logoUrl, motto }) => {
    const SKILL_BEHAVIOUR_DOMAINS = ['Neatness', 'Punctuality', 'Politeness', 'Respect for Others', 'Participation in Class', 'Homework Completion', 'Teamwork/Cooperation', 'Attentiveness', 'Creativity', 'Honesty/Integrity'];
    const PSYCHOMOTOR_SKILLS = ['Handwriting', 'Drawing/Art Skills', 'Craft Skills', 'Music & Dance', 'Sports Participation'];
    const hasSkills = report.skills && Object.keys(report.skills).length > 0;
    const hasPsychomotor = report.psychomotor && Object.keys(report.psychomotor).length > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* School Header */}
            <div className="text-center p-4 bg-gradient-to-b from-orange-50 to-white border-b border-orange-200">
                <div className="flex justify-center items-center gap-2 mb-1">
                    {logoUrl ? (
                        <img src={logoUrl} alt="School Logo" className="h-10 w-10 object-contain rounded-lg" />
                    ) : (
                        <SchoolLogoIcon className="text-orange-500 h-10 w-10" />
                    )}
                    <h2 className="text-lg font-bold text-gray-800">{schoolName || 'School Academy'}</h2>
                </div>
                {motto && <p className="text-gray-400 italic text-[10px]">"{motto}"</p>}
                <p className="text-orange-600 font-bold uppercase tracking-widest text-[10px] mt-1">Official Report Card — {report.term}</p>
            </div>

            {/* Student Info Bar */}
            {student && (
                <div className="flex flex-wrap gap-2 px-4 py-2 bg-gray-50 text-xs border-b border-gray-100">
                    <span className="bg-white px-2 py-1 rounded-full border font-medium text-gray-700">{student.name}</span>
                    <span className="bg-white px-2 py-1 rounded-full border font-medium text-gray-600">Class {student.grade}{student.section}</span>
                    <span className="bg-white px-2 py-1 rounded-full border font-medium text-gray-600">{report.session}</span>
                    {report.position && <span className="bg-orange-50 px-2 py-1 rounded-full border border-orange-200 font-bold text-orange-700">Position: {report.position}{report.totalStudents ? ` / ${report.totalStudents}` : ''}</span>}
                </div>
            )}

            {/* Academic Table */}
            <div className="p-4">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Academic Performance</h4>
                <div className="overflow-x-auto text-sm">
                    <table className="min-w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-orange-50 text-gray-600 font-bold text-[10px] uppercase">
                            <tr>
                                <th className="p-2 border border-gray-200 text-left">Subject</th>
                                <th className="p-2 border border-gray-200 w-12 text-center">Test 1</th>
                                <th className="p-2 border border-gray-200 w-12 text-center">Test 2</th>
                                <th className="p-2 border border-gray-200 w-12 text-center">Exam</th>
                                <th className="p-2 border border-gray-200 w-12 text-center bg-orange-100">Total</th>
                                <th className="p-2 border border-gray-200 w-12 text-center">Grade</th>
                                <th className="p-2 border border-gray-200 text-left">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.academicRecords.map((record, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="p-1.5 border border-gray-200 font-semibold text-gray-800">{record.subject}</td>
                                    <td className="p-1.5 border border-gray-200 text-center text-gray-700">{record.test1 || '-'}</td>
                                    <td className="p-1.5 border border-gray-200 text-center text-gray-700">{record.test2 || '-'}</td>
                                    <td className="p-1.5 border border-gray-200 text-center text-gray-700">{record.exam || '-'}</td>
                                    <td className="p-1.5 border border-gray-200 text-center font-bold text-gray-900">{record.total}</td>
                                    <td className="p-1.5 border border-gray-200 text-center font-bold">{record.grade}</td>
                                    <td className="p-1.5 border border-gray-200 italic text-gray-500 text-xs">{record.remark}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Skills & Psychomotor Side by Side */}
            {(hasSkills || hasPsychomotor) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-4">
                    {hasSkills && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Skills & Behaviour</h4>
                            <div className="space-y-1">
                                {SKILL_BEHAVIOUR_DOMAINS.map(skill => (
                                    report.skills[skill] ? (
                                        <div key={skill} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded text-xs">
                                            <span className="text-gray-700">{skill}</span>
                                            <RatingBadge rating={report.skills[skill]} />
                                        </div>
                                    ) : null
                                ))}
                            </div>
                        </div>
                    )}
                    {hasPsychomotor && (
                        <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Psychomotor Skills</h4>
                            <div className="space-y-1">
                                {PSYCHOMOTOR_SKILLS.map(skill => (
                                    report.psychomotor[skill] ? (
                                        <div key={skill} className="flex justify-between items-center bg-gray-50 px-2 py-1 rounded text-xs">
                                            <span className="text-gray-700">{skill}</span>
                                            <RatingBadge rating={report.psychomotor[skill]} />
                                        </div>
                                    ) : null
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Attendance */}
            {report.attendance && (report.attendance.present > 0 || report.attendance.absent > 0) && (
                <div className="px-4 pb-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attendance</h4>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-gray-50 p-2 rounded-lg text-center"><p className="text-gray-400">Total</p><p className="font-bold text-gray-800">{report.attendance.total}</p></div>
                        <div className="bg-green-50 p-2 rounded-lg text-center"><p className="text-green-500">Present</p><p className="font-bold text-green-700">{report.attendance.present}</p></div>
                        <div className="bg-red-50 p-2 rounded-lg text-center"><p className="text-red-500">Absent</p><p className="font-bold text-red-700">{report.attendance.absent}</p></div>
                        <div className="bg-amber-50 p-2 rounded-lg text-center"><p className="text-amber-500">Late</p><p className="font-bold text-amber-700">{report.attendance.late}</p></div>
                    </div>
                </div>
            )}

            {/* Comments */}
            <div className="px-4 pb-4 space-y-3">
                {report.teacherComment && (
                    <div>
                        <p className="text-[10px] font-bold text-orange-700 uppercase">Teacher's Remark</p>
                        <p className="text-sm text-gray-700 italic bg-orange-50 p-2 rounded-md mt-1">"{report.teacherComment}"</p>
                    </div>
                )}
                {report.principalComment && (
                    <div>
                        <p className="text-[10px] font-bold text-orange-700 uppercase">Principal's Comment</p>
                        <p className="text-sm text-gray-700 italic bg-orange-50 p-2 rounded-md mt-1">"{report.principalComment}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ResultsScreen: React.FC<ResultsScreenProps> = ({ studentId, student, schoolId }) => {
    const { currentSchool } = useAuth();
    // State for fetched data
    const [performanceData, setPerformanceData] = useState<any[]>([]);
    const [reportCards, setReportCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTerm, setActiveTerm] = useState<string>('');
    const [quizResults, setQuizResults] = useState<any[]>([]);
    const [showFullReport, setShowFullReport] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!studentId) return;

            try {
                // Using Hybrid API for student records
                const [grades, reports] = await Promise.all([
                    api.getStudentPerformance(studentId),
                    supabase.from('report_cards').select('*').eq('student_id', studentId)
                ]);

                if (grades) {
                    setPerformanceData(grades);
                    const terms = Array.from(new Set(grades.map((d: any) => d.term)));
                    if (terms.length > 0 && !activeTerm) {
                        setActiveTerm(terms[terms.length - 1] as string);
                    } else if (terms.length === 0) {
                        setActiveTerm('First Term');
                    }
                }

                if (reports.data) {
                    setReportCards(reports.data);
                }
            } catch (err) {
                console.error('Error fetching results via Hybrid API:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchQuizResults = async () => {
            try {
                const data = await api.getQuizResults(studentId);
                setQuizResults(data);
            } catch (err) {
                console.error("Error fetching quiz results:", err);
            }
        };

        fetchData();
        fetchQuizResults();
    }, [studentId]);

    // Derived data for active term
    const termGrades = useMemo(() => {
        return performanceData.filter(d => d.term === activeTerm);
    }, [performanceData, activeTerm]);

    const attendancePercentage = student?.attendanceStatus === 'Present' ? 95 : 85;

    const availableTerms = useMemo(() => {
        const terms = Array.from(new Set(performanceData.map((d: any) => d.term)));
        return terms.length > 0 ? terms : ['First Term', 'Second Term'];
    }, [performanceData]);

    const activeReportCard = useMemo(() => {
        return reportCards.find(r => r.term === activeTerm && r.is_published);
    }, [reportCards, activeTerm]);

    const isAnyResultPublished = useMemo(() => {
        return reportCards.some(r => r.is_published);
    }, [reportCards]);

    // Build a ReportCard object from DB row for the formal view
    const formattedReportCard = useMemo((): ReportCard | null => {
        if (!activeReportCard) return null;
        return {
            id: activeReportCard.id,
            term: activeReportCard.term,
            session: activeReportCard.session || '2023/2024',
            status: 'Published',
            academicRecords: (activeReportCard.academic_records || []).map((r: any) => ({
                subject: r.subject,
                test1: r.test1 || 0,
                test2: r.test2 || 0,
                exam: r.exam || 0,
                total: r.total || 0,
                grade: r.grade,
                remark: r.remark
            })),
            skills: activeReportCard.skills || {},
            psychomotor: activeReportCard.psychomotor || {},
            attendance: activeReportCard.attendance || { total: 0, present: 0, absent: 0, late: 0 },
            teacherComment: activeReportCard.teacher_comment || '',
            principalComment: activeReportCard.principal_comment || '',
            position: activeReportCard.position,
            totalStudents: activeReportCard.total_students,
        };
    }, [activeReportCard]);

    if (loading) return <div className="p-10 text-center">Loading academic records...</div>;

    if (performanceData.length === 0 || !isAnyResultPublished) {
        return (
            <div className="p-6 text-center bg-gray-50 h-full flex flex-col justify-center">
                <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                    <ClipboardListIcon className="h-10 w-10 text-orange-600" />
                </div>
                <h3 className="font-bold text-lg text-gray-800">No Published Results</h3>
                <p className="text-gray-600 mt-2 max-w-xs mx-auto">
                    Your official academic results for the current term have not been published by the administration yet.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg overflow-x-auto">
                    {availableTerms.map(term => (
                        <TermTab key={term} term={term} isActive={activeTerm === term} onClick={() => { setActiveTerm(term); setShowFullReport(false); }} />
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                {/* Full Report Card View (toggle) */}
                {formattedReportCard && showFullReport && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowFullReport(false)}
                            className="mb-3 text-sm text-orange-600 font-semibold hover:underline"
                        >
                            ← Back to Summary
                        </button>
                        <ReportCardView
                            report={formattedReportCard}
                            student={student}
                            schoolName={currentSchool?.name}
                            logoUrl={currentSchool?.logoUrl}
                            motto={currentSchool?.motto}
                        />
                    </div>
                )}

                {!showFullReport && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Grades Section */}
                    <div className="lg:col-span-2 bg-white p-4 rounded-xl shadow-sm">
                        <div className="flex items-center space-x-2 mb-3">
                            <BookOpenIcon className="h-5 w-5 text-orange-600" />
                            <h4 className="font-bold text-gray-800">Grades ({activeTerm})</h4>
                        </div>
                        <div className="space-y-2">
                            {termGrades.length > 0 ? termGrades.map((record: any) => (
                                <div key={record.subject} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                    <span className="font-semibold text-sm text-gray-700">{record.subject}</span>
                                    <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${SUBJECT_COLORS[record.subject] || 'bg-gray-200'}`}>{record.score}%</span>
                                </div>
                            )) : <p className="text-gray-500 text-sm">No grades recorded for this term.</p>}
                        </div>

                        {/* Result Summary (Report Card Highlights) */}
                        {activeReportCard && (
                            <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-xl">
                                <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                    <ClipboardListIcon className="h-4 w-4" />
                                    Official Term Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-white p-3 rounded-lg shadow-sm">
                                        <p className="text-xs text-gray-500 font-medium uppercase">Average Score</p>
                                        <p className="text-xl font-bold text-gray-800">{activeReportCard.grade_average}%</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg shadow-sm">
                                        <p className="text-xs text-gray-500 font-medium uppercase">Overall Grade</p>
                                        <p className="text-xl font-bold text-gray-800">{activeReportCard.overall_grade}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {activeReportCard.teacher_comment && (
                                        <div>
                                            <p className="text-xs font-bold text-orange-700 uppercase">Teacher's Remark</p>
                                            <p className="text-sm text-gray-700 italic">"{activeReportCard.teacher_comment}"</p>
                                        </div>
                                    )}
                                    {activeReportCard.principal_comment && (
                                        <div className="pt-2 border-t border-orange-200">
                                            <p className="text-xs font-bold text-orange-700 uppercase">Principal's Decision</p>
                                            <p className="text-sm text-gray-700 italic">"{activeReportCard.principal_comment}"</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowFullReport(true)}
                                        className="w-full py-2 bg-white border border-orange-200 text-orange-700 rounded-lg text-sm font-bold hover:bg-orange-100 transition-colors shadow-sm"
                                    >
                                        📄 View Full Digital Report Card
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Quiz Results Section */}
                        <div className="mt-6">
                            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <span className="p-1 bg-purple-100 rounded text-purple-600">📝</span>
                                Recent Quizzes
                            </h4>
                            <div className="space-y-2">
                                {quizResults.length > 0 ? quizResults.map((result: any) => (
                                    <div key={result.id} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-lg hover:shadow-sm transition-shadow">
                                        <div>
                                            <div className="font-semibold text-sm text-gray-800">{result.quizzes?.title || 'Quiz'}</div>
                                            <div className="text-xs text-gray-500">{new Date(result.submitted_at).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{result.quizzes?.subject}</span>
                                            <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${result.score >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {result.score}%
                                            </span>
                                        </div>
                                    </div>
                                )) : <p className="text-gray-500 text-sm italic">No quizzes taken yet.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-4">
                        {/* Attendance Section */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <CheckCircleIcon className="h-5 w-5 text-orange-600" />
                                <h4 className="font-bold text-gray-800">Attendance</h4>
                            </div>
                            <div className="flex items-center justify-around">
                                <div className="relative">
                                    <DonutChart percentage={attendancePercentage} color="#f97316" size={100} strokeWidth={10} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-bold text-gray-800">{attendancePercentage}%</span>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm font-medium">
                                    <p className="text-gray-500 text-xs text-center">Term Estimate</p>
                                </div>
                            </div>
                        </div>

                        {/* Behavior Notes Section */}
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                            <div className="flex items-center space-x-2 mb-3">
                                <ClipboardListIcon className="h-5 w-5 text-orange-600" />
                                <h4 className="font-bold text-gray-800">Behavior Notes</h4>
                            </div>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                <p className="text-sm text-gray-400 text-center py-4">No behavioral notes available.</p>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </main>
        </div>
    );
};

export default ResultsScreen;