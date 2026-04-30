import React, { useState, useEffect } from 'react';
import { Rocket, School, BookOpen, Users, DollarSign, CheckCircle2, ChevronRight, ChevronLeft, Layout, Building2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const PilotOnboardingPage = ({ onComplete }: { onComplete: () => void }) => {
    const { currentSchool } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const totalSteps = 4;

    // Form State
    const [lga, setLga] = useState('');
    const [infrastructure, setInfrastructure] = useState<string[]>([]);
    const [schoolName, setSchoolName] = useState(currentSchool?.name || '');
    const [curriculumTrack, setCurriculumTrack] = useState('Dual-Track');
    const [schoolState, setSchoolState] = useState(currentSchool?.state || 'Lagos State');

    const FACILITIES = [
        "Science Laboratory", "ICT Center", "Library", "Sports Field",
        "Art Studio", "Music Room", "School Clinic", "Cafeteria"
    ];

    // Load existing onboarding data from Express backend
    useEffect(() => {
        const fetchOnboardingData = async () => {
            if (!currentSchool?.id) {
                setFetchLoading(false);
                return;
            }
            try {
                const data = await api.getPilotOnboarding();
                if (data) {
                    setSchoolName(data.name || '');
                    setSchoolState(data.state || 'Lagos State');
                    setLga(data.lga || '');
                    setInfrastructure((data.infrastructure_config as any)?.facilities || []);
                    setCurriculumTrack(data.curriculum_type || 'Dual-Track');
                    setStep(data.onboarding_step || 1);
                    if (data.is_onboarded) {
                        onComplete();
                    }
                }
            } catch (err) {
                console.error('Failed to load onboarding data:', err);
                // Non-fatal — proceed with defaults
            } finally {
                setFetchLoading(false);
            }
        };
        fetchOnboardingData();
    }, [currentSchool?.id]);

    const saveProgress = async (nextStep: number, isFinal = false) => {
        if (!currentSchool?.id) {
            toast.error('School context not loaded. Please try again.');
            return;
        }
        setLoading(true);
        try {
            await api.savePilotProgress({
                name: schoolName,
                lga,
                curriculum_type: curriculumTrack,
                infrastructure_config: { facilities: infrastructure },
                onboarding_step: nextStep,
                is_onboarded: isFinal
            });

            if (isFinal) {
                toast.success('🎉 Hub Onboarding Complete!');
                onComplete();
            } else {
                setStep(nextStep);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to save progress');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (step < totalSteps) {
            saveProgress(step + 1);
        } else {
            saveProgress(step, true);
        }
    };

    const prevStep = () => {
        if (step > 1) setStep(step - 1);
    };

    const toggleFacility = (facility: string) => {
        setInfrastructure(prev =>
            prev.includes(facility)
                ? prev.filter(f => f !== facility)
                : [...prev, facility]
        );
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <School className="w-5 h-5 text-indigo-500" />
                                School Profile
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">Official Name</label>
                                    <input
                                        type="text"
                                        value={schoolName}
                                        onChange={(e) => setSchoolName(e.target.value)}
                                        placeholder="e.g. Landmark International School"
                                        className="w-full p-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none transition font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">Curriculum Track</label>
                                    <select
                                        value={curriculumTrack}
                                        onChange={(e) => setCurriculumTrack(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none transition font-medium"
                                    >
                                        <option value="Dual-Track">Dual-Track (Nigerian + British)</option>
                                        <option value="Nigerian">Nigerian (WAEC/NECO)</option>
                                        <option value="British">British (Cambridge/IGCSE)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">State / Region</label>
                                    <div className="p-2.5 bg-indigo-50 border-2 border-indigo-100 rounded-xl font-black text-indigo-600">
                                        {schoolState}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 italic">LGA</label>
                                    <input
                                        type="text"
                                        value={lga}
                                        onChange={(e) => setLga(e.target.value)}
                                        placeholder="e.g. Ikeja"
                                        className="w-full p-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none transition font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-emerald-500" />
                            Infrastructure &amp; Facilities
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {FACILITIES.map(facility => (
                                <button
                                    key={facility}
                                    onClick={() => toggleFacility(facility)}
                                    className={`p-4 border-2 rounded-xl text-left transition-all flex items-center justify-between group ${infrastructure.includes(facility)
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                        : 'border-gray-100 bg-white text-gray-700 hover:border-gray-200'
                                        }`}
                                >
                                    <span className="font-medium">{facility}</span>
                                    <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center ${infrastructure.includes(facility) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
                                        {infrastructure.includes(facility) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <p className="text-sm text-gray-500 italic">*Selecting these will auto-generate maintenance registers for Step 11 compliance.</p>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-blue-500" />
                            Governance &amp; Board
                        </h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4 border border-gray-100">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm"><Users className="text-indigo-600" /></div>
                                <div>
                                    <p className="font-bold">Initial Admin Account</p>
                                    <p className="text-sm text-gray-500">Auto-configured with full governance permissions.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-2xl flex items-center justify-between border border-indigo-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm text-indigo-600 font-bold">TRCN</div>
                                    <div>
                                        <p className="font-bold text-indigo-900">TRCN Database Sync</p>
                                        <p className="text-sm text-indigo-600">Teacher Registry auto-validation ready.</p>
                                    </div>
                                </div>
                                <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-200">Connect</button>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-amber-500" />
                            Financial Setup
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 border-2 border-dashed rounded-3xl text-center space-y-3 hover:bg-gray-50 transition cursor-pointer group">
                                <BookOpen className="w-10 h-10 mx-auto text-indigo-400 group-hover:scale-110 transition" />
                                <p className="font-bold text-lg">Import Fee Templates</p>
                                <p className="text-xs text-gray-500">Standard Nigerian/British structures.</p>
                            </div>
                            <div className="p-6 border-2 border-dashed rounded-3xl text-center space-y-3 hover:bg-gray-50 transition cursor-pointer group">
                                <Layout className="w-10 h-10 mx-auto text-emerald-400 group-hover:scale-110 transition" />
                                <p className="font-bold text-lg">Payment Gateway</p>
                                <p className="text-xs text-gray-500">Flutterwave / Monnify.</p>
                            </div>
                        </div>
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                            <p className="text-sm text-amber-700 font-medium">
                                ✓ Your school profile and infrastructure data have been saved. Click <strong>Launch Hub</strong> to complete onboarding.
                            </p>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    if (fetchLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto flex flex-col">
            <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12 space-y-12">
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
                        className={`flex-1 rounded-full transition-all duration-500 ${i + 1 <= step ? 'bg-indigo-600' : 'bg-gray-100'}`}
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
                        disabled={step === 1 || loading}
                        className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 transition disabled:opacity-0"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-2xl font-black hover:bg-black transition hover:translate-x-1 active:scale-95 shadow-lg shadow-gray-200 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : (step === totalSteps ? 'Launch Hub' : 'Next Step')}
                        {!loading && <ChevronRight className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            </div>
        </div>
    );
};

export default PilotOnboardingPage;
