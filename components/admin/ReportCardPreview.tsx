import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
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
import { StudentReportInfo, ReportCard } from '../../types';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
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
    const contentRef = useRef<HTMLDivElement>(null);

    // Responsive A4: the sheet is a fixed 210mm (~794px). On smaller screens we scale it
    // DOWN to fit the available width (never up past 1) so it's never clipped on mobile.
    // We measure via a CALLBACK REF (not useEffect): it re-binds the observer every time
    // the sheet's wrapper mounts, so the scale is recomputed reliably even if the preview
    // remounts (which previously left the scale stuck at 1 on small screens).
    const A4_W = 794;
    const A4_PAGE_PX = 1100; // ~297mm of printable height, with a small safety margin
    const A4_PAD_PX = 106;   // the sheet's 14mm top+bottom print padding
    const [scale, setScale] = useState(1);
    const [naturalH, setNaturalH] = useState(0);
    const [printScale, setPrintScale] = useState(1);
    const roRef = useRef<ResizeObserver | null>(null);
    const measureFrom = useCallback((node: HTMLElement) => {
        const s = Math.min(node.clientWidth / A4_W, 1) || 1;
        setScale(s);
        if (printRef.current) setNaturalH(printRef.current.offsetHeight);
        // Fit the WHOLE report onto a single A4 page when printing: measure the real
        // content height and shrink (via `zoom`, which affects layout/pagination — a CSS
        // transform would still leave a blank 2nd page) only as much as needed.
        if (contentRef.current) {
            const sheetH = contentRef.current.offsetHeight + A4_PAD_PX;
            setPrintScale(Math.min(1, A4_PAGE_PX / sheetH));
        }
    }, []);
    const wrapCbRef = useCallback((node: HTMLDivElement | null) => {
        roRef.current?.disconnect();
        roRef.current = null;
        if (!node) return;
        measureFrom(node);
        // Re-measure after layout settles (first paint can report a pre-layout width).
        requestAnimationFrame(() => measureFrom(node));
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => measureFrom(node));
            ro.observe(node);
            roRef.current = ro;
        }
    }, [measureFrom]);
    useEffect(() => () => roRef.current?.disconnect(), []);

    const term = student?.reportCards?.[0]?.term || "First Term";
    const session = student?.reportCards?.[0]?.session || "2025/2026";
    const branchInfo = branches?.find(b => b.id === student?.branchId);
    const schoolLogo = (currentSchool as any)?.logoUrl || (currentSchool as any)?.logo_url || (currentSchool as any)?.logo;

    // Resolution order: Props -> Auth State -> User Metadata -> Student object
    const schoolId = propSchoolId ||
        currentSchool?.id ||
        user?.user_metadata?.school_id ||
        (student as any).school_id ||
        (student as any).schoolId;

    // School name for the header. Keep it on ONE line by shrinking the font as the name
    // gets longer (a wrapped name looked unprofessional on the printed card).
    const schoolName = currentSchool?.name || (typeof schoolId === 'string' ? schoolId : '') || 'School';
    const nameSizeClass =
        schoolName.length > 30 ? 'text-xl' :
        schoolName.length > 24 ? 'text-2xl' :
        schoolName.length > 14 ? 'text-3xl' :
        'text-4xl';

    // Unified Backend-driven Auto Sync
    useAutoSync(['academic_performance', 'report_cards'], () => {
        console.log('🔄 [ReportCardPreview] Auto-sync triggered');
        fetchMergedData();
    });

    const fetchMergedData = async () => {
        if (!student?.id) return;
        const targetId = schoolId || currentSchool?.id || user?.user_metadata?.school_id || (student as any).school_id;
        if (!targetId) {
            // Without a school context we still render the card shell rather than a
            // blank screen, so the admin always sees *something* to act on.
            setDynamicReport(buildEmptyReport());
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // Single source of truth: the backend already merges the teacher's saved
            // scores, comments, attendance, skills and psychomotor into one record.
            // Using it directly (instead of re-merging classes + grades on the client)
            // is what makes the preview actually show the submitted report.
            const branchId = (student as any).branchId || (student as any).branch_id || null;
            const report = await api.getReportCardDetails(student.id, term, session, branchId);

            const rawRecords: any[] = Array.isArray(report?.academic_records) ? report.academic_records : [];
            const mergedRecords = rawRecords.map((g: any) => {
                const test1 = Number(g.test1 ?? g.ca ?? 0) || 0;
                const test2 = Number(g.test2 ?? 0) || 0;
                const exam = Number(g.exam ?? g.exam_score ?? 0) || 0;
                const total = Number(g.total ?? (test1 + test2 + exam)) || 0;
                const grade = g.grade && g.grade !== '—' ? g.grade : getGrade(total);
                return {
                    subject: g.subject,
                    test1,
                    test2,
                    exam,
                    total,
                    grade,
                    remark: g.remark && g.remark !== '—' ? g.remark : getRemark(grade)
                };
            });

            setAcademicPerformance(mergedRecords);
            setDynamicReport({
                term,
                session,
                status: (report as any)?.status || 'Draft',
                attendance: (report as any)?.attendance || { present: 0, total: 0, absent: 0, late: 0 },
                skills: (report as any)?.skills || {},
                psychomotor: (report as any)?.psychomotor || {},
                teacherComment: (report as any)?.teacher_comment || "No comment yet.",
                principalComment: (report as any)?.principal_comment || "No comment yet.",
                academicRecords: mergedRecords as any,
                position: (report as any)?.position || '-',
                totalStudents: (report as any)?.total_students || '-'
            });
        } catch (err) {
            console.error('[Preview] Critical fetch error:', err);
            // Never leave the preview blank on error — render the card shell so the
            // admin sees the student/school header and can retry with the refresh button.
            setDynamicReport(buildEmptyReport());
        } finally {
            setIsLoading(false);
        }
    };

    const buildEmptyReport = (): ReportCard => ({
        term,
        session,
        status: (student?.reportCards?.[0]?.status as any) || 'Draft',
        attendance: { present: 0, total: 0, absent: 0, late: 0 } as any,
        skills: {},
        psychomotor: {},
        teacherComment: "No comment yet.",
        principalComment: "No comment yet.",
        academicRecords: [] as any,
        position: '-',
        totalStudents: '-'
    } as any);

    useEffect(() => {
        if (!student?.id) return;
        fetchMergedData();
    }, [student?.id, term, session, schoolId]);

    const handlePrint = () => {
        window.print();
    };

    if (!student) return null;

    // Render through a portal on <body> so the full-screen overlay can never be trapped
    // (or clipped) by a transformed/over­flow-hidden ancestor in the dashboard — that was
    // making the preview appear as just a header bar over a blank area.
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#f8fafc] animate-fade-in overflow-hidden">
            {/* Modal Container */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Header Toolbar */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 sm:px-8 py-3 sm:py-5 bg-white/90 backdrop-blur-xl border-b border-gray-200">
                    <div className="flex items-center gap-2 sm:gap-5 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 flex-shrink-0">
                            <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-black text-gray-900 uppercase tracking-tight truncate">Report Preview</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] truncate">{student.name}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={fetchMergedData}
                            aria-label="Reload report"
                            className="p-2.5 sm:p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-all border border-gray-200 group"
                        >
                            <RefreshIcon className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-700 ${isLoading ? 'animate-spin' : ''}`} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handlePrint}
                            aria-label="Generate PDF"
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all group"
                        >
                            <PrinterIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline text-sm font-black uppercase tracking-widest">Generate PDF</span>
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            aria-label="Close preview"
                            className="p-2.5 sm:p-3 bg-white border border-gray-200 text-gray-500 rounded-2xl hover:text-gray-900 hover:bg-gray-50 transition-all flex-shrink-0"
                        >
                            <XIcon className="w-6 h-6" />
                        </motion.button>
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
                                <p className="text-indigo-950 font-black uppercase tracking-[0.3em] text-xs mb-2">Preparing Report</p>
                                <p className="text-gray-400 font-bold text-xs uppercase">Loading academic records…</p>
                            </div>
                        </div>
                    ) : !dynamicReport ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                <SchoolIcon className="w-8 h-8 text-indigo-300" />
                            </div>
                            <p className="text-gray-700 font-bold">No report data for {student.name} yet</p>
                            <p className="text-gray-400 text-sm max-w-sm">Enter this student’s results for the term, then reopen this preview. You can still generate a blank template with the button above.</p>
                            <button onClick={fetchMergedData} className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">
                                <RefreshIcon className="w-4 h-4" /> Reload
                            </button>
                        </div>
                    ) : (
                        <div ref={wrapCbRef} className="print-container flex justify-center w-full overflow-hidden">
                            {/* Scale wrapper: sized to the SCALED A4 so the sheet fits the
                                screen width on mobile without clipping or huge gaps. */}
                            <div style={scale < 1 ? { width: A4_W * scale, height: naturalH ? naturalH * scale : undefined } : undefined}>
                                {/* The A4 Container */}
                                <div
                                    ref={printRef}
                                    style={{
                                        ...(scale < 1 ? { transform: `scale(${scale})`, transformOrigin: 'top left' } : {}),
                                        ['--print-scale' as any]: printScale,
                                    }}
                                    className="printable-area w-[210mm] min-h-[297mm] bg-white text-gray-800 p-[20mm] shadow-xl border border-gray-200 relative group"
                                >
                                {/* Static Watermark */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                                    <SchoolIcon className="w-[400px] h-[400px] text-indigo-900" />
                                </div>

                                <div ref={contentRef} className="relative">
                                    {/* School Header */}
                                    <div className="text-center border-b-[3px] border-indigo-900 pb-5 mb-6 relative">
                                        <div className="flex justify-between items-start">
                                            <div className="w-28 h-28 bg-gray-50 rounded-[2.5rem] border border-gray-200 flex items-center justify-center shadow-inner p-3 overflow-hidden shrink-0">
                                                {schoolLogo ? (
                                                    <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                                                ) : (
                                                    <span className="text-5xl font-black text-indigo-900 leading-none">{schoolName.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 px-6 min-w-0">
                                                <h1 className={`${nameSizeClass} font-black text-gray-900 leading-none uppercase tracking-tighter mb-2 whitespace-nowrap`}>
                                                    {schoolName}
                                                </h1>
                                                <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs mb-4">
                                                    {currentSchool?.motto || 'Excellence in Education'}
                                                </p>
                                                {(currentSchool?.address || (currentSchool as any)?.phone) && (
                                                    <div className="flex justify-center items-center gap-6 text-[9px] font-black text-indigo-900/60 uppercase tracking-widest mt-2 border-t border-indigo-50 pt-3">
                                                        {currentSchool?.address && <span>{currentSchool.address}</span>}
                                                        {currentSchool?.address && (currentSchool as any)?.phone && <span className="w-1.5 h-1.5 rounded-full bg-indigo-200"></span>}
                                                        {(currentSchool as any)?.phone && <span>{(currentSchool as any).phone}</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-28 px-4 py-3 bg-gray-900 text-white rounded-3xl text-left">
                                                <div className="text-xs font-black uppercase tracking-tighter opacity-50 mb-1 leading-none">Session</div>
                                                <div className="text-sm font-black tracking-tight">{dynamicReport.session}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student Info Card */}
                                    <div className="grid grid-cols-2 gap-8 mb-6 bg-[#f8fafc] p-6 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
                                        <div className="space-y-4 relative">
                                            <div>
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full Student Name</div>
                                                <div className="text-2xl font-black text-indigo-950 uppercase tracking-tight leading-none">
                                                    {student.name}
                                                    <div className="h-1 w-20 bg-indigo-200 mt-2" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Student ID</div>
                                                <div className="font-black text-gray-700 text-sm">{student.schoolGeneratedId || 'UID-000000'}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-4 relative border-l border-gray-200 pl-8">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Academic Grade</div>
                                                    <div className="font-black text-indigo-600 uppercase bg-white px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm inline-block text-xs">
                                                        {student.grade} {student.section}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Academic Term</div>
                                                    <div className="font-black text-gray-700 uppercase text-xs">{dynamicReport.term}</div>
                                                </div>
                                            </div>
                                            {student.curriculum_type && (
                                                <div>
                                                    <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Curriculum</div>
                                                    <div className="font-black text-gray-700 uppercase text-xs">{student.curriculum_type}</div>
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</div>
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2Icon className="w-5 h-5 text-emerald-500" />
                                                    <span className="text-emerald-700 font-black text-xs uppercase tracking-widest">Verified</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Performance Table */}
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
                                                    <TrophyIcon className="w-6 h-6 text-white" />
                                                </div>
                                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Academic Performance</h3>
                                            </div>
                                            <div className="px-6 py-2 bg-indigo-50 rounded-full border border-indigo-100">
                                                <span className="text-xs font-black text-indigo-700 uppercase tracking-[0.2em]">Grading Scale</span>
                                            </div>
                                        </div>

                                        <div className="overflow-hidden border border-gray-200 rounded-[2.5rem] shadow-premium bg-white">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-gray-900 text-white">
                                                        <th className="py-3 px-10 text-xs font-black uppercase tracking-widest whitespace-nowrap">Subject</th>
                                                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-center whitespace-nowrap">1st Test</th>
                                                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-center whitespace-nowrap">2nd Test</th>
                                                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-center whitespace-nowrap">Exam</th>
                                                        <th className="py-3 px-4 text-xs font-black uppercase tracking-widest text-center whitespace-nowrap">Total</th>
                                                        <th className="py-3 px-10 text-xs font-black uppercase tracking-widest text-right whitespace-nowrap">Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {dynamicReport.academicRecords.length > 0 ? (
                                                        dynamicReport.academicRecords.map((item, index) => (
                                                            <tr key={index} className="hover:bg-gray-50 transition-colors group/row">
                                                                <td className="py-3 px-10 font-black text-gray-800 uppercase text-xs tracking-tight">{item.subject}</td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <div className="inline-block px-3 py-1 bg-gray-50 rounded-lg font-bold text-gray-600 text-xs">
                                                                        {item.test1 || '-'}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <div className="inline-block px-3 py-1 bg-gray-50 rounded-lg font-bold text-gray-600 text-xs">
                                                                        {item.test2 || '-'}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <div className="inline-block px-3 py-1 bg-gray-50 rounded-lg font-bold text-gray-600 text-xs">
                                                                        {item.exam || '-'}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 px-4 text-center">
                                                                    <div className="inline-block px-3 py-1 bg-indigo-50 rounded-lg font-black text-indigo-900 text-sm">
                                                                        {item.total}
                                                                    </div>
                                                                </td>
                                                                <td className={`py-3 px-10 text-right font-black text-xl ${getGradeColor(item.grade)}`}>
                                                                    {item.grade}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={3} className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                                                                No results recorded for this term yet
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Bottom Grid */}
                                    <div className="grid grid-cols-2 gap-8">
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
                                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{domain}</span>
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
                                                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Class Teacher’s Remark</h4>
                                            </div>
                                            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 min-h-[180px] relative">
                                                <div className="absolute top-4 left-4 text-3xl text-emerald-200 font-black">"</div>
                                                <p className="text-xs font-bold text-emerald-900 italic leading-relaxed px-4 pt-4">
                                                    {dynamicReport.teacherComment}
                                                </p>
                                                <div className="absolute bottom-6 right-8 text-right">
                                                    <div className="h-0.5 w-12 bg-emerald-200 mb-2 ml-auto" />
                                                    <p className="text-[9px] font-black text-emerald-700/60 uppercase tracking-widest leading-none">Class Teacher’s Signature</p>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                    {/* Verification Footer */}
                                    <div className="mt-20 pt-10 border-t border-gray-100 flex justify-between items-end">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Verification ID</p>
                                            <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 font-black text-gray-600 text-xs tracking-widest">
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
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] leading-none">Official Report Card</p>
                                        </div>
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
                    /* True A4 page, no browser margins — the sheet supplies its own. */
                    @page { size: A4 portrait; margin: 0; }
                    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

                    /* Hide the app behind the preview so only the report prints. */
                    #root { display: none !important; }
                    /* Hide the preview's own toolbar. */
                    .sticky { display: none !important; }

                    /* Flatten EVERY ancestor of the sheet (modal root → container →
                       scroll area → centering wrapper → mobile scale wrapper) so the A4
                       sheet flows from the page origin and is never offset, centered,
                       clipped, padded or shrunk by the on-screen layout. */
                    .fixed.inset-0,
                    .fixed.inset-0 > div,
                    .fixed.inset-0 > div > div:not(.sticky),
                    .print-container,
                    .print-container > div {
                        position: static !important;
                        display: block !important;
                        overflow: visible !important;
                        width: auto !important;
                        height: auto !important;
                        max-width: none !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        transform: none !important;
                        background: #fff !important;
                    }

                    .printable-area {
                        position: static !important;
                        width: 210mm !important;
                        min-height: 297mm !important;
                        height: auto !important;
                        margin: 0 auto !important;
                        padding: 14mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        transform: none !important; /* never print the on-screen mobile scale */
                        /* Shrink-to-fit ONE page. zoom (unlike transform) shrinks the layout
                           itself, so a long report no longer overflows onto a blank 2nd page. */
                        zoom: var(--print-scale, 1) !important;
                        background: #fff !important;
                    }
                    /* Keep table rows whole and repeat the column header on page 2+. */
                    .printable-area thead { display: table-header-group !important; }
                    .printable-area tr, .printable-area img { break-inside: avoid !important; page-break-inside: avoid !important; }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default ReportCardPreview;