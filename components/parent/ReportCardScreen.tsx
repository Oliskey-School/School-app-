import React, { useState, useMemo } from 'react';
import { SchoolLogoIcon, DocumentTextIcon } from '../../constants';
import { Student, ReportCard } from '../../types';
import { useAuth } from '../../context/AuthContext';

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-gray-100 p-2 rounded-md my-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
);

const InfoField: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-800 text-sm">{value}</p>
    </div>
);

const TermReport: React.FC<{ report: ReportCard, student: Student, schoolName?: string, logoUrl?: string }> = ({ report, student, schoolName, logoUrl }) => (
    <div className="printable-area bg-white p-4 sm:p-6 rounded-lg border border-gray-200 shadow-sm">
        <header className="text-center border-b-2 border-gray-300 pb-4 mb-4">
            <div className="flex justify-center items-center gap-2">
                {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain" />
                ) : (
                    <SchoolLogoIcon className="text-green-500 h-10 w-10" />
                )}
                <h1 className="text-2xl font-bold text-gray-800">{schoolName || 'School Academy'}</h1>
            </div>
            <p className="text-gray-600 font-sans font-semibold mt-1">END OF TERM REPORT CARD</p>
        </header>

        <SectionHeader title="Student Information" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-gray-900 font-sans">
            <InfoField label="Full Name" value={student.name} />
            <InfoField label="Class/Grade" value={`${student.grade}${student.section}`} />
            <InfoField label="Term" value={report.term} />
            <InfoField label="Session" value={report.session} />
        </div>

        <SectionHeader title="Academic Performance" />
        <div className="overflow-x-auto text-sm">
            <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100 text-left text-gray-700 font-sans font-bold">
                    <tr>
                        <th className="p-2 border border-gray-300">Subject</th>
                        <th className="p-2 border border-gray-300 w-16 text-center">CA</th>
                        <th className="p-2 border border-gray-300 w-16 text-center">Exam</th>
                        <th className="p-2 border border-gray-300 w-16 text-center">Total</th>
                        <th className="p-2 border border-gray-300 w-16 text-center">Grade</th>
                        <th className="p-2 border border-gray-300">Remark</th>
                    </tr>
                </thead>
                <tbody>
                    {report.academicRecords.map((record, index) => (
                        <tr key={index}>
                            <td className="p-2 border border-gray-300 font-semibold">{record.subject}</td>
                            <td className="p-2 border border-gray-300 text-center">{record.ca}</td>
                            <td className="p-2 border border-gray-300 text-center">{record.exam}</td>
                            <td className="p-2 border border-gray-300 text-center font-bold">{record.total}</td>
                            <td className="p-2 border border-gray-300 text-center font-bold">{record.grade}</td>
                            <td className="p-2 border border-gray-300 italic">"{record.remark}"</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <SectionHeader title="Comments" />
        <div className="space-y-4 font-sans">
            <div>
                <h4 className="font-bold text-gray-800">Teacher's Comment</h4>
                <div className="mt-1 p-3 text-sm bg-gray-50 rounded-md text-gray-800 italic">"{report.teacherComment}"</div>
            </div>
            <div>
                <h4 className="font-bold text-gray-800">Principal's Comment</h4>
                <div className="mt-1 p-3 text-sm bg-gray-50 rounded-md text-gray-800 italic">"{report.principalComment}"</div>
            </div>
        </div>
    </div>
);


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
                    <TermReport report={activeReport} student={student} schoolName={currentSchool?.name} logoUrl={currentSchool?.logoUrl} />
                ) : (
                    <p>Select a term to view the report.</p>
                )}

            </div>
        </div>
    );
};

export default ReportCardScreen;
