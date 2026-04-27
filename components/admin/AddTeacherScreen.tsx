import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import { 
    CameraIcon, 
    UserIcon, 
    MailIcon, 
    PhoneIcon, 
    BookOpenIcon, 
    UsersIcon, 
    XCircleIcon, 
    CheckCircleIcon, 
    ChevronDownIcon,
    SUBJECTS_LIST
} from '../../constants';
import { Teacher } from '../../types';
import { api } from '../../lib/api';
import { sendVerificationEmail } from '../../lib/auth';

// import { checkUserLimit } from '../../lib/usage-limits'; // Replaced by useTenantLimit
import CredentialsModal from '../ui/CredentialsModal';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useTenantLimit } from '../../hooks/useTenantLimit';
import { useAutoSync } from '../../hooks/useAutoSync';

import UpgradeModal from '../shared/UpgradeModal';

interface AddTeacherScreenProps {
    teacherToEdit?: Teacher;
    forceUpdate: () => void;
    handleBack: () => void;
}

const MultiSelect: React.FC<{
    label: string;
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
    placeholder: string;
    options: string[];
}> = ({ label, selected, setSelected, placeholder, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState('');
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleSelection = (option: string) => {
        if (selected.includes(option)) {
            setSelected(selected.filter(item => item !== option));
        } else {
            setSelected([...selected, option]);
        }
        setFilterText(''); // Reset filter after selection
    };

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(filterText.toLowerCase()) &&
        !selected.includes(opt)
    );

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>

            {/* Main Input Container */}
            <div
                className="min-h-[42px] p-2 border border-gray-300 rounded-lg bg-gray-50 flex flex-wrap gap-2 items-center cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all"
                onClick={() => setIsOpen(true)}
            >
                {/* Selected Tags */}
                {selected.map(item => (
                    <span key={item} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-md">
                        {item}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleSelection(item); }}
                            className="text-blue-600 hover:text-blue-800 focus:outline-none"
                        >
                            <XCircleIcon className="w-4 h-4" />
                        </button>
                    </span>
                ))}

                {/* Input Field */}
                <div className="flex-grow flex items-center min-w-[120px]">
                    <input
                        type="text"
                        value={filterText}
                        onChange={(e) => { setFilterText(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={selected.length === 0 ? placeholder : ""}
                        className="w-full bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm"
                    />
                </div>

                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option}
                                onClick={() => toggleSelection(option)}
                                className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 flex items-center justify-between"
                            >
                                <span>{option}</span>
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                            {options.length === 0 ? "No options available" : "No matching options"}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const AddTeacherScreen: React.FC<AddTeacherScreenProps> = ({ teacherToEdit, forceUpdate, handleBack }) => {
    const { profile } = useProfile();
    const { currentSchool, currentBranchId } = useAuth();

    // Triple-layer schoolId detection
    const schoolId = profile?.schoolId || currentSchool?.id;
    const branchId = currentBranchId || profile.branchId || null;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [primaryCurriculum, setPrimaryCurriculum] = useState<'Nigerian' | 'British' | 'Both'>('Nigerian');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [status, setStatus] = useState<'Active' | 'Inactive' | 'On Leave'>('Active');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [branches, setBranches] = useState<string[]>([]);
    const [selectedBranchNames, setSelectedBranchNames] = useState<string[]>([]);
    const [branchIdMap, setBranchIdMap] = useState<Record<string, string>>({});

    // Phase 7: Curriculum & Compliance
    const [curriculumEligibility, setCurriculumEligibility] = useState<string[]>(['NIGERIAN']); // Default to Nigerian
    const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

    const [dbSubjects, setDbSubjects] = useState<any[]>([]);
    const [validClasses, setValidClasses] = useState<string[]>([]);
    const [classIdMap, setClassIdMap] = useState<Record<string, string>>({});
    const [subjectIdMap, setSubjectIdMap] = useState<Record<string, string>>({});
    const [loadingRefs, setLoadingRefs] = useState(true);

    // Dynamic subject filtering based on curriculum
    const filteredSubjectOptions = React.useMemo(() => {
        const dbNames = dbSubjects.map(s => s.name);
        let standardFiltered = SUBJECTS_LIST;
        
        if (primaryCurriculum === 'Nigerian') {
            standardFiltered = SUBJECTS_LIST.filter(s => s.curriculum === 'Nigerian' || s.curriculum === 'Both');
        } else if (primaryCurriculum === 'British') {
            standardFiltered = SUBJECTS_LIST.filter(s => s.curriculum === 'British' || s.curriculum === 'Both');
        }
        
        const standardNames = standardFiltered.map(s => s.name);
        return Array.from(new Set([...dbNames, ...standardNames])).sort();
    }, [dbSubjects, primaryCurriculum]);

    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
    } | null>(null);

    // Fetch Reference Data
    const fetchRefs = async () => {
        try {
            // Fetch Subjects from DB
            const sData = await api.getSubjects(schoolId, branchId || undefined);
            setDbSubjects(sData || []);
            
            const dbSubjectIdMap: Record<string, string> = {};
            if (sData) sData.forEach((s: any) => { dbSubjectIdMap[s.name] = s.id; });
            setSubjectIdMap(dbSubjectIdMap);

            // Fetch Classes - Always fetch all classes across all branches for Admin visibility
            const cData = await api.getClasses(schoolId, 'all', true);
            if (cData) {
                // Better unique names: include branch info if name is duplicated
                const processedClasses = cData.map((c: any) => ({
                    id: c.id,
                    displayName: cData.filter((d: any) => d.name === c.name).length > 1 && c.branch 
                        ? `${c.name} (${c.branch.name})` 
                        : c.name
                }));

                const uniqueNames = Array.from(new Set(processedClasses.map((d: any) => d.displayName)));
                setValidClasses(uniqueNames);
                const map: Record<string, string> = {};
                processedClasses.forEach((c: any) => { map[c.displayName] = c.id; });
                setClassIdMap(map);
            }

            // Fetch Branches
            const bData = await api.getBranches(schoolId);
            if (bData) {
                const bNames = bData.map((b: any) => b.name);
                setBranches(bNames);
                const bMap: Record<string, string> = {};
                bData.forEach((b: any) => { bMap[b.name] = b.id; });
                setBranchIdMap(bMap);

                // Default selection if editing
                if (teacherToEdit) {
                    const currentBranches = (teacherToEdit as any).allowed_branch_ids || (teacherToEdit as any).branch_id ? [(teacherToEdit as any).branch_id] : [];
                    const currentBranchNames = bData
                        .filter((b: any) => currentBranches.includes(b.id))
                        .map((b: any) => b.name);
                    setSelectedBranchNames(currentBranchNames);
                } else if (currentBranchId) {
                    const currentBranch = bData.find((b: any) => b.id === currentBranchId);
                    if (currentBranch) setSelectedBranchNames([currentBranch.name]);
                }
            }
        } catch (err) {
            console.error("Error fetching reference data:", err);
        } finally {
            setLoadingRefs(false);
        }
    };

    useEffect(() => {
        fetchRefs();
    }, [schoolId]);

    useAutoSync(['subjects', 'classes'], () => {
        console.log('🔄 [AddTeacher] Real-time auto-sync triggered');
        fetchRefs();
    });

    useEffect(() => {
        if (teacherToEdit) {
            setName(teacherToEdit.name || (teacherToEdit as any).full_name || '');
            setEmail(teacherToEdit.email || '');
            setPhone(teacherToEdit.phone || '');
            
            // Handle subjects - try multiple fields and ensure strings - deduplicate by name
            const rawSubjects = teacherToEdit.subjects || (teacherToEdit as any).subject_specialty || (teacherToEdit as any).teacher_subjects || [];
            const mappedSubjects = rawSubjects.map((s: any) => {
                if (typeof s === 'string') return s;
                return s.subject || s.name || 'Unknown';
            });
            setSubjects(Array.from(new Set(mappedSubjects)));

            // Handle classes - normalize to names/strings - deduplicate by name
            const rawClasses = teacherToEdit.classes || (teacherToEdit as any).assigned_classes || [];
            const mappedClasses = rawClasses.map((c: any) => 
                typeof c === 'string' ? c : (c.class?.name || c.name || 'Unknown Class')
            );
            setClasses(Array.from(new Set(mappedClasses)));

            setStatus(teacherToEdit.status || 'Active');
            setAvatar(teacherToEdit.avatarUrl || (teacherToEdit as any).avatar_url || null);
            setPrimaryCurriculum((teacherToEdit as any).curriculum_type || 'Nigerian');
            
            if ((teacherToEdit as any).curriculum_eligibility) {
                setCurriculumEligibility((teacherToEdit as any).curriculum_eligibility.map((c: string) => c.toUpperCase()));
            }
        }
    }, [teacherToEdit]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setAvatarFile(file);
            const reader = new FileReader();
            reader.onloadend = () => { setAvatar(reader.result as string); };
            reader.readAsDataURL(file);
        }
    };

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { isLimitReached, currentCount, maxLimit } = useTenantLimit();

    const navigate = useNavigate();
    const navigateToSubscription = () => {
        setShowUpgradeModal(false);
        navigate('/subscription');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!teacherToEdit && isLimitReached) {
            setShowUpgradeModal(true);
            return;
        }

        setIsLoading(true);
        let currentTeacherId: string | null = null;
        let authResult: any = null;

        try {
            let avatarUrl = avatar;

            // Handle Photo Upload via API
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${Date.now()}_avatar.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                try {
                    const uploadResult = await api.uploadFile('teacher-documents', filePath, avatarFile);
                    avatarUrl = 'publicUrl' in uploadResult ? uploadResult.publicUrl : uploadResult.url;
                } catch (uploadError) {
                    console.error("Failed to upload avatar:", uploadError);
                }
            }

            const curriculumData = curriculumEligibility.map(c => c === 'NIGERIAN' ? 'Nigerian' : 'British');
            
            // Shared Document Uploads
            const complianceDocs: Record<string, string> = {};
            if (uploadedDocs.length > 0) {
                for (const file of uploadedDocs) {
                    try {
                        const fileName = `${Date.now()}_${file.name}`;
                        let folder = 'general';
                        let dbField = '';
                        if (file.name.toLowerCase().includes('trcn')) { folder = 'trcn'; dbField = 'trcn_certificate'; }
                        else if (file.name.toLowerCase().includes('british') || file.name.toLowerCase().includes('qts')) { folder = 'british'; dbField = 'british_qualification'; }
                        else { folder = 'degree'; dbField = 'degree_certificate'; }

                        const uploadResult = await api.uploadFile('teacher-documents', `temp/${folder}/${fileName}`, file);
                        if (dbField) complianceDocs[dbField] = 'publicUrl' in uploadResult ? uploadResult.publicUrl : uploadResult.url;
                    } catch (err) { console.error("Doc upload failed:", err); }
                }
            }

            // Link each class to each subject for now to ensure availability
            const classSubjectLinks: any[] = [];
            const classIds = classes.map(c => classIdMap[c]).filter(Boolean);
            
            // Create missing subjects if any
            const updatedSubjectIdMap = { ...subjectIdMap };
            for (const subjectName of subjects) {
                if (!updatedSubjectIdMap[subjectName]) {
                    try {
                        const newSubject = await api.createSubject({ name: subjectName, school_id: schoolId });
                        updatedSubjectIdMap[subjectName] = newSubject.id;
                    } catch (err) {
                        console.error(`Failed to create subject ${subjectName}:`, err);
                    }
                }
            }
            
            // Deduplicate to avoid unique constraint errors in backend
            const uniqueClassIds = Array.from(new Set(classIds));
            const uniqueSubjectIds = Array.from(new Set(subjects.map(s => updatedSubjectIdMap[s]).filter(Boolean)));

            uniqueClassIds.forEach(classId => {
                if (uniqueSubjectIds.length > 0) {
                    uniqueSubjectIds.forEach(subjectId => {
                        classSubjectLinks.push({ classId, subjectId });
                    });
                } else {
                    classSubjectLinks.push(classId); // Fallback to just class ID
                }
            });

            const payload = {
                full_name: name,
                email,
                phone,
                status,
                avatar_url: avatarUrl,
                branch_id: selectedBranchNames.length > 0 ? branchIdMap[selectedBranchNames[0]] : branchId,
                allowed_branch_ids: selectedBranchNames.map(name => branchIdMap[name]),
                curriculum_eligibility: curriculumData,
                curriculum_type: primaryCurriculum,
                subject_specialty: subjects, // Keep names for specialty display
                classes: classSubjectLinks,
                ...complianceDocs
            };

            if (teacherToEdit) {
                // UPDATE MODE
                await api.updateTeacher(teacherToEdit.id, payload);
                toast.success('Teacher updated successfully!');
                handleBack();
            } else {
                // CREATE MODE
                const createdTeacher = await api.createTeacher(payload);
                
                // Final Redirect/UI Feedback
                await sendVerificationEmail(name, email || '', 'School App');
                setCredentials({ 
                    username: createdTeacher.username, 
                    password: createdTeacher.initial_password, 
                    email: email || '' 
                });
                setShowCredentialsModal(true);
            }
        } catch (error: any) {
            console.error('❌ Error saving teacher:', error);
            toast.error('Failed to save teacher: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                currentCount={currentCount}
                limit={maxLimit}
                onUpgrade={navigateToSubscription}
            />
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-100 shadow-sm">
                                {avatar ? (
                                    <img 
                                        src={avatar} 
                                        alt="Teacher" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'T')}&background=random`;
                                        }}
                                    />
                                ) : (
                                    <UserIcon className="w-12 h-12 text-gray-400" />
                                )}
                            </div>
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-blue-700 shadow-lg transition-transform hover:scale-110">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                        <InputField id="name" label="Full Name" value={name} onChange={setName} icon={<UserIcon className="w-5 h-5" />} />
                        <InputField id="email" label="Email" value={email} onChange={setEmail} icon={<MailIcon className="w-5 h-5" />} type="email" />
                        <InputField id="phone" label="Phone" value={phone} onChange={setPhone} icon={<PhoneIcon className="w-5 h-5" />} type="tel" />

                        <div>
                            <label htmlFor="primaryCurriculum" className="block text-sm font-medium text-gray-700 mb-1">Primary Curriculum</label>
                            <select id="primaryCurriculum" value={primaryCurriculum} onChange={e => setPrimaryCurriculum(e.target.value as any)} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                                <option value="Nigerian">Nigerian</option>
                                <option value="British">British</option>
                                <option value="Both">Both</option>
                            </select>
                        </div>

                        <MultiSelect
                            label="Assigned Branches"
                            selected={selectedBranchNames}
                            setSelected={setSelectedBranchNames}
                            placeholder={loadingRefs ? "Loading branches..." : "Select branches..."}
                            options={branches}
                        />

                        <MultiSelect
                            label="Subjects"
                            selected={subjects}
                            setSelected={setSubjects}
                            placeholder={loadingRefs ? "Loading subjects..." : "Select subjects..."}
                            options={filteredSubjectOptions}
                        />
                        <MultiSelect
                            label="Classes"
                            selected={classes}
                            setSelected={setClasses}
                            placeholder={loadingRefs ? "Loading classes..." : "Select classes..."}
                            options={validClasses}
                        />

                        {/* Curriculum Section */}
                        <div className="pt-2 border-t border-gray-100">
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Curriculum Eligibility <span className="text-red-500">*</span></label>
                            <div className="flex gap-4 mb-4">
                                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${curriculumEligibility.includes('NIGERIAN') ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={curriculumEligibility.includes('NIGERIAN')}
                                        onChange={e => {
                                            if (e.target.checked) setCurriculumEligibility([...curriculumEligibility, 'NIGERIAN']);
                                            else setCurriculumEligibility(curriculumEligibility.filter(c => c !== 'NIGERIAN'));
                                        }}
                                        className="rounded text-green-600 focus:ring-green-500"
                                    />
                                    <div>
                                        <span className="font-semibold text-gray-800 text-sm">Nigerian</span>
                                        <p className="text-[10px] text-gray-500">Requires TRCN</p>
                                    </div>
                                </label>

                                <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${curriculumEligibility.includes('BRITISH') ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <input
                                        type="checkbox"
                                        checked={curriculumEligibility.includes('BRITISH')}
                                        onChange={e => {
                                            if (e.target.checked) setCurriculumEligibility([...curriculumEligibility, 'BRITISH']);
                                            else setCurriculumEligibility(curriculumEligibility.filter(c => c !== 'BRITISH'));
                                        }}
                                        className="rounded text-red-600 focus:ring-red-500"
                                    />
                                    <div>
                                        <span className="font-semibold text-gray-800 text-sm">British</span>
                                        <p className="text-[10px] text-gray-500">Requires QTS/Intl Cert</p>
                                    </div>
                                </label>
                            </div>

                            <label className="text-sm font-medium text-gray-700 mb-2 block">Compliance Documents</label>
                            
                            {/* Existing Documents Display */}
                            {teacherToEdit && ((teacherToEdit as any).trcn_certificate || (teacherToEdit as any).degree_certificate || (teacherToEdit as any).british_qualification) && (
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Previously Uploaded Documents</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(teacherToEdit as any).trcn_certificate && (
                                            <div className="flex items-center justify-between text-xs bg-white p-2 rounded border border-blue-200">
                                                <span className="flex items-center gap-1"><CheckCircleIcon className="w-3 h-3 text-green-500" /> TRCN Certificate</span>
                                                <button type="button" onClick={() => window.open((teacherToEdit as any).trcn_certificate, '_blank')} className="text-blue-600 hover:underline">View</button>
                                            </div>
                                        )}
                                        {(teacherToEdit as any).degree_certificate && (
                                            <div className="flex items-center justify-between text-xs bg-white p-2 rounded border border-blue-200">
                                                <span className="flex items-center gap-1"><CheckCircleIcon className="w-3 h-3 text-green-500" /> Degree Certificate</span>
                                                <button type="button" onClick={() => window.open((teacherToEdit as any).degree_certificate, '_blank')} className="text-blue-600 hover:underline">View</button>
                                            </div>
                                        )}
                                        {(teacherToEdit as any).british_qualification && (
                                            <div className="flex items-center justify-between text-xs bg-white p-2 rounded border border-blue-200">
                                                <span className="flex items-center gap-1"><CheckCircleIcon className="w-3 h-3 text-green-500" /> British/QTS Cert</span>
                                                <button type="button" onClick={() => window.open((teacherToEdit as any).british_qualification, '_blank')} className="text-blue-600 hover:underline">View</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => (document.getElementById('doc-upload') as HTMLInputElement)?.click()}>
                                <UsersIcon className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-1 text-sm text-gray-600">Click to upload TRCN / Certificates</p>
                                <p className="text-xs text-gray-400 mt-1">(PDF, JPG, PNG)</p>
                                <input id="doc-upload" type="file" multiple className="hidden" onChange={(e) => {
                                    if (e.target.files) setUploadedDocs(Array.from(e.target.files));
                                    toast.success("Documents selected for upload");
                                }} />
                                {uploadedDocs.length > 0 && (
                                    <div className="mt-2 text-left space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">New Selection:</p>
                                        {uploadedDocs.map((file, i) => (
                                            <p key={i} className="text-xs text-green-600 flex items-center gap-1">
                                                <CheckCircleIcon className="w-3 h-3" /> {file.name}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select id="status" value={status} onChange={e => setStatus(e.target.value as 'Active' | 'Inactive' | 'On Leave')} className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </main>
                <div className="p-4 mt-auto bg-gray-50">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 rounded-lg text-white ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
                    >
                        {isLoading ? 'Saving...' : (teacherToEdit ? 'Update Teacher' : 'Save Teacher')}
                    </button>
                </div>
            </form>

            {credentials && (
                <CredentialsModal
                    isOpen={showCredentialsModal}
                    userName={name}
                    username={credentials.username}
                    password={credentials.password}
                    email={credentials.email}
                    userType="Teacher"
                    onClose={() => {
                        setShowCredentialsModal(false);
                        forceUpdate();
                        handleBack();
                    }}
                />
            )}
        </div>
    );
};

const InputField: React.FC<{ id: string, label: string, value: string, onChange: (val: string) => void, icon: React.ReactNode, type?: string }> = ({ id, label, value, onChange, icon, type = 'text' }) => (
    <div>
        <label htmlFor={id} className="text-sm font-medium text-gray-600 sr-only">{label}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{icon}</span>
            <input type={type} name={id} id={id} value={value} onChange={e => onChange(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder={label} required />
        </div>
    </div>
);

export default AddTeacherScreen;
