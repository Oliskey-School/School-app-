import React from 'react';
import {
    Shield,
    CheckCircle2,
    XCircle,
    Printer,
    Download,
    FileText,
    MapPin,
    Calendar,
    UserCheck,
    Activity
} from 'lucide-react';

interface InspectionReportProps {
    inspectionData: {
        id: number;
        schoolName: string;
        inspectorName: string;
        date: string;
        items: { category: string, text: string, compliant: boolean, comments?: string }[];
        overallScore: number;
        signatures: { role: string, name: string, date: string }[];
    };
    onClose: () => void;
}

const InspectionReportGenerator: React.FC<InspectionReportProps> = ({ inspectionData, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white min-h-screen p-8 print:p-0 animate-in fade-in duration-500">
            {/* Action Bar (Hidden on Print) */}
            <div className="flex justify-between items-center mb-8 print:hidden bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <button onClick={onClose} className="text-gray-500 font-bold hover:text-gray-700">Close Preview</button>
                <div className="flex space-x-4">
                    <button onClick={handlePrint} className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-100">
                        <Printer className="w-5 h-5" />
                        <span>Print Report</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold border border-emerald-500 hover:bg-emerald-700 transition-colors">
                        <Download className="w-5 h-5" />
                        <span>Download PDF</span>
                    </button>
                </div>
            </div>

            {/* Official Report Content */}
            <div className="max-w-4xl mx-auto border-8 border-double border-gray-100 p-12 print:border-none print:p-4">
                {/* Ministry Header */}
                <div className="text-center space-y-4 mb-12">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center text-white">
                            <Shield className="w-12 h-12" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black uppercase tracking-widest text-gray-900">Ministry of Education</h1>
                        <h2 className="text-lg font-bold text-indigo-600 uppercase">Quality Assurance & Compliance Certificate</h2>
                        <p className="text-xs font-mono text-gray-400">REF: INSPECTION-ACCRED-{inspectionData.id}-2026</p>
                    </div>
                </div>

                {/* Summary Metadata */}
                <div className="grid grid-cols-2 gap-8 mb-12 p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Educational Institution</p>
                                <p className="font-bold text-gray-900">{inspectionData.schoolName}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <UserCheck className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned Inspector</p>
                                <p className="font-bold text-gray-900">{inspectionData.inspectorName}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Audit Date</p>
                                <p className="font-bold text-gray-900">{inspectionData.date}</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <Activity className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compliance Rating</p>
                                <p className={`font-black text-xl ${inspectionData.overallScore >= 80 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                    {inspectionData.overallScore}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Checklist Results */}
                <div className="space-y-8 mb-16">
                    <h3 className="text-lg font-bold text-gray-900 border-b-2 border-gray-900 pb-2">Audit Findings</h3>
                    <div className="space-y-4">
                        {inspectionData.items.map((item, idx) => (
                            <div key={idx} className="flex items-start space-x-4 p-4 border-b border-gray-50">
                                {item.compliant ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-1" /> : <XCircle className="w-5 h-5 text-red-500 mt-1" />}
                                <div className="flex-grow">
                                    <p className="text-sm font-bold text-gray-800">{item.text}</p>
                                    <p className="text-xs text-gray-500 italic mt-1">{item.category} Module</p>
                                    {item.comments && (
                                        <p className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 border-l-4 border-indigo-400">{item.comments}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 pt-12">
                    {inspectionData.signatures.map((sig, idx) => (
                        <div key={idx} className="text-center space-y-4">
                            <div className="h-20 border-b-2 border-gray-900 flex items-center justify-center italic font-serif text-2xl text-gray-400">
                                {sig.name} (Digital Signature)
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 uppercase text-xs">{sig.role}</p>
                                <p className="text-[10px] text-gray-400">{sig.date}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-20 pt-8 border-t border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-widest">
                        This document is a legally binding ministry record. Tampering is a criminal offense. <br />
                        © 2026 Ministry of Education Quality Assurance Bureau.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InspectionReportGenerator;
