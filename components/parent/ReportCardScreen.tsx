import React, { useState, useMemo } from 'react';
import { SchoolLogoIcon, DocumentTextIcon } from '../../constants';
import { Student, ReportCard, Rating } from '../../types';
import { useAuth } from '../../context/AuthContext';

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
            {student.gender && <InfoField label="Gender" value={student.gender} />}
            {(student.birthday || student.dateOfBirth) && <InfoField label="Date of Birth" value={student.birthday || student.dateOfBirth} />}
            {report.position && <InfoField label="Position in Class" value={`${report.position}${report.totalStudents ? ` / ${report.totalStudents}` : ''}`} />}
        </div>

        {/* Academic Performance */}
        <SectionHeader title="Academic Performance" />
        <div className="overflow-x-auto text-sm">
            <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-green-50 text-left text-gray-700 font-sans font-bold">
                    <tr>
                        <th className="p-2 border border-gray-300">Subject</th>
                        <th className="p-2 border border-gray-300 w-16 text-center">CA (40)</th>
                        <th className="p-2 border border-gray-300 w-16 text-center">Exam (60)</th>
                        <th className="p-2 border border-gray-300 w-16 text-center bg-green-100">Total (100)</th>
                        <th className="p-2 border border-gray-300 w-16 text-center">Grade</th>
                        <th className="p-2 border border-gray-300">Remark</th>
                    </tr>
                </thead>
                <tbody>
                    {report.academicRecords.map((record, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="p-2 border border-gray-300 font-semibold">{record.subject}</td>
                            <td className="p-2 border border-gray-300 text-center">{record.ca}</td>
                            <td className="p-2 border border-gray-300 text-center">{record.exam}</td>
                            <td className="p-2 border border-gray-300 text-center font-bold">{record.total}</td>
                            <td className="p-2 border border-gray-300 text-center font-bold">{record.grade}</td>
                            <td className="p-2 border border-gray-300 italic text-gray-600">"{record.remark}"</td>
                        </tr>
                    ))}
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
}

const ReportCardScreen: React.FC<ReportCardScreenProps> = ({ student }) => {
    const { currentSchool } = useAuth();
    const publishedReports = useMemo(() =>
        (student.reportCards || []).filter(r => r.status === 'Published'),
        [student]
    );

    const [activeTerm, setActiveTerm] = useState(publishedReports[0]?.term || null);

    const handlePrint = () => {
        window.print();
    };

    const activeReport = publishedReports.find(r => r.term === activeTerm);

    if (publishedReports.length === 0) {
        return (
            <div className="p-6 text-center bg-gray-50 h-full flex flex-col justify-center">
                <h3 className="font-bold text-lg text-gray-800">No Published Reports</h3>
                <p className="text-gray-600 mt-2">Report cards for this session have not been published yet.</p>
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-4 bg-gray-50 font-serif min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="mb-4 flex justify-between items-center print:hidden">
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                        {publishedReports.map(report => (
                            <button
                                key={report.term}
                                onClick={() => setActiveTerm(report.term)}
                                className={`px-3 py-1.5 text-sm font-sans font-semibold rounded-md transition-colors ${activeTerm === report.term ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600'
                                    }`}
                            >
                                {report.term}
                            </button>
                        ))}
                    </div>
                    <button onClick={handlePrint} className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white font-sans font-semibold rounded-lg shadow-md hover:bg-green-600">
                        <DocumentTextIcon className="w-5 h-5" />
                        <span>Print</span>
                    </button>
                </div>

                {activeReport ? (
                    <TermReport
                        report={activeReport}
                        student={student}
                        schoolName={currentSchool?.name}
                        logoUrl={currentSchool?.logoUrl}
                        motto={currentSchool?.motto}
                        address={currentSchool?.address}
                    />
                ) : (
                    <p>Select a term to view the report.</p>
                )}

            </div>
        </div>
    );
};

export default ReportCardScreen;
