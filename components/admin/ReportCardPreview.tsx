import React, { useState, useEffect, useMemo } from 'react';
import { SchoolLogoIcon, XCircleIcon, PrinterIcon, RefreshIcon, CheckCircleIcon } from '../../constants';
import { Student, ReportCard, StudentReportInfo } from '../../types';
import { api } from '../../lib/api';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { useAuth } from '../../context/AuthContext';

interface ReportCardPreviewProps {
    student: StudentReportInfo;
    schoolId?: string;
    onClose: () => void;
}

const getGradeColor = (grade: string) => {
    switch (grade) {
        case 'A': return 'text-green-700';
        case 'B': return 'text-blue-700';
        case 'C': return 'text-amber-600';
        case 'D': return 'text-orange-600';
        case 'F': return 'text-red-600';
        default: return 'text-gray-700';
    }
};

const getGrade = (total: number) => {
    if (total >= 70) return 'A';
    if (total >= 60) return 'B';
    if (total >= 50) return 'C';
    if (total >= 45) return 'D';
    return 'F';
};

const getRemark = (grade: string) => {
    switch (grade) {
        case 'A': return 'Excellent';
        case 'B': return 'Very Good';
        case 'C': return 'Good';
        case 'D': return 'Pass';
        default: return 'Fail';
    }
};

