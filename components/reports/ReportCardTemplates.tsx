import React from 'react';
import { Card } from '../ui/card';

interface Student {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    class_name: string;
    admission_number?: string;
}

interface Result {
    subject: string;
    ca_score?: number;
    exam_score?: number;
    total: number;
    grade: string;
    remark: string;
}

interface ReportCardProps {
    student: Student;
    results: Result[];
    term: string;
    academicYear: string;
    schoolName: string;
    schoolAddress: string;
    schoolLogo?: string;
    principalSignature?: string;
}

// Nigerian Report Card (WAEC/NECO Format)
export function NigerianReportCard({
    student,
    results,
    term,
    academicYear,
    schoolName,
    schoolAddress,
    schoolLogo,
    principalSignature
}: ReportCardProps) {

    const totalScore = results.reduce((sum, r) => sum + r.total, 0);
    const averageScore = results.length > 0 ? (totalScore / results.length).toFixed(2) : '0.00';

    const getPosition = () => {
        if (parseFloat(averageScore) >= 70) return '1st';
        if (parseFloat(averageScore) >= 60) return '2nd';
        if (parseFloat(averageScore) >= 50) return '3rd';
        return 'N/A';
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white p-8 print:p-6" style={{ fontFamily: 'serif' }}>
            {/* Header */}
            <div className="text-center border-b-4 border-green-700 pb-4 mb-6">
                {schoolLogo && (
                    <img src={schoolLogo} alt="School Logo" className="w-24 h-24 mx-auto mb-2" />
                )}
                <h1 className="text-3xl font-bold text-green-800">{schoolName}</h1>
                <p className="text-sm text-gray-600">{schoolAddress}</p>
                <p className="text-sm text-gray-600">Nigerian Curriculum (WAEC/NECO)</p>
                <h2 className="text-xl font-semibold mt-4 text-green-700">TERMLY REPORT CARD</h2>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="space-y-1">
                    <p><strong>Student Name:</strong> {student.first_name} {student.last_name}</p>
                    <p><strong>Admission No:</strong> {student.admission_number || 'N/A'}</p>
                    <p><strong>Class:</strong> {student.class_name}</p>
                </div>
                <div className="space-y-1">
                    <p><strong>Term:</strong> {term}</p>
                    <p><strong>Session:</strong> {academicYear}</p>
                    <p><strong>Date of Birth:</strong> {new Date(student.date_of_birth).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Results Table */}
            <table className="w-full border-collapse border-2 border-gray-800 mb-6 text-sm">
                <thead>
                    <tr className="bg-green-100">
                        <th className="border border-gray-800 p-2 text-left">SUBJECT</th>
                        <th className="border border-gray-800 p-2 text-center">CA (40)</th>
                        <th className="border border-gray-800 p-2 text-center">EXAM (60)</th>
                        <th className="border border-gray-800 p-2 text-center">TOTAL (100)</th>
                        <th className="border border-gray-800 p-2 text-center">GRADE</th>
                        <th className="border border-gray-800 p-2 text-center">REMARK</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((result, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="border border-gray-800 p-2">{result.subject}</td>
                            <td className="border border-gray-800 p-2 text-center">{result.ca_score || '-'}</td>
                            <td className="border border-gray-800 p-2 text-center">{result.exam_score || '-'}</td>
                            <td className="border border-gray-800 p-2 text-center font-semibold">{result.total}</td>
                            <td className="border border-gray-800 p-2 text-center font-bold">{result.grade}</td>
                            <td className="border border-gray-800 p-2 text-center">{result.remark}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-green-200 font-bold">
                        <td colSpan={3} className="border border-gray-800 p-2 text-right">TOTAL:</td>
                        <td className="border border-gray-800 p-2 text-center">{totalScore}</td>
                        <td colSpan={2} className="border border-gray-800 p-2 text-center">AVG: {averageScore}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Grading Scale */}
            <div className="mb-6 p-3 bg-gray-50 border rounded">
                <h3 className="font-semibold mb-2">Grading Scale:</h3>
                <div className="grid grid-cols-6 gap-2 text-xs">
                    <div><strong>A:</strong> 70-100 (Excellent)</div>
                    <div><strong>B:</strong> 60-69 (Very Good)</div>
                    <div><strong>C:</strong> 50-59 (Good)</div>
                    <div><strong>D:</strong> 45-49 (Pass)</div>
                    <div><strong>E:</strong> 40-44 (Weak Pass)</div>
                    <div><strong>F:</strong> 0-39 (Fail)</div>
                </div>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
                <div className="border p-3 rounded">
                    <p className="font-semibold">Overall Average:</p>
                    <p className="text-2xl font-bold text-green-700">{averageScore}%</p>
                </div>
                <div className="border p-3 rounded">
                    <p className="font-semibold">Position in Class:</p>
                    <p className="text-2xl font-bold text-green-700">{getPosition()}</p>
                </div>
                <div className="border p-3 rounded">
                    <p className="font-semibold">No. of Subjects:</p>
                    <p className="text-2xl font-bold text-green-700">{results.length}</p>
                </div>
            </div>

            {/* Teacher's Comments */}
            <div className="mb-4">
                <p className="font-semibold text-sm">Class Teacher's Remarks:</p>
                <div className="border-b-2 border-dotted h-12"></div>
            </div>

            {/* Principal's Signature */}
            <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
                <div>
                    <p className="font-semibold mb-2">Class Teacher's Signature:</p>
                    <div className="border-b-2 border-black w-48"></div>
                </div>
                <div>
                    <p className="font-semibold mb-2">Principal's Signature:</p>
                    {principalSignature ? (
                        <img src={principalSignature} alt="Signature" className="h-12" />
                    ) : (
                        <div className="border-b-2 border-black w-48"></div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
                <p>🇳🇬 Nigerian Curriculum | WAEC/NECO Standard Format</p>
                <p>Generated on {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}

// British Report Card (Cambridge/Edexcel Format)
export function BritishReportCard({
    student,
    results,
    term,
    academicYear,
    schoolName,
    schoolAddress,
    schoolLogo,
    principalSignature
}: ReportCardProps) {

    const getGradePoints = (grade: string): number => {
        const gradeMap: { [key: string]: number } = {
            'A*': 9, 'A': 8, 'B': 7, 'C': 6, 'D': 5, 'E': 4, 'F': 3, 'G': 2, 'U': 1
        };
        return gradeMap[grade] || 0;
    };

    const averageGradePoint = results.length > 0
        ? (results.reduce((sum, r) => sum + getGradePoints(r.grade), 0) / results.length).toFixed(2)
        : '0.00';

    return (
        <div className="w-full max-w-4xl mx-auto bg-white p-8 print:p-6" style={{ fontFamily: 'Georgia, serif' }}>
            {/* Header */}
            <div className="text-center border-b-4 border-blue-700 pb-4 mb-6">
                {schoolLogo && (
                    <img src={schoolLogo} alt="School Logo" className="w-24 h-24 mx-auto mb-2" />
                )}
                <h1 className="text-3xl font-bold text-blue-800">{schoolName}</h1>
                <p className="text-sm text-gray-600">{schoolAddress}</p>
                <p className="text-sm text-gray-600">British Curriculum (Cambridge International)</p>
                <h2 className="text-xl font-semibold mt-4 text-blue-700">PROGRESS REPORT</h2>
            </div>

            {/* Student Info */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="space-y-1">
                    <p><strong>Pupil Name:</strong> {student.first_name} {student.last_name}</p>
                    <p><strong>Student ID:</strong> {student.admission_number || 'N/A'}</p>
                    <p><strong>Year Group:</strong> {student.class_name}</p>
                </div>
                <div className="space-y-1">
                    <p><strong>Term:</strong> {term}</p>
                    <p><strong>Academic Year:</strong> {academicYear}</p>
                    <p><strong>Date of Birth:</strong> {new Date(student.date_of_birth).toLocaleDateString()}</p>
                </div>
            </div>

            {/* Results Table */}
            <table className="w-full border-collapse border-2 border-gray-700 mb-6 text-sm">
                <thead>
                    <tr className="bg-blue-100">
                        <th className="border border-gray-700 p-3 text-left">SUBJECT</th>
                        <th className="border border-gray-700 p-3 text-center">COURSEWORK</th>
                        <th className="border border-gray-700 p-3 text-center">EXAMINATION</th>
                        <th className="border border-gray-700 p-3 text-center">GRADE</th>
                        <th className="border border-gray-700 p-3 text-left">TEACHER COMMENT</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((result, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                            <td className="border border-gray-700 p-3">{result.subject}</td>
                            <td className="border border-gray-700 p-3 text-center">{result.ca_score || '-'}</td>
                            <td className="border border-gray-700 p-3 text-center">{result.exam_score || '-'}</td>
                            <td className="border border-gray-700 p-3 text-center font-bold text-lg">{result.grade}</td>
                            <td className="border border-gray-700 p-3 text-xs italic">{result.remark}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Grading Scale */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold mb-2">Cambridge Grading Criteria:</h3>
                <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><strong>A*:</strong> 90-100 (Outstanding)</div>
                    <div><strong>A:</strong> 80-89 (Excellent)</div>
                    <div><strong>B:</strong> 70-79 (Very Good)</div>
                    <div><strong>C:</strong> 60-69 (Good)</div>
                    <div><strong>D:</strong> 50-59 (Satisfactory)</div>
                    <div><strong>E:</strong> 40-49 (Pass)</div>
                    <div><strong>F/G:</strong> 30-39 (Weak)</div>
                    <div><strong>U:</strong> 0-29 (Ungraded)</div>
                </div>
            </div>

            {/* Performance Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border p-4 rounded bg-gray-50">
                    <p className="font-semibold text-sm">Average Grade Point:</p>
                    <p className="text-3xl font-bold text-blue-700">{averageGradePoint}</p>
                    <p className="text-xs text-gray-600 mt-1">Scale: 1 (U) to 9 (A*)</p>
                </div>
                <div className="border p-4 rounded bg-gray-50">
                    <p className="font-semibold text-sm">Subjects Studied:</p>
                    <p className="text-3xl font-bold text-blue-700">{results.length}</p>
                    <p className="text-xs text-gray-600 mt-1">IGCSE Programme</p>
                </div>
            </div>

            {/* Tutor's Comments */}
            <div className="mb-6 border p-4 rounded">
                <p className="font-semibold text-sm mb-2">Form Tutor's Report:</p>
                <div className="border-b-2 border-dotted h-16"></div>
            </div>

            {/* Head of Year Comment */}
            <div className="mb-6 border p-4 rounded">
                <p className="font-semibold text-sm mb-2">Headteacher's Comment:</p>
                <div className="border-b-2 border-dotted h-16"></div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
                <div>
                    <p className="font-semibold mb-2">Form Tutor:</p>
                    <div className="border-b-2 border-black w-48"></div>
                    <p className="text-xs text-gray-500 mt-1">Signature & Date</p>
                </div>
                <div>
                    <p className="font-semibold mb-2">Headteacher:</p>
                    {principalSignature ? (
                        <img src={principalSignature} alt="Signature" className="h-12" />
                    ) : (
                        <div className="border-b-2 border-black w-48"></div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Signature & Date</p>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
                <p>🇬🇧 British Curriculum | Cambridge International Examinations</p>
                <p>Report generated on {new Date().toLocaleDateString()}</p>
            </div>
        </div>
    );
}

// Dual Curriculum Wrapper - Generates both PDFs
export function DualCurriculumReportCard(props: ReportCardProps & { curriculumType: 'Both' }) {
    return (
        <div className="space-y-8">
            <div className="page-break-after">
                <NigerianReportCard {...props} />
            </div>
            <div>
                <BritishReportCard {...props} />
            </div>
        </div>
    );
}

// PDF Print Styles
export const reportCardPrintStyles = `
  @media print {
    .page-break-after {
      page-break-after: always;
    }
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
`;
