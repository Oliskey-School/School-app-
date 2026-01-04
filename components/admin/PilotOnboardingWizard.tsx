import React, { useState } from 'react';
import { Rocket, School, BookOpen, Users, DollarSign, CheckCircle2, ChevronRight, ChevronLeft, Layout } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PilotOnboardingWizard: React.FC = () => {
    const [step, setStep] = useState(1);
    const totalSteps = 4;

    const [schoolInfo, setSchoolInfo] = useState({ name: '', type: 'Dual-Track', lga: '', state: '' });

    const nextStep = () => {
        if (step < totalSteps) setStep(step + 1);
        else finishOnboarding();
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const finishOnboarding = () => {
        toast.promise(
            new Promise(resolve => setTimeout(resolve, 2000)),
            {
                loading: 'Initializing School Environment...',
                success: 'Pilot School Onboarding Complete!',
                error: 'Setup Failed. Please contact support.',
            }
        );
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 border-b pb-2">School Profile</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">Official Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Landmark International School"
                                        className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">Curriculum Track</label>
                                    <select className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition">
                                        <option>Dual-Track (Nigerian + British)</option>
                                        <option>Nigerian (WAEC/NECO)</option>
                                        <option>British (Cambridge/IGCSE)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">State / Region</label>
                                    <input type="text" placeholder="Lagos State" className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">LGA</label>
                                    <input type="text" placeholder="Ikeja" className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Infrastructure & Facilities</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {['Laboratories', 'Library', 'Sick Bay', 'ICT Center', 'Sports Ground', 'Cafeteria'].map(facility => (
                                <button key={facility} className="p-4 border rounded-xl text-left hover:border-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-between group">
                                    <span className="font-medium text-gray-700 group-hover:text-indigo-700">{facility}</span>
                                    <div className="w-5 h-5 border-2 rounded-md group-hover:border-indigo-600"></div>
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 italic">*Selecting these will auto-generate maintenance registers for Step 11 compliance.</p>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Staff & Governance</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm"><Users className="text-indigo-600" /></div>
                                <div>
                                    <p className="font-bold">Initial Admin Account</p>
                                    <p className="text-sm text-gray-500">Auto-configured with full governance permissions.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm text-indigo-600">TRCN</div>
                                    <div>
                                        <p className="font-bold text-indigo-900">TRCN Database Sync</p>
                                        <p className="text-sm text-indigo-600">Connect to Teacher Registry for auto-validation.</p>
                                    </div>
                                </div>
                                <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Connect</button>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Financial Setup</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 border-2 border-dashed rounded-2xl text-center space-y-2 hover:bg-gray-50 transition cursor-pointer">
                                <DollarSign className="w-8 h-8 mx-auto text-indigo-400" />
                                <p className="font-bold">Import Fee Templates</p>
                                <p className="text-xs text-gray-500">Standard Nigerian/British fee structures.</p>
                            </div>
                            <div className="p-4 border-2 border-dashed rounded-2xl text-center space-y-2 hover:bg-gray-50 transition cursor-pointer">
                                <Layout className="w-8 h-8 mx-auto text-emerald-400" />
                                <p className="font-bold">Connect Payment Gateway</p>
                                <p className="text-xs text-gray-500">Flutterwave / Monnify Integration.</p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold animate-pulse">
                    <Rocket className="w-4 h-4" />
                    Pilot Launch Module
                </div>
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Onboard New Hub</h1>
                <p className="text-gray-500 font-medium">Step {step} of {totalSteps}: Configure the Operational Foundation</p>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-2 h-1.5 px-4">
                {[...Array(totalSteps)].map((_, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-full transition-all duration-500 ${i + 1 <= step ? 'bg-indigo-600 scale-x-100' : 'bg-gray-100 scale-x-95'}`}
                    />
                ))}
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 p-8 min-h-[400px] flex flex-col justify-between">
                <div>
                    {renderStep()}
                </div>

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 transition disabled:opacity-0"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>
                    <button
                        onClick={nextStep}
                        className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-black transition hover:translate-x-1 active:scale-95 shadow-lg shadow-gray-200"
                    >
                        {step === totalSteps ? 'Launch Hub' : 'Next Step'}
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Quick Helper Cards */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in duration-700 delay-300">
                    <div className="p-4 bg-white rounded-2xl border shadow-sm flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-medium text-gray-600">Compliance Templates Pre-loaded</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border shadow-sm flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-medium text-gray-600">MoE Reporting Ready</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border shadow-sm flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-500 w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-medium text-gray-600">WAEC/Cambridge Sync</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PilotOnboardingWizard;
