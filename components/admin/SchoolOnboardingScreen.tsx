import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { SaveIcon, SchoolLogoIcon, CheckCircleIcon, XCircleIcon, PhotoIcon, FileTextIcon, UploadIcon, GlobeIcon, BuildingLibraryIcon } from '../../constants';
import { toast } from 'react-hot-toast';

// --- Types ---
interface SchoolProfile {
    id?: string;
    name: string;
    address: string;
    state: string;
    lga: string;
    contact_email: string;
    contact_phone: string;
    logo_url: string;
    website_url: string;
    established_date: string;
    curricula: string[]; // ['NIGERIAN', 'BRITISH']
}

interface SchoolDocument {
    id: string;
    document_type: 'CAC' | 'FireSafety' | 'MinistryApproval' | 'BuildingPlan';
    file_url: string;
    verification_status: 'Pending' | 'Verified' | 'Rejected';
    expiry_date?: string;
}

const NIGERIAN_STATES = [
    "Lagos", "Abuja", "Rivers", "Ogun", "Oyo", "Kano", "Kaduna", "Enugu", "Delta", "Edo", "Anambra", "Plateau", "Benue", "Kwara", "Other"
];

const REQUIRED_DOCS = [
    { type: 'CAC', label: 'CAC Certificate', description: 'Certificate of Incorporation' },
    { type: 'MinistryApproval', label: 'Ministry Approval', description: 'Letter of Approval from MoE' },
    { type: 'FireSafety', label: 'Fire Safety Cert', description: 'Current Fire Safety Compliance' },
    { type: 'BuildingPlan', label: 'Building Plan', description: 'Approved Building Plan' },
];

