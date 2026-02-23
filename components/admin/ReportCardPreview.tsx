import React, { useState, useEffect, useRef } from 'react';
import {
    Printer as PrinterIcon,
    X as XIcon,
    CheckCircle2 as CheckCircle2Icon,
    Trophy as TrophyIcon,
    BrainCircuit as BrainCircuitIcon,
    MessageSquare as MessageSquareIcon,
    School as SchoolIcon,
    RefreshCw as RefreshIcon,
    ChevronRight as ChevronRightIcon,
    CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { SchoolLogoIcon } from '../../constants';
import { StudentReportInfo, ReportCard } from '../../types';
import { api } from '../../lib/api';
import { useRealtimeSubscription } from '../../hooks/useRealtimeSubscription';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';

interface ReportCardPreviewProps {
    student: StudentReportInfo;
    schoolId?: string;
    onClose: () => void;
}

const getGradeColor = (grade: string) => {
    switch (grade) {
        case 'A': return 'text-emerald-700';
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

const SKILL_BEHAVIOUR_DOMAINS = ['Neatness', 'Punctuality', 'Politeness', 'Respect', 'Honesty', 'Teamwork'];

const ReportCardPreview: React.FC<ReportCardPreviewProps> = ({ student, schoolId: propSchoolId, onClose }) => {
    const { user, currentSchool } = useAuth();
    const { branches } = useBranch();
    const [isLoading, setIsLoading] = useState(true);
    const [dynamicReport, setDynamicReport] = useState<ReportCard | null>(null);
    const [academicPerformance, setAcademicPerformance] = useState<any[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    const term = student.reportCards?.[0]?.term || "First Term";
    const session = student.reportCards?.[0]?.session || "2025/2026";
    const branchInfo = branches?.find(b => b.id === student.branchId);

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
        callback: () => fetchMergedData()
    });

    // Real-time Subscription for the Report Card itself
    useRealtimeSubscription({
        table: 'report_cards',
        filter: `student_id=eq.${student.id}`,
        callback: () => fetchMergedData()
    });

    const fetchMergedData = async () => {
        const targetId = schoolId || currentSchool?.id || user?.user_metadata?.school_id || (student as any).school_id;
        if (!targetId) return;

        setIsLoading(true);
        try {
            // 1. Fetch Class Subjects - Fixed for schema
            const { data: classData } = await api.getScopedQuery('classes', targetId)
                .eq('grade', student.grade)
                .select('name');

            // 2. Fetch latest scores
            const performance = await api.getGrades([student.id], '', term);
            setAcademicPerformance(performance);

            // 3. Extract subjects from performance data (backup)
            const subjects = Array.from(new Set((performance || []).map((p: any) => p.subject))).filter(Boolean);

            // 4. Fetch Master Report Card
            const { data: reportData } = await api.getScopedQuery('report_cards', targetId)
                .eq('student_id', student.id)
                .eq('term', term)
                .eq('session', session)
                .maybeSingle();

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

            setDynamicReport({
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
            });
        } catch (err) {
            console.error('[Preview] Critical fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMergedData();
    }, [student.id, term, session, schoolId]);

    const handlePrint = () => {
        window.print();
    };

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#f8fafc] animate-fade-in overflow-hidden">
            {/* Modal Container */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header Toolbar */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 bg-white/90 backdrop-blur-xl border-b border-gray-200">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <TrophyIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Report Preview</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{student.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={fetchMergedData}
                            className="p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-all border border-gray-200 group"
                        >
                            <RefreshIcon className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-700 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-3 px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all group"
                        >
                            <PrinterIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-black uppercase tracking-widest">Generate PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white border border-gray-200 text-gray-400 rounded-2xl hover:text-gray-900 transition-all"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-12 scroll-smooth bg-gray-100/30">
                    {isLoading && !dynamicReport ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-8">
                            <div className="relative">
                                <div className="w-24 h-24 border-[6px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <SchoolIcon className="w-8 h-8 text-indigo-400 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-indigo-950 font-black uppercase tracking-[0.3em] text-xs mb-2">Neural Link Active</p>
                                <p className="text-gray-400 font-bold text-[10px] uppercase italic">Synchronizing Academic Records...</p>
                            </div>
                        </div>
                    ) : dynamicReport && (
                        <div className="print-container flex justify-center">
                            {/* The A4 Container */}
                            <div
                                ref={printRef}
                                className="printable-area w-[210mm] min-h-[297mm] bg-white text-gray-800 p-[20mm] shadow-xl border border-gray-200 relative group animate-fade-in"
                            >
                                {/* Static Watermark */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                                    <SchoolIcon className="w-[400px] h-[400px] text-indigo-900" />
                                </div>

                                <div className="relative">
                                    {/* School Header */}
                                    <div className="text-center border-b-[3px] border-indigo-900 pb-8 mb-10 relative">
                                        <div className="flex justify-between items-start">
                                            <div className="w-28 h-28 bg-gray-50 rounded-[2.5rem] border border-gray-200 flex items-center justify-center shadow-inner p-3">
                                                {currentSchool?.logoUrl ? (
                                                    <img src={currentSchool.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <SchoolLogoIcon className="w-16 h-16 text-gray-200" />
                                                )}
                                            </div>
                                            <div className="flex-1 px-10">
                                                <h1 className="text-4xl font-black text-gray-900 leading-none uppercase tracking-tighter mb-2">
                                                    {currentSchool?.name || 'Smart School Academy'}
                                                </h1>
                                                <p className="text-indigo-600 font-black uppercase tracking-[0.4em] text-[10px] mb-4 italic">
                                                    {currentSchool?.motto || 'Knowledge • Integrity • Excellence'}
                                                </p>
                                                <div className="flex items-center justify-center gap-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    <span>{currentSchool?.address || 'Institution HQ'}</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
                                                    <span>{currentSchool?.contactEmail || 'Contact Email'}</span>
                                                </div>
                                            </div>
                                            <div className="w-28 px-4 py-3 bg-gray-900 text-white rounded-3xl">
                                                <div className="text-[10px] font-black uppercase tracking-tighter opacity-50 mb-1 leading-none">Session</div>
                                                <div className="text-sm font-black tracking-tight">{dynamicReport.session}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student Info Card */}
                                    <div className="grid grid-cols-2 gap-12 mb-12 bg-[#f8fafc] p-8 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
                                        <div className="space-y-6 relative">
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Student Name</div>
                                                <div className="text-2xl font-black text-indigo-950 uppercase tracking-tight leading-none">
                                                    {student.name}
                                                    <div className="h-1 w-20 bg-indigo-200 mt-2" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Institution Identity</div>
                                                <div className="font-black text-gray-700 text-sm">{student.schoolGeneratedId || 'UID-000000'}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-6 relative border-l border-gray-200 pl-12">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Grade</div>
                                                    <div className="font-black text-indigo-600 uppercase bg-white px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm inline-block text-xs">
                                                        {student.grade} {student.section}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Term</div>
                                                    <div className="font-black text-gray-700 uppercase text-xs">{dynamicReport.term}</div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status Integrity</div>
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2Icon className="w-5 h-5 text-emerald-500" />
                                                    <span className="text-emerald-700 font-black text-xs uppercase tracking-widest">Verified Record</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Table */}
                                    <div className="mb-12">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
                                                    <TrophyIcon className="w-6 h-6 text-white" />
                                                </div>
                                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Core Performance</h3>
                                            </div>
                                            <div className="px-6 py-2 bg-indigo-50 rounded-full border border-indigo-100">
                                                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em]">Alpha Grading Protocol</span>
                                            </div>
                                        </div>

                                        <div className="overflow-hidden border border-gray-200 rounded-[2.5rem] shadow-premium bg-white">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-gray-900 text-white">
                                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest">Subject Discipline</th>
                                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-center">Neural Score</th>
                                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-right">Alpha Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {dynamicReport.academicRecords.length > 0 ? (
                                                        dynamicReport.academicRecords.map((item, index) => (
                                                            <tr key={index} className="hover:bg-gray-50 transition-colors group/row">
                                                                <td className="py-6 px-10 font-black text-gray-800 uppercase text-xs tracking-tight">{item.subject}</td>
                                                                <td className="py-6 px-10 text-center">
                                                                    <div className="inline-block px-4 py-2 bg-gray-100 rounded-2xl font-black text-gray-900 text-sm min-w-[3rem]">
                                                                        {item.total}
                                                                    </div>
                                                                </td>
                                                                <td className={`py-6 px-10 text-right font-black text-2xl ${getGradeColor(item.grade)}`}>
                                                                    {item.grade}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={3} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px] italic">
                                                                No neural data clusters found for this cycle
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Bottom Grid */}
                                    <div className="grid grid-cols-2 gap-12">
                                        <section>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center">
                                                    <BrainCircuitIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Affective Domains</h4>
                                            </div>
                                            <div className="space-y-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-200 shadow-inner">
                                                {SKILL_BEHAVIOUR_DOMAINS.map(domain => {
                                                    const rating = dynamicReport.skills[domain] ? parseInt(dynamicReport.skills[domain].toString()) : 4;
                                                    return (
                                                        <div key={domain} className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{domain}</span>
                                                            <div className="flex gap-2">
                                                                {[1, 2, 3, 4, 5].map(star => (
                                                                    <div
                                                                        key={star}
                                                                        className={`w-3 h-3 rounded-full transition-all ${star <= rating ? 'bg-amber-400 shadow-sm shadow-amber-200' : 'bg-gray-200'}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>

                                        <section>
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center">
                                                    <MessageSquareIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Expert Review</h4>
                                            </div>
                                            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 min-h-[180px] relative">
                                                <div className="absolute top-4 left-4 text-3xl text-emerald-200 font-black">"</div>
                                                <p className="text-xs font-bold text-emerald-900 italic leading-relaxed px-4 pt-4">
                                                    {dynamicReport.teacherComment}
                                                </p>
                                                <div className="absolute bottom-6 right-8 text-right">
                                                    <div className="h-0.5 w-12 bg-emerald-200 mb-2 ml-auto" />
                                                    <p className="text-[9px] font-black text-emerald-700/60 uppercase tracking-widest leading-none">Lead Educator Signature</p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Verification Footer */}
                                    <div className="mt-20 pt-10 border-t border-gray-100 flex justify-between items-end">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Neural ID Verification</p>
                                            <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 font-black text-gray-600 text-[10px] tracking-widest">
                                                REP-{student.id.toString().substring(0, 12).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center justify-end gap-3 mb-4 opacity-30 grayscale">
                                                <SchoolIcon className="w-10 h-10" />
                                                <div className="text-left font-black leading-none uppercase tracking-tighter">
                                                    <div className="text-xs">Certified</div>
                                                    <div className="text-[9px]">Transcript</div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Academic Registry Official Release</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; background: white; }
                    .print-container { padding: 0 !important; margin: 0 !important; }
                    .printable-area { 
                        box-shadow: none !important; 
                        border: none !important; 
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 20mm !important;
                    }
                    .fixed, .sticky { display: none !important; }
                    #root { display: none; }
                    body > div:last-child { display: block !important; }
                }
            `}</style>
        </div>
    );
};

export default ReportCardPreview;