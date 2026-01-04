import React, { useRef } from 'react';
import { Download, FileText, CheckCircle, AlertCircle, Building2, Calendar, Award } from 'lucide-react';

interface InspectionReportPDFProps {
    inspection: any;
    school: any;
    inspector: any;
    categories: any[];
    onDownload?: () => void;
}

export default function InspectionReportPDF({
    inspection,
    school,
    inspector,
    categories,
    onDownload
}: InspectionReportPDFProps) {
    const reportRef = useRef<HTMLDivElement>(null);

    const getRatingColor = (rating: string) => {
        switch (rating) {
            case 'Outstanding':
                return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'Good':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'Requires Improvement':
                return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'Inadequate':
                return 'text-red-600 bg-red-50 border-red-200';
            default:
                return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const handleDownload = () => {
        // In a real implementation, this would use a library like jsPDF or html2pdf
        // For now, we'll trigger the browser's print dialog
        window.print();
        onDownload?.();
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Action Bar */}
                <div className="mb-6 flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Inspection Report</h2>
                        <p className="text-sm text-slate-600">Reference: INS-{inspection.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <button
                        onClick={handleDownload}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Download PDF
                    </button>
                </div>

                {/* Report Container */}
                <div
                    ref={reportRef}
                    className="bg-white shadow-2xl rounded-xl overflow-hidden print:shadow-none print:rounded-none"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold">Official Inspection Report</h1>
                                        <p className="text-indigo-100 text-sm">Ministry of Education</p>
                                    </div>
                                </div>
                                <div className="space-y-1 text-sm text-indigo-100">
                                    <p>Federal Republic of Nigeria</p>
                                    <p>Education Quality Assurance Division</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`inline-block px-4 py-2 rounded-lg border-2 ${getRatingColor(inspection.overall_rating)}`}>
                                    <p className="text-xs font-semibold uppercase tracking-wide mb-1">Overall Rating</p>
                                    <p className="text-xl font-bold">{inspection.overall_rating}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* School Information */}
                    <div className="p-8 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                            School Information
                        </h2>
                        <div className="grid grid-cols-2 gap-6">
                            <InfoField label="School Name" value={school.name} />
                            <InfoField label="School Code" value={school.school_code || 'N/A'} />
                            <InfoField label="Address" value={school.address} />
                            <InfoField label="Curriculum Type" value={school.curriculum_type || 'Nigerian'} />
                            <InfoField label="Principal" value={school.principal_name || 'N/A'} />
                            <InfoField label="Contact" value={school.contact_email || 'N/A'} />
                        </div>
                    </div>

                    {/* Inspection Details */}
                    <div className="p-8 border-b border-slate-200 bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-indigo-600" />
                            Inspection Details
                        </h2>
                        <div className="grid grid-cols-3 gap-6">
                            <InfoField
                                label="Inspection Date"
                                value={new Date(inspection.inspection_date).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            />
                            <InfoField label="Inspection Type" value={inspection.inspection_type} />
                            <InfoField label="Status" value={inspection.status} />
                            <InfoField label="Inspector Name" value={inspector.full_name} />
                            <InfoField label="Inspector Code" value={inspector.inspector_code} />
                            <InfoField label="Department" value={inspector.ministry_department} />
                        </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="p-8 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Performance Summary</h2>
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
                            <div className="grid grid-cols-3 gap-6 text-center">
                                <div>
                                    <p className="text-sm text-slate-600 mb-2">Total Score</p>
                                    <p className="text-4xl font-bold text-indigo-600">{inspection.total_score}</p>
                                    <p className="text-sm text-slate-500">out of {inspection.max_score}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 mb-2">Percentage</p>
                                    <p className="text-4xl font-bold text-purple-600">{inspection.percentage}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-600 mb-2">Overall Rating</p>
                                    <p className={`text-2xl font-bold ${getRatingColor(inspection.overall_rating)}`}>
                                        {inspection.overall_rating}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="space-y-4">
                            {categories.map((category, index) => (
                                <CategoryScore key={index} category={category} />
                            ))}
                        </div>
                    </div>

                    {/* Detailed Findings */}
                    <div className="p-8 border-b border-slate-200">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Detailed Findings</h2>
                        <div className="space-y-6">
                            {categories.map((category, index) => (
                                <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                                        <h3 className="font-bold text-lg text-slate-900">{category.title}</h3>
                                        <p className="text-sm text-slate-600">
                                            Score: {category.currentScore} / {category.maxScore} ({Math.round((category.currentScore / category.maxScore) * 100)}%)
                                        </p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {category.questions.map((q: any, qIndex: number) => (
                                            <div key={qIndex} className="flex items-start gap-4">
                                                <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${q.score >= q.max_points * 0.8 ? 'bg-emerald-100' :
                                                    q.score >= q.max_points * 0.5 ? 'bg-amber-100' : 'bg-red-100'
                                                    }`}>
                                                    <span className="font-bold text-lg">
                                                        {q.score}/{q.max_points}
                                                    </span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-900 mb-1">{q.question}</p>
                                                    {q.notes && (
                                                        <p className="text-sm text-slate-600 italic">📝 {q.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommendations */}
                    {inspection.recommendations && (
                        <div className="p-8 border-b border-slate-200 bg-amber-50/50">
                            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-6 h-6 text-amber-600" />
                                Recommendations
                            </h2>
                            <div className="bg-white rounded-xl p-6 border border-amber-200">
                                <p className="text-slate-700 whitespace-pre-wrap">{inspection.recommendations}</p>
                            </div>
                        </div>
                    )}

                    {/* Inspector Notes */}
                    {inspection.notes && (
                        <div className="p-8 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Inspector Notes</h2>
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                                <p className="text-slate-700 whitespace-pre-wrap">{inspection.notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Digital Signature */}
                    {inspection.digitally_signed && inspection.signature_timestamp && (
                        <div className="p-8 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900 mb-4">Authentication</h2>
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                                <div className="flex items-start gap-6">
                                    {inspector.digital_signature && (
                                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                                            <img
                                                src={inspector.digital_signature}
                                                alt="Inspector Signature"
                                                className="h-24 w-auto"
                                            />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                                            <span className="font-bold text-slate-900">Digitally Signed</span>
                                        </div>
                                        <div className="space-y-1 text-sm text-slate-600">
                                            <p><span className="font-semibold">Inspector:</span> {inspector.full_name}</p>
                                            <p><span className="font-semibold">Code:</span> {inspector.inspector_code}</p>
                                            <p><span className="font-semibold">Signed:</span> {new Date(inspection.signature_timestamp).toLocaleString()}</p>
                                            <p><span className="font-semibold">Document ID:</span> INS-{inspection.id.slice(0, 12).toUpperCase()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="p-8 bg-slate-50 text-center">
                        <p className="text-sm text-slate-600 mb-2">
                            This is an official document issued by the Ministry of Education
                        </p>
                        <p className="text-xs text-slate-500">
                            Generated on {new Date().toLocaleString()} • Document Reference: INS-{inspection.id.slice(0, 12).toUpperCase()}
                        </p>
                    </div>
                </div>
            </div>


            {/* Print Styles */}
            <style>{`
        @media print {
          body {
            background: white !important;
          }
        }
      `}</style>
        </div>
    );
}

// Helper Components
function InfoField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {label}
            </p>
            <p className="text-base font-medium text-slate-900">{value}</p>
        </div>
    );
}

function CategoryScore({ category }: { category: any }) {
    const percentage = Math.round((category.currentScore / category.maxScore) * 100);
    const getColor = () => {
        if (percentage >= 80) return 'bg-emerald-500';
        if (percentage >= 60) return 'bg-blue-500';
        if (percentage >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    return (
        <div className="flex items-center gap-4">
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">{category.title}</span>
                    <span className="text-sm font-bold text-slate-700">
                        {category.currentScore}/{category.maxScore} ({percentage}%)
                    </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                        className={`h-full ${getColor()} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
