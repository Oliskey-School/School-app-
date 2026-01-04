import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ClipboardCheck,
    Image as ImageIcon,
    FileText,
    CheckCircle2,
    XCircle,
    Save,
    ChevronRight,
    ChevronLeft,
    Shield,
    PenTool,
    Loader2
} from 'lucide-react';

type InspectionStatus = 'Scheduled' | 'In Progress' | 'Review' | 'Completed';

interface InspectionItem {
    id: number;
    category: 'Facilities' | 'Curriculum' | 'Safety' | 'Admin' | 'Staffing';
    item_text: string;
    is_compliant: boolean;
    evidence_url?: string;
    comments?: string;
}

const InspectionFlowWizard = () => {
    const [step, setStep] = useState(1);
    const [inspectionId, setInspectionId] = useState<number | null>(null);
    const [status, setStatus] = useState<InspectionStatus>('Scheduled');
    const [items, setItems] = useState<InspectionItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Categories to inspect
    const categories: InspectionItem['category'][] = ['Facilities', 'Curriculum', 'Safety', 'Admin', 'Staffing'];

    const startInspection = async () => {
        setLoading(true);
        // This would usually be triggered by select school/curriculum
        // For demonstration, we'll create a dummy session
        const { data, error } = await supabase.from('inspections').insert([{
            status: 'In Progress',
            started_at: new Date().toISOString()
        }]).select().single();

        if (data) {
            setInspectionId(data.id);
            setStatus('In Progress');
            setStep(2);
            // Default checklist items
            const defaultItems: Partial<InspectionItem>[] = [
                { category: 'Facilities', item_text: 'Adequate classroom lighting and ventilation', is_compliant: false },
                { category: 'Curriculum', item_text: 'Alignment with Ministry Approved Scheme of Work', is_compliant: false },
                { category: 'Safety', item_text: 'Functioning fire extinguishers in every wing', is_compliant: false },
            ];
            setItems(defaultItems as InspectionItem[]);
        }
        setLoading(false);
    };

    const toggleCompliance = (index: number) => {
        const newItems = [...items];
        newItems[index].is_compliant = !newItems[index].is_compliant;
        setItems(newItems);
    };

    const StepIndicator = () => (
        <div className="flex items-center justify-center space-x-4 mb-8">
            {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all ${step === s ? 'bg-indigo-600 text-white scale-110 shadow-lg' :
                            step > s ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                        {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                    </div>
                    {s < 4 && <div className={`w-12 h-0.5 mx-2 ${step > s ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
                </div>
            ))}
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-50/50">
            <header className="mb-10 text-center">
                <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-3xl mb-4">
                    <Shield className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 font-outfit">Quality Assurance Inspection</h1>
                <p className="text-gray-500 mt-2">Ministry of Education Digital Audit Framework</p>
            </header>

            <StepIndicator />

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
                {/* Step 1: Pre-Inspection */}
                {step === 1 && (
                    <div className="p-10 flex flex-col items-center justify-center flex-grow text-center space-y-8 animate-in fade-in zoom-in duration-300">
                        <div className="max-w-md space-y-4">
                            <h2 className="text-2xl font-bold text-gray-800">Ready to begin?</h2>
                            <p className="text-gray-500">Ensure you have verified your ministry credentials before starting. This session will be geo-tagged and timestamped.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Target School</p>
                                <p className="font-bold text-gray-900">Oliskey International Academy</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-left">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Audit Track</p>
                                <p className="font-bold text-indigo-600">Dual-Curriculum (NIG/BRI)</p>
                            </div>
                        </div>
                        <button
                            onClick={startInspection}
                            disabled={loading}
                            className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center space-x-3 shadow-xl shadow-indigo-100 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-6 h-6" />}
                            <span>Begin Digital Audit</span>
                        </button>
                    </div>
                )}

                {/* Step 2: Digital Checklist */}
                {step === 2 && (
                    <div className="flex-grow flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Compliance Checklist</h2>
                                <p className="text-sm text-gray-500">Document evidence for each criteria below.</p>
                            </div>
                            <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <span className="text-sm font-bold text-gray-400">Items Remaining: </span>
                                <span className="text-sm font-bold text-indigo-600">{items.length}</span>
                            </div>
                        </div>

                        <div className="flex-grow p-8 space-y-6 overflow-y-auto">
                            {items.map((item, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-start gap-6 hover:border-indigo-200 transition-colors group">
                                    <button
                                        onClick={() => toggleCompliance(idx)}
                                        className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${item.is_compliant ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-300'}`}
                                    >
                                        <CheckCircle2 className="w-5 h-5" />
                                    </button>
                                    <div className="flex-grow space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">{item.category}</span>
                                                <h3 className="font-bold text-gray-800 mt-1">{item.item_text}</h3>
                                            </div>
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                                                    <ImageIcon className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 bg-gray-50 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors">
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            placeholder="Add inspector comments..."
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                            <button onClick={() => setStep(1)} className="flex items-center space-x-2 text-gray-400 font-bold hover:text-gray-600 transition-colors">
                                <ChevronLeft className="w-5 h-5" />
                                <span>Back</span>
                            </button>
                            <button onClick={() => setStep(3)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center space-x-2 shadow-lg shadow-indigo-100">
                                <span>Continue to Review</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Document Review (Placeholder for brevity) */}
                {step === 3 && (
                    <div className="p-10 flex flex-col items-center justify-center flex-grow text-center space-y-8 animate-in slide-in-from-right duration-300">
                        <div className="max-w-md space-y-4">
                            <h2 className="text-2xl font-bold text-gray-800">Institutional Review</h2>
                            <p className="text-gray-500">The school has uploaded 12 mandatory documents. Audit them for authenticity.</p>
                        </div>
                        <div className="flex space-x-4">
                            <button onClick={() => setStep(2)} className="px-6 py-2 text-gray-400 font-bold">Back</button>
                            <button onClick={() => setStep(4)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold">Verify & Finalize</button>
                        </div>
                    </div>
                )}

                {/* Step 4: Signing & Closure */}
                {step === 4 && (
                    <div className="p-10 space-y-10 animate-in slide-in-from-right duration-300">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-gray-800">Final Validation & Signing</h2>
                            <p className="text-gray-500">Both parties must digitally sign to conclude the inspection.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center min-h-[200px] space-y-4 cursor-crosshair group hover:border-indigo-300 transition-colors">
                                <PenTool className="w-8 h-8 text-gray-300 group-hover:text-indigo-400" />
                                <p className="text-sm font-bold text-gray-400 group-hover:text-indigo-500">Ministry Inspector Signature</p>
                            </div>
                            <div className="bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center min-h-[200px] space-y-4 cursor-crosshair group hover:border-indigo-300 transition-colors">
                                <PenTool className="w-8 h-8 text-gray-300 group-hover:text-indigo-400" />
                                <p className="text-sm font-bold text-gray-400 group-hover:text-indigo-500">School Principal Signature</p>
                            </div>
                        </div>

                        <button
                            className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-bold text-xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-100 flex items-center justify-center space-x-3"
                        >
                            <Save className="w-6 h-6" />
                            <span>Complete Inspection & Generate Official Report</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InspectionFlowWizard;
