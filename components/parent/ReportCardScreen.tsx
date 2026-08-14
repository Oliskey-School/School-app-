import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { SchoolLogoIcon, DocumentTextIcon } from '../../constants';
import { Student, ReportCard, Rating } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import PremiumLoader from '../ui/PremiumLoader';
import { CANONICAL_TERMS, buildAnnualReportCard } from '../../utils/annualReport';

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-gray-100 p-2 rounded-md my-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
);

const InfoField: React.FC<{ label: string; value: string | number | undefined }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-800 text-sm">{value || '—'}</p>
    </div>
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

const TermReport: React.FC<{ report: ReportCard, student: Student, schoolName?: string, logoUrl?: string, motto?: string, address?: string }> = ({ report, student, schoolName, logoUrl, motto, address }) => {
    const SKILL_BEHAVIOUR_DOMAINS = ['Neatness', 'Punctuality', 'Politeness', 'Respect for Others', 'Participation in Class', 'Homework Completion', 'Teamwork/Cooperation', 'Attentiveness', 'Creativity', 'Honesty/Integrity'];
    const PSYCHOMOTOR_SKILLS = ['Handwriting', 'Drawing/Art Skills', 'Craft Skills', 'Music & Dance', 'Sports Participation'];

    const hasSkills = report.skills && Object.keys(report.skills).length > 0;
    const hasPsychomotor = report.psychomotor && Object.keys(report.psychomotor).length > 0;

    return (
        <div className="printable-area bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
            {/* School Header */}
            <header className="text-center border-b-2 border-green-300 pb-4 mb-4">
                <div className="flex justify-center items-center gap-3">
                    {logoUrl ? (
                        <img src={logoUrl} alt="School Logo" className="h-14 w-14 object-contain rounded-lg" />
                    ) : (
                        <SchoolLogoIcon className="text-green-500 h-12 w-12" />
                    )}
                    <h1 className="text-2xl font-bold text-gray-800">{schoolName || 'School Academy'}</h1>
                </div>
                {motto && <p className="text-gray-500 italic text-xs mt-1">"{motto}"</p>}
                {address && <p className="text-gray-400 text-xs mt-0.5">{address}</p>}
                <p className="text-green-600 font-sans font-bold uppercase tracking-widest text-xs mt-2">End of Term Report Card</p>
            </header>

            {/* Student Information */}
            <SectionHeader title="Student Information" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-gray-900 font-sans">
                <InfoField label="Full Name" value={student.name} />
                <InfoField label="Class/Grade" value={`${student.grade}${student.section}`} />
                <InfoField label="Term" value={report.term} />
                <InfoField label="Session" value={report.session} />
                {student.admission_number && <InfoField label="Admission No." value={student.admission_number} />}
                {student.curriculum_type && <InfoField label="Curriculum" value={student.curriculum_type} />}
                {student.gender && <InfoField label="Gender" value={student.gender} />}
                {(student.birthday || student.dateOfBirth) && <InfoField label="Date of Birth" value={student.birthday || student.dateOfBirth} />}
                {report.position && <InfoField label="Position in Class" value={`${report.position}${report.totalStudents ? ` / ${report.totalStudents}` : ''}`} />}
            </div>

            {/* Academic Performance */}
            <SectionHeader title="Academic Performance" />
            <div className="overflow-x-auto text-sm">
                <table className="min-w-full border-collapse border border-gray-300">
                    <thead className="sticky top-0 z-10 bg-green-50 text-left text-gray-700 font-sans font-bold">
                        <tr>
                            <th className="sticky left-0 z-10 bg-green-50 p-2 border border-gray-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Subject</th>
                            <th className="p-2 border border-gray-300 w-16 text-center">CA (40)</th>
                            <th className="p-2 border border-gray-300 w-16 text-center">Exam (60)</th>
                            <th className="p-2 border border-gray-300 w-16 text-center bg-green-100">Total (100)</th>
                            <th className="p-2 border border-gray-300 w-16 text-center">Grade</th>
                            <th className="p-2 border border-gray-300">Remark</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.academicRecords && report.academicRecords.length > 0 ? (
                            report.academicRecords.map((record, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className={`sticky left-0 z-[5] p-2 border border-gray-300 font-semibold shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>{record.subject}</td>
                                    <td className="p-2 border border-gray-300 text-center">{record.ca}</td>
                                    <td className="p-2 border border-gray-300 text-center">{record.exam}</td>
                                    <td className="p-2 border border-gray-300 text-center font-bold">{record.total}</td>
                                    <td className="p-2 border border-gray-300 text-center font-bold">{record.grade}</td>
                                    <td className="p-2 border border-gray-300 italic text-gray-600">"{record.remark}"</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="p-4 text-center text-gray-500 italic">No academic records available.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Skills & Behaviour + Psychomotor */}
            {(hasSkills || hasPsychomotor) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 mt-2">
                    {hasSkills && (
                        <div>
                            <SectionHeader title="Skills & Behaviour" />
                            <table className="w-full text-sm font-sans">
                                <tbody>
                                    {SKILL_BEHAVIOUR_DOMAINS.map(skill => (
                                        report.skills[skill] ? (
                                            <tr key={skill} className="border-b border-gray-100">
                                                <td className="py-1.5 text-gray-700">{skill}</td>
                                                <td className="w-16 text-right"><RatingBadge rating={report.skills[skill]} /></td>
                                            </tr>
                                        ) : null
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {hasPsychomotor && (
                        <div>
                            <SectionHeader title="Psychomotor Skills" />
                            <table className="w-full text-sm font-sans">
                                <tbody>
                                    {PSYCHOMOTOR_SKILLS.map(skill => (
                                        report.psychomotor[skill] ? (
                                            <tr key={skill} className="border-b border-gray-100">
                                                <td className="py-1.5 text-gray-700">{skill}</td>
                                                <td className="w-16 text-right"><RatingBadge rating={report.psychomotor[skill]} /></td>
                                            </tr>
                                        ) : null
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Attendance Record */}
            {report.attendance && (report.attendance.present > 0 || report.attendance.absent > 0) && (
                <>
                    <SectionHeader title="Attendance Record" />
                    <div className="grid grid-cols-4 gap-4 text-sm font-sans">
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-gray-500 font-medium">Total Days</p>
                            <p className="text-lg font-bold text-gray-800">{report.attendance.total}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-green-600 font-medium">Present</p>
                            <p className="text-lg font-bold text-green-700">{report.attendance.present}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-red-600 font-medium">Absent</p>
                            <p className="text-lg font-bold text-red-700">{report.attendance.absent}</p>
                        </div>
                        <div className="bg-amber-50 p-3 rounded-lg text-center">
                            <p className="text-xs text-amber-600 font-medium">Late</p>
                            <p className="text-lg font-bold text-amber-700">{report.attendance.late}</p>
                        </div>
                    </div>
                </>
            )}

            {/* Comments */}
            <SectionHeader title="Comments" />
            <div className="space-y-4 font-sans">
                <div>
                    <h4 className="font-bold text-gray-800">Teacher's Comment</h4>
                    <div className="mt-1 p-3 text-sm bg-gray-50 rounded-md text-gray-800 italic">"{report.teacherComment || 'No comment provided.'}"</div>
                </div>
                <div>
                    <h4 className="font-bold text-gray-800">Principal's Comment</h4>
                    <div className="mt-1 p-3 text-sm bg-gray-50 rounded-md text-gray-800 italic">"{report.principalComment || 'No comment provided.'}"</div>
                </div>
            </div>
        </div>
    );
};

interface ReportCardScreenProps {
    student: Student;
    // Carried over from SelectReportTermScreen when the caller already picked
    // a specific year/term — pre-selects that report instead of defaulting to
    // the most recent one.
    term?: string;
    session?: string;
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const ReportCardScreen: React.FC<ReportCardScreenProps> = ({ student, term, session, navigateTo }) => {
    if (!student) return <div className="flex items-center justify-center min-h-[40vh] p-8 text-center text-gray-500">Select a child to view their report card.</div>;
    const { currentSchool } = useAuth();
    const publishedReportsSummary = useMemo(() =>
        ((student.reportCards || (student as any).report_cards || []) as ReportCard[]).filter(r => r.status === 'Published'),
        [student]
    );

    const mapRawReportCard = (details: any, term: string, session: string): ReportCard => ({
        ...details,
        term: details.term || term,
        session: details.session || session,
        academicRecords: details.academic_records || details.academicRecords || [],
        skills: details.skills || {},
        psychomotor: details.psychomotor || {},
        attendance: details.attendance || { total: 0, present: 0, absent: 0, late: 0 },
        teacherComment: details.teacher_comment || details.teacherComment || '',
        principalComment: details.principal_comment || details.principalComment || '',
        status: details.status || 'Published',
        position: details.position,
        totalStudents: details.total_students || details.totalStudents
    });

    // Every session that has at least one published report gets all three
    // canonical term tabs, not just the ones already published — a term the
    // school hasn't published yet still shows as a tab (with a "not
    // published yet" message), and Third Term always shows a combined
    // annual view built from whichever terms ARE published, rather than
    // being missing entirely until someone separately publishes it.
    const tabEntries = useMemo(() => {
        const sessions = Array.from(new Set(publishedReportsSummary.map(r => r.session)));
        const entries: { term: string; session: string; synthetic: boolean; published: boolean }[] = [];
        sessions.forEach(sessionName => {
            CANONICAL_TERMS.forEach(termName => {
                const real = publishedReportsSummary.find(r => r.term === termName && r.session === sessionName);
                if (real) {
                    entries.push({ term: termName, session: sessionName, synthetic: false, published: true });
                } else if (termName === 'Third Term') {
                    entries.push({ term: termName, session: sessionName, synthetic: true, published: false });
                } else {
                    entries.push({ term: termName, session: sessionName, synthetic: false, published: false });
                }
            });
        });
        return entries;
    }, [publishedReportsSummary]);

    const requestedKey = term && session ? `${term}|${session}` : null;
    const requestedExists = requestedKey && tabEntries.some(r => `${r.term}|${r.session}` === requestedKey);

    const [activeReportKey, setActiveReportKey] = useState<string | null>(
        requestedExists ? requestedKey : (tabEntries[0] ? `${tabEntries[0].term}|${tabEntries[0].session}` : null)
    );
    const [activeReport, setActiveReport] = useState<ReportCard | null>(null);
    const [loading, setLoading] = useState(false);

    const activeEntry = useMemo(() => {
        if (!activeReportKey) return null;
        const [t, s] = activeReportKey.split('|');
        return tabEntries.find(r => r.term === t && r.session === s) || null;
    }, [activeReportKey, tabEntries]);

    const fetchDetails = useCallback(async () => {
        if (!activeReportKey || !student.id) return;

        // Find session and term from key
        const [term, session] = activeReportKey.split('|');
        const entry = tabEntries.find(r => r.term === term && r.session === session);
        if (!entry) return;

        // A genuinely unpublished term (not the computed Third Term annual)
        // has nothing to fetch — show the "not published yet" state instead.
        if (!entry.published && !entry.synthetic) {
            setActiveReport(null);
            return;
        }

        setLoading(true);
        try {
            if (entry.synthetic) {
                const sessionSummaries = publishedReportsSummary.filter(
                    r => r.session === session && CANONICAL_TERMS.includes(r.term)
                );
                const details = await Promise.all(
                    sessionSummaries.map(s => api.getReportCardDetails(student.id, s.term, s.session).catch(() => null))
                );
                const mapped = sessionSummaries
                    .map((s, i) => ({ summary: s, raw: details[i] }))
                    .filter(p => p.raw)
                    .map(p => mapRawReportCard(p.raw, p.summary.term, p.summary.session));
                setActiveReport(buildAnnualReportCard(mapped));
            } else {
                const details = await api.getReportCardDetails(student.id, term, session);
                if (details) setActiveReport(mapRawReportCard(details, term, session));
            }
        } catch (err) {
            console.error("Error fetching report details:", err);
        } finally {
            setLoading(false);
        }
    }, [activeReportKey, student.id, tabEntries, publishedReportsSummary]);

    // Real-time synchronization
    useAutoSync(['report_cards', 'academic_records'], fetchDetails);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    const handlePrint = () => {
        window.print();
    };

    if (publishedReportsSummary.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-50 h-full flex flex-col justify-center">
                <h3 className="font-bold text-lg text-gray-800">No Published Reports</h3>
                <p className="text-gray-600 mt-2">Report cards for this session have not been published yet.</p>
            </div>
        );
    }

    // A specific term/session was requested (came from SelectReportTermScreen)
    // but this child has no published report for it — say so plainly rather
    // than silently substituting a different term's report.
    if (requestedKey && !requestedExists) {
        return (
            <div className="p-6 text-center bg-gray-50 h-full flex flex-col justify-center">
                <h3 className="font-bold text-lg text-gray-800">No Report for {term} · {session}</h3>
                <p className="text-gray-600 mt-2">That term hasn't been published for {student.name} yet.</p>
                {navigateTo && (
                    <button
                        onClick={() => navigateTo('selectReportTerm', 'Select Term', { student })}
                        className="mt-4 mx-auto px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                    >
                        Pick Another Term
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-4 bg-gray-50 font-serif min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="mb-4 flex flex-wrap justify-between items-center gap-2 print:hidden">
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg overflow-x-auto scrollbar-hide">
                        {tabEntries.map(entry => {
                            const reportKey = `${entry.term}|${entry.session}`;
                            const isUniqueSession = tabEntries.filter(r => r.term === entry.term).length > 1;

                            return (
                                <motion.button
                                    key={reportKey}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setActiveReportKey(reportKey)}
                                    className={`relative px-3 py-1.5 text-sm font-sans font-semibold rounded-md whitespace-nowrap ${activeReportKey === reportKey ? 'text-green-600' : 'text-gray-600'
                                        }`}
                                >
                                    {activeReportKey === reportKey && (
                                        <motion.div layoutId="reportTermTab" transition={{ type: 'spring', stiffness: 400, damping: 30 }} className="absolute inset-0 bg-white rounded-md shadow-sm" />
                                    )}
                                    <span className="relative z-10">{entry.term}{entry.synthetic ? ' (Annual)' : ''} {isUniqueSession ? `(${entry.session})` : ''}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2">
                        {navigateTo && (
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => navigateTo('selectReportTerm', 'Select Term', { student })}
                                className="px-3 py-2 text-sm font-sans font-semibold text-green-700 hover:underline"
                            >
                                Change Year/Term
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={handlePrint}
                            disabled={!activeReport || loading}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white font-sans font-semibold rounded-lg shadow-md hover:bg-green-600 disabled:opacity-50"
                        >
                            <DocumentTextIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Print</span>
                        </motion.button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12">
                        <PremiumLoader message="Fetching report details..." />
                    </div>
                ) : activeReport ? (
                    <AnimatePresence mode="wait">
                        <motion.div key={activeReportKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                            <TermReport
                                report={activeReport}
                                student={student}
                                schoolName={currentSchool?.name}
                                logoUrl={currentSchool?.logoUrl}
                                motto={currentSchool?.motto}
                                address={currentSchool?.address}
                            />
                        </motion.div>
                    </AnimatePresence>
                ) : activeEntry && !activeEntry.published && !activeEntry.synthetic ? (
                    <div className="p-12 text-center bg-white rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg text-gray-800">Not Published Yet</h3>
                        <p className="text-gray-500 mt-2">{activeEntry.term} results for {activeEntry.session} haven't been published by the school yet.</p>
                    </div>
                ) : (
                    <div className="p-12 text-center bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 italic">Select a term to view the report.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportCardScreen;
