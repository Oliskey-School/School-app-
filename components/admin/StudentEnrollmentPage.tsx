import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserIcon, BookOpenIcon, CheckCircleIcon, UploadIcon, IdentificationIcon, AcademicCapIcon, HomeIcon, PhoneIcon, MailIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { checkUserLimit } from '../../lib/usage-limits';

interface EnrollmentPageProps {
    onComplete: () => void;
    handleBack: () => void;
    schoolId?: string;
    currentBranchId?: string;
}

const StudentEnrollmentPage: React.FC<EnrollmentPageProps> = ({ onComplete, handleBack, schoolId, currentBranchId }) => {
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
                school_id: schoolId || profile.schoolId,
                branch_id: currentBranchId,
                firstName: formData.studentFirstName,
                lastName: formData.studentLastName,
                dateOfBirth: formData.studentDob,
                gender: formData.studentGender,
                parentName: formData.parentName,
                parentEmail: formData.parentEmail,
                parentPhone: formData.parentPhone,
                parentAddress: formData.parentAddress,
                curriculumType: formData.curriculum === 'NIGERIAN' ? 'Nigerian' :
                    formData.curriculum === 'BRITISH' ? 'British' : 'Both',
                documentUrls: {} // Placeholder for actual doc upload logic
            };

            // @ts-ignore - api.enrollStudent is defined in lib/api.ts
            const { api } = await import('../../lib/api');
            await api.enrollStudent(payload);

            toast.success('Enrollment submitted successfully!');
            if (onComplete) onComplete(); else handleBack();
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
        <div className="w-full h-full bg-white flex flex-col overflow-hidden">

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 bg-white z-20">
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
                        <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" />
                        New Student Enrollment
                    </h2>
                    <p className="text-[10px] sm:text-sm text-gray-500 truncate sm:whitespace-normal">Register student, assign curriculum, and upload docs.</p>
                </div>
                <button onClick={handleBack} className="p-1 sm:p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors shrink-0 flex items-center gap-1 font-medium text-sm">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    <span className="hidden sm:inline">Back</span>
                </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-grow overflow-y-auto bg-gray-50/50 p-4 sm:p-8 smooth-scroll">
                <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">

                        {/* LEFT COLUMN: PERSONAL DETAILS */}
                        <div className="lg:col-span-8 space-y-8">

                            {/* 1. STUDENT INFO */}
                            <section className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 sm:mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <IdentificationIcon className="w-4 h-4" /> Student Information
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label className="label text-xs sm:text-sm">First Name</label>
                                        <input
                                            className="input-field"
                                            placeholder="e.g. David"
                                            value={formData.studentFirstName}
                                            onChange={e => handleChange('studentFirstName', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label text-xs sm:text-sm">Last Name</label>
                                        <input
                                            className="input-field"
                                            placeholder="e.g. Okonkwo"
                                            value={formData.studentLastName}
                                            onChange={e => handleChange('studentLastName', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label text-xs sm:text-sm">Date of Birth</label>
                                        <input
                                            type="date"
                                            className="input-field"
                                            value={formData.studentDob}
                                            onChange={e => handleChange('studentDob', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="label text-xs sm:text-sm">Gender</label>
                                        <select
                                            className="input-field"
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
                            <section className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 sm:mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <HomeIcon className="w-4 h-4" /> Guardian Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="sm:col-span-2">
                                        <label className="label text-xs sm:text-sm">Full Name</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                                            <input
                                                className="input-field pl-11"
                                                placeholder="Parent/Guardian Name"
                                                value={formData.parentName}
                                                onChange={e => handleChange('parentName', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label text-xs sm:text-sm">Email Address</label>
                                        <div className="relative">
                                            <MailIcon className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                                            <input
                                                type="email"
                                                className="input-field pl-11"
                                                placeholder="parent@example.com"
                                                value={formData.parentEmail}
                                                onChange={e => handleChange('parentEmail', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label text-xs sm:text-sm">Phone Number</label>
                                        <div className="relative">
                                            <PhoneIcon className="absolute left-3.5 top-3 w-5 h-5 text-gray-400" />
                                            <input
                                                type="tel"
                                                className="input-field pl-11"
                                                placeholder="080..."
                                                value={formData.parentPhone}
                                                onChange={e => handleChange('parentPhone', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="label text-xs sm:text-sm">Home Address</label>
                                        <textarea
                                            className="input-field resize-none h-20"
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
                            <section className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 sm:mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <AcademicCapIcon className="w-4 h-4" /> Academic Track
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 sm:gap-4 overflow-x-auto pb-1 hide-scrollbar">
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
                            <section className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 sm:mb-6 flex items-center gap-2 border-b border-gray-100 pb-2">
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

            <div className="px-4 sm:px-8 py-4 sm:py-5 bg-white border-t border-gray-100 z-20 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <button
                    onClick={handleBack}
                    className="order-2 sm:order-1 px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors text-sm sm:text-base"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="order-1 sm:order-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                    {loading ? 'Registering...' : 'Complete Enrollment'}
                    {!loading && <CheckCircleIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};

export default StudentEnrollmentPage;
