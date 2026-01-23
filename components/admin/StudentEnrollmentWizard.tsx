import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { UserIcon, BookOpenIcon, CheckCircleIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { checkUserLimit } from '../../lib/usage-limits';
// Note: Assuming icons exist. Replace with available icons if needed.

interface EnrollmentWizardProps {
    onComplete: () => void;
    handleBack: () => void;
}

type Step = 'PARENT_INFO' | 'STUDENT_INFO' | 'CURRICULUM' | 'DOCUMENTS' | 'REVIEW';

const StudentEnrollmentWizard: React.FC<EnrollmentWizardProps> = ({ onComplete, handleBack }) => {
    const { profile } = useProfile();
    const [currentStep, setCurrentStep] = useState<Step>('PARENT_INFO');
    const [loading, setLoading] = useState(false);

    // Form State
    const [parentData, setParentData] = useState({ name: '', email: '', phone: '', address: '' });
    const [studentData, setStudentData] = useState({ firstName: '', lastName: '', dob: '', gender: 'Male' });
    const [curriculumChoice, setCurriculumChoice] = useState<'NIGERIAN' | 'BRITISH' | 'DUAL'>('NIGERIAN');
    const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

    const steps = [
        { id: 'PARENT_INFO', title: 'Parent Info', icon: <UserIcon className="w-5 h-5" /> },
        { id: 'STUDENT_INFO', title: 'Student Info', icon: <UserIcon className="w-5 h-5" /> },
        { id: 'CURRICULUM', title: 'Curriculum', icon: <BookOpenIcon className="w-5 h-5" /> },
        { id: 'DOCUMENTS', title: 'Documents', icon: <CheckCircleIcon className="w-5 h-5" /> }, // Using CheckCircle as placeholder
        { id: 'REVIEW', title: 'Review', icon: <CheckCircleIcon className="w-5 h-5" /> },
    ];

    const handleNext = () => {
        const order: Step[] = ['PARENT_INFO', 'STUDENT_INFO', 'CURRICULUM', 'DOCUMENTS', 'REVIEW'];
        const idx = order.indexOf(currentStep);
        if (idx < order.length - 1) setCurrentStep(order[idx + 1]);
    };

    const handlePrev = () => {
        const order: Step[] = ['PARENT_INFO', 'STUDENT_INFO', 'CURRICULUM', 'DOCUMENTS', 'REVIEW'];
        const idx = order.indexOf(currentStep);
        if (idx > 0) setCurrentStep(order[idx - 1]);
    };

    const handleSubmit = async () => {
        if (profile.schoolId) {
            setLoading(true);
            const { allowed, count, limit } = await checkUserLimit(profile.schoolId);
            if (!allowed) {
                toast.error(`Free Limit Reached: You have ${count}/${limit} users. Please pay the ₦50,000 setup fee to add more students.`);
                setLoading(false);
                return;
            }
        }

        setLoading(true);
        try {
            // Mock submission for now since backend triggers handle most logic
            // In real impl, we would:
            // 1. Create Parent User (if new)
            // 2. Create Student Record
            // 3. Create Academic Track(s) based on curriculumChoice
            // 4. Upload Docs

            // SIMULATION:
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success('Enrollment submitted successfully!');
            onComplete();
        } catch (error) {
            console.error(error);
            toast.error('Enrollment failed.');
        } finally {
            setLoading(false);
        }
    };

    const SelectCard = ({ value, title, desc, selected, onClick }: any) => (
        <div
            onClick={() => onClick(value)}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${selected ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">{title}</span>
                {selected && <CheckCircleIcon className="w-5 h-5 text-indigo-600" />}
            </div>
            <p className="text-sm text-gray-600">{desc}</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full">
                        Back
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">New Student Enrollment</h1>
                </div>
                <div className="text-sm text-gray-500">
                    Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white px-6 py-4 border-b">
                <div className="flex justify-between relative">
                    {/* Line */}
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-0"></div>

                    {steps.map((s, i) => {
                        const idx = steps.findIndex(x => x.id === currentStep);
                        const isCompleted = i < idx;
                        const isCurrent = i === idx;

                        return (
                            <div key={s.id} className="relative z-10 flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isCompleted || isCurrent ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                                    {isCompleted ? <CheckCircleIcon className="w-5 h-5" /> : (i + 1)}
                                </div>
                                <span className={`text-xs mt-1 font-medium ${isCurrent ? 'text-indigo-600' : 'text-gray-500'}`}>{s.title}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow p-6 overflow-y-auto">
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">

                    {currentStep === 'PARENT_INFO' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold mb-4">Parent / Guardian Details</h2>
                            <input className="w-full p-3 border rounded-lg" placeholder="Parent Full Name" value={parentData.name} onChange={e => setParentData({ ...parentData, name: e.target.value })} />
                            <input className="w-full p-3 border rounded-lg" placeholder="Email Address" type="email" value={parentData.email} onChange={e => setParentData({ ...parentData, email: e.target.value })} />
                            <input className="w-full p-3 border rounded-lg" placeholder="Phone Number" value={parentData.phone} onChange={e => setParentData({ ...parentData, phone: e.target.value })} />
                            <textarea className="w-full p-3 border rounded-lg" placeholder="Home Address" value={parentData.address} onChange={e => setParentData({ ...parentData, address: e.target.value })} />
                        </div>
                    )}

                    {currentStep === 'STUDENT_INFO' && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold mb-4">Student Details</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <input className="w-full p-3 border rounded-lg" placeholder="First Name" value={studentData.firstName} onChange={e => setStudentData({ ...studentData, firstName: e.target.value })} />
                                <input className="w-full p-3 border rounded-lg" placeholder="Last Name" value={studentData.lastName} onChange={e => setStudentData({ ...studentData, lastName: e.target.value })} />
                            </div>
                            <input className="w-full p-3 border rounded-lg" type="date" value={studentData.dob} onChange={e => setStudentData({ ...studentData, dob: e.target.value })} />
                            <select className="w-full p-3 border rounded-lg" value={studentData.gender} onChange={e => setStudentData({ ...studentData, gender: e.target.value })}>
                                <option>Male</option>
                                <option>Female</option>
                            </select>
                        </div>
                    )}

                    {currentStep === 'CURRICULUM' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-xl font-bold">Select Academic Track</h2>
                                <p className="text-gray-500 text-sm">This defines the student's learning path & fees.</p>
                            </div>

                            <div className="grid gap-4">
                                <SelectCard
                                    value="NIGERIAN"
                                    title="Nigerian Curriculum Only"
                                    desc="Standard NERDC curriculum. Prepares for WAEC/NECO."
                                    selected={curriculumChoice === 'NIGERIAN'}
                                    onClick={setCurriculumChoice}
                                />
                                <SelectCard
                                    value="BRITISH"
                                    title="British Curriculum Only"
                                    desc="Cambridge/Edexcel International Curriculum. Prepares for IGCSE/A-Levels."
                                    selected={curriculumChoice === 'BRITISH'}
                                    onClick={setCurriculumChoice}
                                />
                                <SelectCard
                                    value="DUAL"
                                    title="Dual Curriculum (Hybrid)"
                                    desc="Intensive program covering both Nigerian & British standards. Double certification."
                                    selected={curriculumChoice === 'DUAL'}
                                    onClick={setCurriculumChoice}
                                />
                            </div>

                            {curriculumChoice === 'DUAL' && (
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                                    <strong>Note:</strong> Dual enrollment requires separate attendance tracking and produces two independent report cards per term.
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep === 'DOCUMENTS' && (
                        <div className="text-center space-y-6">
                            <h2 className="text-xl font-bold">Required Documents</h2>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors cursor-pointer">
                                <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-600 font-medium">Upload Birth Certificate & Previous Records</p>
                                <p className="text-xs text-gray-400 mt-1">PDF, JPG up to 5MB</p>
                                <input type="file" multiple className="hidden" onChange={(e) => {
                                    if (e.target.files) setUploadedDocs(Array.from(e.target.files));
                                }} />
                            </div>
                            {uploadedDocs.length > 0 && <p className="text-green-600 font-medium">{uploadedDocs.length} files selected</p>}
                        </div>
                    )}

                    {currentStep === 'REVIEW' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold">Review & Confirm</h2>

                            <div className="bg-gray-50 p-4 rounded-lg space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Parent:</span>
                                    <span className="font-medium">{parentData.name} ({parentData.phone})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Student:</span>
                                    <span className="font-medium">{studentData.firstName} {studentData.lastName}</span>
                                </div>
                                <div className="flex justify-between border-t border-gray-200 pt-2">
                                    <span className="text-gray-500">Track:</span>
                                    <span className="font-bold text-indigo-600">{curriculumChoice}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="bg-white p-4 border-t flex justify-between px-8">
                <button
                    onClick={handlePrev}
                    disabled={currentStep === 'PARENT_INFO'}
                    className={`px-6 py-2 rounded-lg font-medium ${currentStep === 'PARENT_INFO' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Previous
                </button>

                {currentStep === 'REVIEW' ? (
                    <button onClick={handleSubmit} disabled={loading} className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">
                        {loading ? 'Processing...' : 'Complete Enrollment'}
                    </button>
                ) : (
                    <button onClick={handleNext} className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">
                        Next Step
                    </button>
                )}
            </div>
        </div>
    );
};

export default StudentEnrollmentWizard;