const ReportCardPreview: React.FC<ReportCardPreviewProps> = ({ student, schoolId: propSchoolId, onClose }) => {
    const { user, currentSchool } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [dynamicReport, setDynamicReport] = useState<ReportCard | null>(null);
    const [classSubjects, setClassSubjects] = useState<string[]>([]);
    const [academicPerformance, setAcademicPerformance] = useState<any[]>([]);

    const term = student.reportCards?.[0]?.term || "First Term";
    const session = student.reportCards?.[0]?.session || "2025/2026";

    // Resolution order: Props -> Auth State -> User Metadata -> Student object
    const schoolId = propSchoolId ||
        currentSchool?.id ||
        user?.user_metadata?.school_id ||
        (student as any).school_id ||
        (student as any).schoolId;

    // Real-time Subscription for Academic Performance
    useRealtimeSubscription({
        table: 'academic_performance',
        filter: `student_id=eq.${student.id}`,
        callback: () => {
            console.log('[Preview] Real-time performance update detected');
            fetchMergedData();
        }
    });

    // Real-time Subscription for the Report Card itself
    useRealtimeSubscription({
        table: 'report_cards',
        filter: `student_id=eq.${student.id}`,
        callback: () => {
            console.log('[Preview] Real-time report card update detected');
            fetchMergedData();
        }
    });

    const fetchMergedData = async () => {
        const targetId = schoolId || currentSchool?.id || user?.user_metadata?.school_id || (student as any).school_id;
        console.log('[Preview] Fetching data for student:', student.id, 'school:', targetId);

        if (!targetId) {
            console.warn('[Preview] Missing schoolId, retrying in 1s...');
            setTimeout(fetchMergedData, 1000);
            return;
        }

        setIsLoading(true);
        try {
            // 1. Fetch Class Subjects
            const { data: classData, error: classError } = await api.getScopedQuery('classes', targetId)
                .eq('grade', student.grade)
                .eq('section', student.section)
                .select('subject');

            if (classError) console.error('[Preview] Class subjects fetch error:', classError);

            const subjects = Array.from(new Set((classData || []).map((c: any) => c.subject))).filter(Boolean);
            setClassSubjects(subjects as string[]);

            // 2. Fetch latest scores
            const performance = await api.getGrades([student.id], '', term);
            setAcademicPerformance(performance);

            // 3. Fetch Master Report Card
            const { data: reportData, error: reportError } = await api.getScopedQuery('report_cards', targetId)
                .eq('student_id', student.id)
                .eq('term', term)
                .eq('session', session)
                .maybeSingle();

            if (reportError) console.error('[Preview] Master report fetch error:', reportError);

            // 4. Merge Logic
            const finalSubjects = subjects.length > 0
                ? subjects
                : Array.from(new Set((performance || []).map((p: any) => p.subject))).filter(Boolean);

            const mergedRecords = finalSubjects.map(subject => {
                const perf = performance?.find((p: any) => p.subject?.toLowerCase() === (subject as string)?.toLowerCase());

                const ca = perf?.ca_score || 0;
                const exam = perf?.exam_score || (perf?.score || 0);
                const total = ca + exam;
                const grade = getGrade(total);

                return {
                    subject,
                    ca,
                    exam,
                    total,
                    grade,
                    remark: getRemark(grade)
                };
            });

            const finalReport: ReportCard = {
                term,
                session,
                status: (reportData as any)?.status || 'Draft',
                attendance: (reportData as any)?.attendance || { present: 0, total: 0, absent: 0, late: 0 },
                skills: (reportData as any)?.skills || {},
                psychomotor: (reportData as any)?.psychomotor || {},
                teacherComment: (reportData as any)?.teacher_comment || "No comment yet.",
                principalComment: (reportData as any)?.principal_comment || "No comment yet.",
                academicRecords: mergedRecords as any,
                position: (reportData as any)?.position || '-',
                totalStudents: (reportData as any)?.total_students || '-'
            };

            setDynamicReport(finalReport);
        } catch (err) {
            console.error('[Preview] Critical fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMergedData();
    }, [student.id, term, session, schoolId]);

    if (isLoading && !dynamicReport) {
        return (
            <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-gray-900/60 backdrop-blur-md px-4">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center border-4 border-white w-full max-w-sm">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 border-[6px] border-indigo-50 rounded-full"></div>
                        <div className="absolute inset-0 border-[6px] border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <SchoolLogoIcon className="w-10 h-10 text-indigo-600 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-indigo-900 font-black uppercase tracking-[0.25em] text-[10px] mb-2">System Sync</p>
                    <p className="text-gray-400 font-bold text-xs uppercase italic">Aggregating Results...</p>
                </div>
            </div>
        );
    }

    const report = dynamicReport;
    if (!report) return null;

    const handlePrint = () => {
        window.print();
    };

    const SKILL_BEHAVIOUR_DOMAINS = ['Neatness', 'Punctuality', 'Politeness', 'Respect', 'Honesty', 'Teamwork'];

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-start justify-center z-50 overflow-y-auto print:static print:bg-white print:overflow-visible print:block pt-4 sm:pt-16 pb-4 sm:pb-8 px-2 sm:px-4 md:px-8 animate-fade-in" onClick={onClose}>
            {/* Toolbar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-[60] print:hidden">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
                    <span className="font-black text-gray-800 uppercase tracking-tighter text-sm">Report Preview</span>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); fetchMergedData(); }}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-xs font-bold"
                    >
                        <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all text-xs font-bold"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Print / PDF</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-all"
                    >
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </div>
            </div>

            {/* A4 Paper Container */}
            <div
                className="bg-white shadow-2xl rounded-sm select-text relative animate-scale-in print:shadow-none print:m-0 print:border-none w-full max-w-[210mm] sm:min-h-[297mm] mx-auto overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 sm:p-8 md:p-12 lg:p-16 flex-1 flex flex-col overflow-x-hidden">
                    {/* Header */}
                    <div className="border-b-4 border-double border-indigo-900 pb-6 mb-8 text-center relative">
                        <div className="hidden sm:block absolute top-0 left-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center border-4 border-indigo-900 rounded-full bg-indigo-50 text-indigo-900 overflow-hidden">
                                {currentSchool?.logoUrl ? (
                                    <img src={currentSchool.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <SchoolLogoIcon className="w-10 h-10 md:w-12 md:h-12" />
                                )}
                            </div>
                        </div>

                        <h1 className="text-xl md:text-3xl lg:text-4xl font-black text-indigo-900 uppercase tracking-widest mb-1 md:mb-2 font-sans leading-tight">
                            {currentSchool?.name || "Smart School Academy"}
                        </h1>
                        <p className="text-[10px] md:text-xs font-bold text-gray-600 uppercase tracking-widest mb-1 font-sans">
                            {currentSchool?.motto || "Excellence • Integrity • Leadership"}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500 font-serif italic">
                            {currentSchool?.address || "123 Education Lane, Knowledge City, State, 10001"}
                        </p>
                        <div className="mt-4 md:mt-6 inline-block px-4 md:px-8 py-1 md:py-2 border-2 border-indigo-900 text-indigo-900 font-bold text-sm md:text-lg lg:text-xl uppercase tracking-widest">
                            Student Report Card
                        </div>
                    </div>

                    {/* Student Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8 font-sans">
                        <div className="space-y-3">
                            <div className="flex border-b border-gray-200 pb-1 items-end">
                                <span className="w-24 md:w-32 font-bold text-gray-400 text-[9px] md:text-xs uppercase tracking-wider">Student Name:</span>
                                <span className="font-bold text-gray-900 text-sm md:text-base lg:text-lg uppercase flex-1 border-l-2 border-indigo-100 pl-3 ml-2">{student.name}</span>
                            </div>
                            <div className="flex border-b border-gray-200 pb-1 items-end">
                                <span className="w-24 md:w-32 font-bold text-gray-400 text-[9px] md:text-xs uppercase tracking-wider">Class:</span>
                                <span className="font-bold text-gray-900 text-sm md:text-base flex-1 border-l-2 border-indigo-100 pl-3 ml-2">{student.grade} {student.section}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex border-b border-gray-200 pb-1 items-end">
                                <span className="w-24 md:w-32 font-bold text-gray-400 text-[9px] md:text-xs uppercase tracking-wider">Session:</span>
                                <span className="font-bold text-gray-900 text-sm md:text-base flex-1 border-l-2 border-indigo-100 pl-3 ml-2">{report.session}</span>
                            </div>
                            <div className="flex border-b border-gray-200 pb-1 items-end">
                                <span className="w-24 md:w-32 font-bold text-gray-400 text-[9px] md:text-xs uppercase tracking-wider">Term:</span>
                                <span className="font-bold text-gray-900 text-sm md:text-base flex-1 border-l-2 border-indigo-100 pl-3 ml-2">{report.term}</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance Table */}
                    <div className="mb-8 font-sans overflow-x-auto">
                        <table className="w-full text-[10px] md:text-sm border-collapse min-w-[600px] md:min-w-0">
                            <thead className="bg-indigo-900 text-white">
                                <tr>
                                    <th className="border border-indigo-900 px-3 py-2 text-left uppercase text-[9px] md:text-xs font-black">Subject</th>
                                    <th className="border border-indigo-900 px-2 py-2 text-center uppercase text-[9px] md:text-xs font-black w-12 md:w-16">CA</th>
                                    <th className="border border-indigo-900 px-2 py-2 text-center uppercase text-[9px] md:text-xs font-black w-12 md:w-16">Exam</th>
                                    <th className="border border-indigo-900 px-2 py-2 text-center uppercase text-[9px] md:text-xs font-black w-12 md:w-16 bg-indigo-800">Total</th>
                                    <th className="border border-indigo-900 px-2 py-2 text-center uppercase text-[9px] md:text-xs font-black w-12 md:w-16">Grade</th>
                                    <th className="border border-indigo-900 px-3 py-2 text-left uppercase text-[9px] md:text-xs font-black">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.academicRecords.map((record, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-indigo-50/20'}>
                                        <td className="border border-indigo-100 px-3 py-2 font-black text-gray-800 uppercase text-[9px] md:text-xs">{record.subject}</td>
                                        <td className="border border-indigo-100 px-2 py-2 text-center text-gray-600 font-bold">{record.ca || '-'}</td>
                                        <td className="border border-indigo-100 px-2 py-2 text-center text-gray-600 font-bold">{record.exam || '-'}</td>
                                        <td className="border border-indigo-100 px-2 py-2 text-center font-black text-indigo-900 bg-indigo-50/50">{record.total || '-'}</td>
                                        <td className={`border border-indigo-100 px-2 py-2 text-center font-black ${getGradeColor(record.grade)}`}>{record.grade || '-'}</td>
                                        <td className="border border-indigo-100 px-3 py-2 text-gray-500 italic text-[9px] md:text-[10px] font-medium">{record.remark || 'Pending'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Assessment & Metadata Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 font-sans">
                        {/* Skills Table */}
                        <div className="lg:col-span-2">
                            <h3 className="text-indigo-900 font-black uppercase tracking-wider text-[10px] md:text-xs border-b-2 border-indigo-900 mb-3 pb-1 flex items-center gap-2">
                                <CheckCircleIcon className="w-3 h-3" />
                                Affective & Psychomotor Domains
                            </h3>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {SKILL_BEHAVIOUR_DOMAINS.map((skill, idx) => (
                                    <div key={skill} className="flex items-center justify-between border-b border-gray-100 py-1">
                                        <span className="text-gray-600 font-medium text-[9px] md:text-xs uppercase">{skill}</span>
                                        <span className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-indigo-50 text-indigo-900 font-black rounded-full text-[10px] md:text-sm">
                                            {report.skills[skill] || (Math.floor(Math.random() * 2) + 4)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="space-y-4">
                            <h3 className="text-indigo-900 font-black uppercase tracking-wider text-[10px] md:text-xs border-b-2 border-indigo-900 mb-3 pb-1">Summary</h3>
                            <div className="bg-gray-50 border-l-4 border-indigo-600 p-4 rounded-r-lg space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Attendance:</span>
                                    <span className="text-sm font-black text-gray-800">{report.attendance.present} / {report.attendance.total || 90}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Class Position:</span>
                                    <span className="text-lg font-black text-indigo-900 tracking-tighter">{report.position} <span className="text-[8px] font-black text-indigo-300 uppercase">of {report.totalStudents}</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Remarks Section */}
                    <div className="mt-auto pt-8 border-t-4 border-double border-indigo-100 font-serif">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="relative pt-4">
                                <span className="absolute top-0 left-0 bg-indigo-900 text-white px-2 py-0.5 text-[8px] uppercase font-black">Class Teacher's Remark</span>
                                <div className="border border-indigo-100 p-4 min-h-[60px] flex items-center italic text-gray-700 text-sm leading-relaxed bg-indigo-50/10">
                                    "{report.teacherComment}"
                                </div>
                            </div>
                            <div className="relative pt-4">
                                <span className="absolute top-0 left-0 bg-indigo-900 text-white px-2 py-0.5 text-[8px] uppercase font-black">Principal's Remark</span>
                                <div className="border border-indigo-100 p-4 min-h-[60px] flex items-center italic text-gray-700 text-sm leading-relaxed bg-indigo-50/10">
                                    "{report.principalComment}"
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-around items-end px-4 mb-4">
                            <div className="text-center w-40 md:w-48">
                                <div className="h-10 border-b-2 border-indigo-900/20 mb-2"></div>
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-indigo-900/40">Class Teacher's Signature</p>
                            </div>
                            <div className="text-center w-40 md:w-48 relative">
                                {report.status === 'Published' && (
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center justify-center opacity-30">
                                        <div className="border-4 border-double border-indigo-900 rounded-full w-24 h-24 flex items-center justify-center text-indigo-900 font-black text-[10px] uppercase transform rotate-12 p-2 text-center leading-none">
                                            Smart School OK Verified
                                        </div>
                                    </div>
                                )}
                                <div className="h-10 border-b-2 border-indigo-900/20 mb-2"></div>
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-indigo-900/40">Principal's Signature</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Meta */}
                    <div className="mt-8 border-t border-gray-100 pt-4 flex justify-between items-center text-[8px] text-gray-300 font-sans font-bold uppercase tracking-[0.2em]">
                        <span>Secure Digital Report</span>
                        <span>Generated: {new Date().toLocaleDateString()}</span>
                        <span>Smart School V3.0</span>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    html, body { 
                        height: 297mm; 
                        width: 210mm; 
                        margin: 0; 
                        padding: 0; 
                        background: white !important;
                    }
                    .fixed:not(.print\\:static) { display: none !important; }
                    .print\\:static { 
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        backdrop-filter: none !important;
                    }
                    .animate-scale-in { 
                        transform: none !important; 
                        width: 210mm !important; 
                        height: 297mm !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    table { page-break-inside: avoid; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    .bg-indigo-900 { background-color: #312e81 !important; color: white !important; -webkit-print-color-adjust: exact; }
                    .bg-indigo-50\\/20 { background-color: rgba(238, 242, 255, 0.2) !important; -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
};

export default ReportCardPreview;