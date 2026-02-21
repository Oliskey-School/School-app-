import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserIcon, BookOpenIcon, CheckCircleIcon, UploadIcon, IdentificationIcon, AcademicCapIcon, HomeIcon, PhoneIcon, MailIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { checkUserLimit } from '../../lib/usage-limits';

interface EnrollmentPageProps {
    onComplete: () => void;
    handleBack: () => void;
}

const StudentEnrollmentPage: React.FC<EnrollmentPageProps> = ({ onComplete, handleBack }) => {
    const { profile } = useProfile();
    const [loading, setLoading] = useState(false);

    // Unified Form State
    const [formData, setFormData] = useState({
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        parentAddress: '',
        studentFirstName: '',
        studentLastName: '',
        studentDob: '',
        studentGender: 'Male',
        curriculum: 'NIGERIAN' as 'NIGERIAN' | 'BRITISH' | 'DUAL'
    });
    const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        // Validation
        const required = ['parentName', 'parentEmail', 'parentPhone', 'studentFirstName', 'studentLastName', 'studentDob'];
        const missing = required.filter(field => !formData[field as keyof typeof formData]);

        if (missing.length > 0) {
            toast.error("Please fill in all required fields.");
            return;
        }

        if (profile.schoolId) {
            setLoading(true);
            const { allowed, count, limit } = await checkUserLimit(profile.schoolId);
            if (!allowed) {
                toast.error(`Free Limit Reached: You have ${count}/${limit} users. Please upgrade.`);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        try {
            // Map frontend fields to backend expected payload
            const payload = {
                firstName: formData.studentFirstName,
                lastName: formData.studentLastName,
                dateOfBirth: formData.studentDob,
                gender: formData.studentGender,
                parentName: formData.parentName,
                parentEmail: formData.parentEmail,
                parentPhone: formData.parentPhone,
                curriculumType: formData.curriculum === 'NIGERIAN' ? 'Nigerian' :
                    formData.curriculum === 'BRITISH' ? 'British' : 'Both',
                documentUrls: {} // Placeholder for actual doc upload logic
            };

            // @ts-ignore - api.enrollStudent is defined in lib/api.ts
            const { api } = await import('../../lib/api');
            await api.enrollStudent(payload);

            toast.success('Enrollment submitted successfully!');
            onComplete();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Enrollment failed.');
        } finally {
            setLoading(false);
        }
    };

    const SelectCard = ({ value, title, desc, icon: Icon }: any) => (
        <div
            onClick={() => handleChange('curriculum', value)}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative overflow-hidden group ${formData.curriculum === value ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-1 ring-indigo-500' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}
        >
            <div className={`absolute top-0 right-0 p-2 ${formData.curriculum === value ? 'text-indigo-600' : 'text-gray-200 group-hover:text-indigo-200'}`}>
                {formData.curriculum === value ? <CheckCircleIcon className="w-6 h-6" /> : <Icon className="w-12 h-12 opacity-20" />}
            </div>
            <h4 className={`font-bold text-lg mb-1 ${formData.curriculum === value ? 'text-indigo-900' : 'text-gray-700'}`}>{title}</h4>
            <p className="text-sm text-gray-500 leading-relaxed pr-6">{desc}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={handleBack} />

            <div className="relative w-full max-w-7xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">

                {/* HEADER */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <UserIcon className="w-6 h-6 text-indigo-600" />
                            New Student Enrollment
                        </h2>
                        <p className="text-sm text-gray-500">Register a new student, assign curriculum, and upload documents in one go.</p>
                    </div>
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="sr-only">Close</span>
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-grow overflow-y-auto bg-gray-50/50 p-8">
                    <div className="max-w-6xl mx-auto space-y-8">

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                            {/* LEFT COLUMN: PERSONAL DETAILS */}
                            <div className="lg:col-span-8 space-y-8">

                                {/* 1. STUDENT INFO */}
                                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <IdentificationIcon className="w-4 h-4" /> Student Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                                            <input
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="e.g. David"
                                                value={formData.studentFirstName}
                                                onChange={e => handleChange('studentFirstName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                                            <input
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="e.g. Okonkwo"
                                                value={formData.studentLastName}
                                                onChange={e => handleChange('studentLastName', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                                            <input
                                                type="date"
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-600"
                                                value={formData.studentDob}
                                                onChange={e => handleChange('studentDob', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                            <select
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-gray-600"
                                                value={formData.studentGender}
                                                onChange={e => handleChange('studentGender', e.target.value)}
                                            >
                                                <option>Male</option>
                                                <option>Female</option>
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                {/* 2. PARENT INFO */}
                                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <HomeIcon className="w-4 h-4" /> Guardian Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                                            <div className="relative">
                                                <UserIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                                                <input
                                                    className="w-full pl-11 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    placeholder="Parent/Guardian Name"
                                                    value={formData.parentName}
                                                    onChange={e => handleChange('parentName', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                            <div className="relative">
                                                <MailIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="email"
                                                    className="w-full pl-11 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    placeholder="parent@example.com"
                                                    value={formData.parentEmail}
                                                    onChange={e => handleChange('parentEmail', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                                            <div className="relative">
                                                <PhoneIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    className="w-full pl-11 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                    placeholder="080..."
                                                    value={formData.parentPhone}
                                                    onChange={e => handleChange('parentPhone', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Home Address</label>
                                            <textarea
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                                rows={2}
                                                placeholder="Street Address..."
                                                value={formData.parentAddress}
                                                onChange={e => handleChange('parentAddress', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* RIGHT COLUMN: CURRICULUM & DOCS */}
                            <div className="lg:col-span-4 space-y-8">

                                {/* 3. CURRICULUM */}
                                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <AcademicCapIcon className="w-4 h-4" /> Academic Track
                                    </h3>
                                    <div className="space-y-4">
                                        <SelectCard value="NIGERIAN" title="Nigerian" desc="Standard NERDC. WAEC/NECO." icon={BookOpenIcon} />
                                        <SelectCard value="BRITISH" title="British" desc="Cambridge/Edexcel. IGCSE." icon={BookOpenIcon} />
                                        <SelectCard value="DUAL" title="Dual" desc="Hybrid Intensive Program." icon={AcademicCapIcon} />
                                    </div>
                                    {formData.curriculum === 'DUAL' && (
                                        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-800">
                                            Creates two separate academic records per term.
                                        </div>
                                    )}
                                </section>

                                {/* 4. DOCUMENTS */}
                                <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <CheckCircleIcon className="w-4 h-4" /> Documents
                                    </h3>

                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 hover:bg-gray-50 transition-colors text-center cursor-pointer group relative">
                                        <input
                                            type="file"
                                            multiple
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            onChange={(e) => {
                                                if (e.target.files) setUploadedDocs(Array.from(e.target.files));
                                            }}
                                        />
                                        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                            <UploadIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-700">Upload Records</p>
                                        <p className="text-xs text-gray-400 mt-1">Birth Cert, Previous Results</p>
                                    </div>

                                    {uploadedDocs.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            {uploadedDocs.map((file, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg">
                                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                                    <span className="truncate flex-1">{file.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STICKY FOOTER */}
                <div className="px-8 py-5 bg-white border-t border-gray-100 z-20 flex justify-end gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={handleBack}
                        className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:shadow-xl transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Registering...' : 'Complete Enrollment'}
                        {!loading && <CheckCircleIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentEnrollmentPage;
