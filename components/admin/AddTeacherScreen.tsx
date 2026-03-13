
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import { CameraIcon, UserIcon, MailIcon, PhoneIcon, BookOpenIcon, UsersIcon, XCircleIcon, CheckCircleIcon, ChevronDownIcon } from '../../constants';
import { Teacher } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createUserAccount, sendVerificationEmail, checkEmailExists } from '../../lib/auth';

// import { checkUserLimit } from '../../lib/usage-limits'; // Replaced by useTenantLimit
import CredentialsModal from '../ui/CredentialsModal';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useTenantLimit } from '../../hooks/useTenantLimit';
import { api } from '../../lib/api';
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
    const schoolId = profile.schoolId || currentSchool?.id;
    const branchId = currentBranchId || profile.branchId || null;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [status, setStatus] = useState<'Active' | 'Inactive' | 'On Leave'>('Active');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);

    // Phase 7: Curriculum & Compliance
    const [curriculumEligibility, setCurriculumEligibility] = useState<string[]>(['NIGERIAN']); // Default to Nigerian
    const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

    // Validation Lists
    const [validSubjects, setValidSubjects] = useState<string[]>([]);
    const [validClasses, setValidClasses] = useState<string[]>([]);
    const [classIdMap, setClassIdMap] = useState<Record<string, string>>({});
    const [subjectIdMap, setSubjectIdMap] = useState<Record<string, string>>({});
    const [loadingRefs, setLoadingRefs] = useState(true);

    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
    } | null>(null);

    // Fetch Reference Data
    useEffect(() => {
        const fetchRefs = async () => {
            try {
                // Fetch Subjects
                const sData = await api.getSubjects(schoolId, branchId || undefined);
                if (sData) {
                    setValidSubjects(sData.map((d: any) => d.name));
                    const sMap: Record<string, string> = {};
                    sData.forEach((s: any) => { sMap[s.name] = s.id; });
                    setSubjectIdMap(sMap);
                }

                // Fetch Classes
                const cData = await api.getClasses(schoolId, branchId || undefined);
                if (cData) {
                    setValidClasses(cData.map((d: any) => d.name));
                    const map: Record<string, string> = {};
                    cData.forEach((c: any) => { map[c.name] = c.id; });
                    setClassIdMap(map);
                }
            } catch (err) {
                console.error("Error fetching reference data:", err);
            } finally {
                setLoadingRefs(false);
            }
        };
        fetchRefs();
    }, [schoolId]);

    useEffect(() => {
        if (teacherToEdit) {
            setName(teacherToEdit.name);
            setEmail(teacherToEdit.email || '');
            setPhone(teacherToEdit.phone || '');
            setSubjects(teacherToEdit.subjects || []);
            setClasses(teacherToEdit.classes || []);
            setStatus(teacherToEdit.status || 'Active');
            setAvatar(teacherToEdit.avatarUrl || null);
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

            // Handle Photo Upload
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const fileName = `${Date.now()}_avatar.${fileExt}`;
                const filePath = `avatars/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('teacher-documents')
                    .upload(filePath, avatarFile);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('teacher-documents')
                        .getPublicUrl(filePath);
                    avatarUrl = publicUrl;
                }
            }

            const curriculumData = curriculumEligibility.map(c => c === 'NIGERIAN' ? 'Nigerian' : 'British');

            if (teacherToEdit) {
                // UPDATE MODE
                const { error: updateError } = await supabase
                    .from('teachers')
                    .update({
                        name,
                        email,
                        phone,
                        status,
                        avatar_url: avatarUrl,
                        branch_id: branchId,
                        curriculum_eligibility: curriculumData
                    })
                    .eq('id', teacherToEdit.id);

                if (updateError) throw updateError;

                if (teacherToEdit.user_id) {
                    await supabase.from('profiles').update({ full_name: name, avatar_url: avatarUrl }).eq('id', teacherToEdit.user_id);
                    await supabase.from('users').update({ name: name, avatar_url: avatarUrl }).eq('id', teacherToEdit.user_id);
                }

                // Sync assignments
                console.log("🔄 Syncing assignments for teacher:", teacherToEdit.id);
                
                // 1. Legacy Tables (for backward compatibility/reporting)
                await supabase.from('teacher_subjects').delete().eq('teacher_id', teacherToEdit.id);
                if (subjects.length > 0) {
                    const { error: tsErr } = await supabase.from('teacher_subjects').insert(
                        subjects.map(s => ({ teacher_id: teacherToEdit.id, subject: s, school_id: schoolId }))
                    );
                    if (tsErr) console.error("❌ Error syncing teacher_subjects:", tsErr);
                }

                await supabase.from('teacher_classes').delete().eq('teacher_id', teacherToEdit.id);
                if (classes.length > 0) {
                    const { error: tcErr } = await supabase.from('teacher_classes').insert(
                        classes.map(c => ({ teacher_id: teacherToEdit.id, class_name: c.trim(), school_id: schoolId }))
                    );
                    if (tcErr) console.error("❌ Error syncing teacher_classes:", tcErr);
                }

                // 2. Modern Table (class_teachers) - Source of truth for many views
                await supabase.from('class_teachers').delete().eq('teacher_id', teacherToEdit.id);
                
                // Map with robustness (trimming)
                const classIds = classes.map(c => classIdMap[c.trim()] || Object.entries(classIdMap).find(([name]) => name.trim() === c.trim())?.[1]).filter(Boolean);
                const subIds = subjects.map(s => subjectIdMap[s.trim()] || Object.entries(subjectIdMap).find(([name]) => name.trim() === s.trim())?.[1]).filter(Boolean);

                console.log(`📍 Mapping results: Classes(${classes.length} -> ${classIds.length}), Subjects(${subjects.length} -> ${subIds.length})`);

                if (classIds.length > 0) {
                    const ctInserts: any[] = [];
                    classIds.forEach(cid => {
                        if (subIds.length > 0) {
                            subIds.forEach(sid => {
                                ctInserts.push({ 
                                    teacher_id: teacherToEdit.id, 
                                    class_id: cid, 
                                    subject_id: sid, 
                                    school_id: schoolId, 
                                    branch_id: branchId, 
                                    academic_year: '2025-2026', 
                                    is_class_teacher: false 
                                });
                            });
                        } else {
                            ctInserts.push({ 
                                teacher_id: teacherToEdit.id, 
                                class_id: cid, 
                                subject_id: null, 
                                school_id: schoolId, 
                                branch_id: branchId, 
                                academic_year: '2025-2026', 
                                is_class_teacher: false 
                            });
                        }
                    });
                    
                    if (ctInserts.length > 0) {
                        const { error: ctErr } = await supabase.from('class_teachers').insert(ctInserts);
                        if (ctErr) console.error("❌ Error syncing class_teachers:", ctErr);
                        else console.log("✅ Successfully synced class_teachers inserts:", ctInserts.length);
                    }
                }
                currentTeacherId = teacherToEdit.id;
            } else {
                // CREATE MODE
                const teacherEmail = email || `teacher${Date.now()}@school.com`;
                if (!schoolId) throw new Error('School ID missing');

                authResult = await createUserAccount(name, 'Teacher', teacherEmail, schoolId);
                if (authResult.error) throw new Error(authResult.error);

                const { data: uData, error: uError } = await supabase
                    .from('users')
                    .insert([{ email: teacherEmail, name: name, role: 'teacher', avatar_url: avatarUrl }])
                    .select().single();
                if (uError) throw uError;

                const { data: tData, error: tError } = await supabase
                    .from('teachers')
                    .insert([{
                        user_id: uData.id,
                        school_id: schoolId,
                        branch_id: branchId,
                        name,
                        email: teacherEmail,
                        phone,
                        avatar_url: avatarUrl,
                        status,
                        curriculum_eligibility: curriculumData
                    }])
                    .select().single();
                if (tError) {
                    await supabase.from('users').delete().eq('id', uData.id);
                    throw tError;
                }
                currentTeacherId = tData.id;
                console.log("✅ Teacher created with ID:", currentTeacherId);

                // Initial assignments
                if (subjects.length > 0) {
                    await supabase.from('teacher_subjects').insert(subjects.map(s => ({ teacher_id: currentTeacherId, subject: s, school_id: schoolId })));
                }
                if (classes.length > 0) {
                    await supabase.from('teacher_classes').insert(classes.map(c => ({ teacher_id: currentTeacherId, class_name: c.trim(), school_id: schoolId })));
                    
                    const classIds = classes.map(c => classIdMap[c.trim()] || Object.entries(classIdMap).find(([name]) => name.trim() === c.trim())?.[1]).filter(Boolean);
                    const subIds = subjects.map(s => subjectIdMap[s.trim()] || Object.entries(subjectIdMap).find(([name]) => name.trim() === s.trim())?.[1]).filter(Boolean);
                    
                    if (classIds.length > 0) {
                        const ctInserts: any[] = [];
                        classIds.forEach(cid => {
                            if (subIds.length > 0) {
                                subIds.forEach(sid => {
                                    ctInserts.push({ 
                                        teacher_id: currentTeacherId, 
                                        class_id: cid, 
                                        subject_id: sid, 
                                        school_id: schoolId, 
                                        branch_id: branchId, 
                                        academic_year: '2025-2026', 
                                        is_class_teacher: false 
                                    });
                                });
                            } else {
                                ctInserts.push({ 
                                    teacher_id: currentTeacherId, 
                                    class_id: cid, 
                                    subject_id: null, 
                                    school_id: schoolId, 
                                    branch_id: branchId, 
                                    academic_year: '2025-2026', 
                                    is_class_teacher: false 
                                });
                            }
                        });
                        if (ctInserts.length > 0) {
                            const { error: ctErr } = await supabase.from('class_teachers').insert(ctInserts);
                            if (ctErr) console.error("❌ Error creating class_teachers:", ctErr);
                        }
                    }
                }
            }

            // Shared Document Uploads
            if (currentTeacherId && uploadedDocs.length > 0) {
                const complianceDocs: Record<string, string> = {};
                for (const file of uploadedDocs) {
                    try {
                        const fileName = `${Date.now()}_${file.name}`;
                        let folder = 'general';
                        let dbField = '';
                        if (file.name.toLowerCase().includes('trcn')) { folder = 'trcn'; dbField = 'trcn_certificate'; }
                        else if (file.name.toLowerCase().includes('british') || file.name.toLowerCase().includes('qts')) { folder = 'british'; dbField = 'british_qualification'; }
                        else { folder = 'degree'; dbField = 'degree_certificate'; }

                        const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('teacher-documents')
                            .upload(`${currentTeacherId}/${folder}/${fileName}`, file);

                        if (!uploadError) {
                            const { data: urlData } = supabase.storage.from('teacher-documents').getPublicUrl(uploadData.path);
                            if (dbField) complianceDocs[dbField] = urlData.publicUrl;
                        }
                    } catch (err) { console.error("Doc upload failed:", err); }
                }
                if (Object.keys(complianceDocs).length > 0) {
                    await supabase.from('teachers').update(complianceDocs).eq('id', currentTeacherId);
                }
            }

            // Final Redirect/UI Feedback
            if (teacherToEdit) {
                toast.success('Teacher updated successfully!');
                handleBack();
            } else if (authResult) {
                await sendVerificationEmail(name, email || '', 'School App');
                setCredentials({ username: authResult.username, password: authResult.password, email: email || '' });
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
                            <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                                {avatar ? <img src={avatar} alt="Teacher" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-12 h-12 text-gray-400" />}
                            </div>
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-blue-700">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                        <InputField id="name" label="Full Name" value={name} onChange={setName} icon={<UserIcon className="w-5 h-5" />} />
                        <InputField id="email" label="Email" value={email} onChange={setEmail} icon={<MailIcon className="w-5 h-5" />} type="email" />
                        <InputField id="phone" label="Phone" value={phone} onChange={setPhone} icon={<PhoneIcon className="w-5 h-5" />} type="tel" />

                        <MultiSelect
                            label="Subjects"
                            selected={subjects}
                            setSelected={setSubjects}
                            placeholder={loadingRefs ? "Loading subjects..." : "Select subjects..."}
                            options={validSubjects}
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
