import React from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, Calendar, Hash } from 'lucide-react';

interface ReportProps {
    summary: any;
    grades: any[];
    schoolName: string;
}

export const DigitalReportCard: React.FC<ReportProps> = ({ summary, grades, schoolName }) => {
    return (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-4xl mx-auto font-serif">
            {/* Header */}
            <div className="text-center space-y-2 mb-10 border-b pb-6">
                <h1 className="text-3xl font-black text-gray-900 uppercase">{schoolName}</h1>
                <p className="text-sm font-bold text-indigo-600 tracking-widest">OFFICIAL ACADEMIC REPORT</p>
                <div className="flex justify-center gap-6 text-xs text-gray-500 font-sans mt-4">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> SESSION: {summary.session}</span>
                    <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5"/> TERM: {summary.term}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Position</p>
                    <p className="text-2xl font-black text-indigo-700">{summary.position_in_class} / {summary.total_students_in_class}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Average</p>
                    <p className="text-2xl font-black text-emerald-700">{Math.round(summary.average_score)}%</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Attendance</p>
                    <p className="text-2xl font-black text-blue-700">{summary.attendance_count || 'N/A'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-purple-400 uppercase mb-1">Grade</p>
                    <p className="text-2xl font-black text-purple-700">{summary.average_score >= 75 ? 'A' : 'B'}</p>
                </div>
            </div>

            {/* Grades Table */}
            <table className="w-full border-collapse mb-8 font-sans">
                <thead>
                    <tr className="bg-gray-900 text-white text-[10px] uppercase tracking-widest">
                        <th className="p-3 text-left">Subject</th>
                        <th className="p-3 text-center">CA (40)</th>
                        <th className="p-3 text-center">Exam (60)</th>
                        <th className="p-3 text-center">Total</th>
                        <th className="p-3 text-center">Grade</th>
                    </tr>
                </thead>
                <tbody className="divide-y border-b">
                    {grades.map((g, i) => (
                        <tr key={i} className="text-sm">
                            <td className="p-3 font-bold text-gray-800">{g.subject}</td>
                            <td className="p-3 text-center text-gray-500">{g.ca_score}</td>
                            <td className="p-3 text-center text-gray-500">{g.exam_score}</td>
                            <td className="p-3 text-center font-black text-gray-900">{g.total_score}</td>
                            <td className="p-3 text-center font-bold text-indigo-600">{g.grade}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Remarks */}
            <div className="space-y-4 font-sans">
                <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Principal's Remark</p>
                    <p className="text-sm italic text-gray-700 leading-relaxed">
                        "{summary.principal_remark || 'A very good performance. Keep maintaining this standard.'}"
                    </p>
                </div>
            </div>

            {/* Seal/Verification */}
            <div className="mt-12 flex justify-between items-end opacity-50">
                <div className="text-center">
                    <div className="w-32 border-b border-gray-900 mb-2"></div>
                    <p className="text-[10px] font-bold">Class Teacher Signature</p>
                </div>
                <div className="text-center">
                    <div className="w-32 border-b border-gray-900 mb-2"></div>
                    <p className="text-[10px] font-bold">School Registrar Seal</p>
                </div>
            </div>
        </div>
    );
};