const SchoolOnboardingScreen: React.FC = () => {
    const [profile, setProfile] = useState<SchoolProfile>({
        name: '', address: '', state: 'Lagos', lga: '',
        contact_email: '', contact_phone: '', logo_url: '', website_url: '',
        established_date: '', curricula: ['NIGERIAN']
    });
    const [documents, setDocuments] = useState<SchoolDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'compliance' | 'curriculum'>('profile');

    useEffect(() => {
        fetchSchoolData();
    }, []);

    const fetchSchoolData = async () => {
        try {
            // Fetch School Profile
            // In a real multi-tenant app, we'd get the school ID from the auth context.
            // Here we assume single tenant or ID retrieval logic.
            const { data: schoolData, error: schoolError } = await supabase.from('schools').select('*').maybeSingle();

            if (schoolData) {
                // Determine curricula based on active tracks or specific config
                // For MVP phase 7, we might verify this via a relation or jsonb field. 
                // We'll assume a local field for now or derived state.
                setProfile({ ...schoolData, curricula: schoolData.curricula_config || ['NIGERIAN'] });
            }

            // Fetch Documents
            if (schoolData?.id) {
                const { data: docs } = await supabase.from('school_documents').select('*').eq('school_id', schoolData.id);
                if (docs) setDocuments(docs);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data, error } = await supabase.from('schools').upsert({
                // id: existingId, // If exists
                name: profile.name,
                address: profile.address,
                state: profile.state,
                lga: profile.lga,
                contact_email: profile.contact_email,
                contact_phone: profile.contact_phone,
                logo_url: profile.logo_url,
                // store curricula choice in a config column or separate table
            }).select().single();

            if (error) throw error;
            toast.success("School Profile Saved!");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleCurriculum = (code: string) => {
        setProfile(prev => {
            const exists = prev.curricula.includes(code);
            const newCurricula = exists
                ? prev.curricula.filter(c => c !== code)
                : [...prev.curricula, code];
            return { ...prev, curricula: newCurricula };
        });
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading School Data...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b px-4 md:px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center shadow-sm z-10 space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">School Onboarding</h1>
                    <p className="text-xs md:text-sm text-gray-500">Compliance, Profile, and Curriculum Setup</p>
                </div>

                {/* Scrollable Tab Container on Mobile */}
                <div className="flex overflow-x-auto pb-1 md:pb-0 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg flex-nowrap min-w-max">
                        {['profile', 'compliance', 'curriculum'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 rounded-md text-xs md:text-sm font-semibold capitalize transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">

                {/* --- TAB 1: SCHOOL PROFILE --- */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleSaveProfile} className="space-y-6 animate-fade-in-up">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                <BuildingLibraryIcon className="w-5 h-5 mr-2 text-indigo-600" />
                                Basic Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="label">School Name</label>
                                    <input required type="text" className="input-field" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Official Email</label>
                                    <input required type="email" className="input-field" value={profile.contact_email} onChange={e => setProfile({ ...profile, contact_email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Phone Number</label>
                                    <input required type="tel" className="input-field" value={profile.contact_phone} onChange={e => setProfile({ ...profile, contact_phone: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="label">Physical Address</label>
                                    <textarea required className="input-field h-20" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">State</label>
                                    <select className="input-field" value={profile.state} onChange={e => setProfile({ ...profile, state: e.target.value })}>
                                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">L.G.A.</label>
                                    <input type="text" className="input-field" value={profile.lga} onChange={e => setProfile({ ...profile, lga: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 pb-8 md:pb-0">
                            <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
                                {saving ? 'Saving...' : 'Save & Continue'}
                            </button>
                        </div>
                    </form>
                )}

                {/* --- TAB 2: COMPLIANCE DOCUMENTS --- */}
                {activeTab === 'compliance' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-blue-50 p-4 rounded-lg flex items-start space-x-3 border border-blue-100 text-blue-800">
                            <FileTextIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-sm md:text-base">Required Documentation</h3>
                                <p className="text-xs md:text-sm mt-1">To enable full system access and receive your unique exam center number, you must upload valid copies of the following documents.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {REQUIRED_DOCS.map((docType) => {
                                const existing = documents.find(d => d.document_type === docType.type);
                                return (
                                    <div key={docType.type} className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-sm md:text-base text-gray-800">{docType.label}</h4>
                                                <p className="text-[10px] md:text-xs text-gray-500">{docType.description}</p>
                                            </div>
                                            {existing?.verification_status === 'Verified'
                                                ? <CheckCircleIcon className="text-green-500 w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                                                : <div className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full flex-shrink-0">{existing?.verification_status || 'Missing'}</div>
                                            }
                                        </div>

                                        {existing ? (
                                            <div className="flex items-center justify-between mt-4 bg-gray-50 p-2 rounded text-xs md:text-sm">
                                                <span className="truncate max-w-[120px] md:max-w-[150px] text-gray-600">Document Uploaded</span>
                                                <button className="text-indigo-600 font-medium hover:underline">View</button>
                                            </div>
                                        ) : (
                                            <label className="mt-4 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <UploadIcon className="w-5 h-5 text-gray-400 mb-1" />
                                                    <p className="text-[10px] md:text-xs text-gray-500 text-center px-2">Click to upload PDF/JPG</p>
                                                </div>
                                                <input type="file" className="hidden" />
                                            </label>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* --- TAB 3: CURRICULUM SELECTION --- */}
                {activeTab === 'curriculum' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                                <GlobeIcon className="w-5 h-5 mr-2 text-indigo-600" />
                                Select Active Curricula
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">Choose the curricula your school is accredited to offer. This determines the grading systems and report card formats available.</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                                {/* Nigerian */}
                                <div
                                    onClick={() => toggleCurriculum('NIGERIAN')}
                                    className={`relative p-5 md:p-6 rounded-xl border-2 cursor-pointer transition-all ${profile.curricula.includes('NIGERIAN') ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}
                                >
                                    <div className="flex items-center justify-between mb-3 md:mb-4">
                                        <div className="w-10 h-6 md:w-12 md:h-8 bg-green-600 rounded shadow-sm opacity-90"></div> {/* Flag placeholder */}
                                        {profile.curricula.includes('NIGERIAN') && <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600" />}
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900">Nigerian National</h3>
                                    <p className="text-xs md:text-sm text-gray-600 mt-2">Standard NERDC Curriculum. Uses CA (40%) and Exam (60%) grading structure. Supports WAEC/NECO/BECE.</p>
                                </div>

                                {/* British */}
                                <div
                                    onClick={() => toggleCurriculum('BRITISH')}
                                    className={`relative p-5 md:p-6 rounded-xl border-2 cursor-pointer transition-all ${profile.curricula.includes('BRITISH') ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                                >
                                    <div className="flex items-center justify-between mb-3 md:mb-4">
                                        <div className="w-10 h-6 md:w-12 md:h-8 bg-blue-800 rounded shadow-sm opacity-90"></div> {/* Flag placeholder */}
                                        {profile.curricula.includes('BRITISH') && <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />}
                                    </div>
                                    <h3 className="text-lg md:text-xl font-bold text-gray-900">British National</h3>
                                    <p className="text-xs md:text-sm text-gray-600 mt-2">Cambridge/Pearson Edexcel. Uses A*-G grading scale. Supports IGCSE, O-Level, and A-Level tracks.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Styles Injection for quick demo */}
            <style>{`
                .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
                .input-field { width: 100%; padding: 0.75rem; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 0.75rem; outline: none; transition: all; }
                .input-field:focus { box-shadow: 0 0 0 2px #C7D2FE; border-color: #6366F1; }
                .btn-primary { background-color: #4F46E5; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; font-size: 0.875rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition: all; }
                .btn-primary:hover { background-color: #4338CA; }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default SchoolOnboardingScreen;
