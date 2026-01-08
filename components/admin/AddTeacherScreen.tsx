
import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import { CameraIcon, UserIcon, MailIcon, PhoneIcon, BookOpenIcon, UsersIcon, XCircleIcon, CheckCircleIcon } from '../../constants';
import { Teacher } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createUserAccount, sendVerificationEmail, checkEmailExists } from '../../lib/auth';
import CredentialsModal from '../ui/CredentialsModal';
import { mockTeachers } from '../../data';

interface AddTeacherScreenProps {
    teacherToEdit?: Teacher;
    forceUpdate: () => void;
    handleBack: () => void;
}

const TagInput: React.FC<{
    label: string;
    tags: string[];
    setTags: React.Dispatch<React.SetStateAction<string[]>>;
    placeholder: string;
    validOptions?: string[];
    validationMessage?: string;
}> = ({ label, tags, setTags, placeholder, validOptions, validationMessage }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAddTag = () => {
        const newTag = input.trim();
        if (!newTag) return;

        if (tags.includes(newTag)) {
            setInput('');
            setError(null);
            return;
        }

        // VALIDATION LOGIC
        if (validOptions && validOptions.length > 0) {
            // Case-insensitive check
            const match = validOptions.find(opt => opt.toLowerCase() === newTag.toLowerCase());
            if (!match) {
                setError(validationMessage || `Invalid value.Please select from the list.`);
                // Optional: Show valid options in console or UI suggestion
                return;
            }
            // Use the canonical casing from validOptions
            setTags([...tags, match]);
        } else {
            setTags([...tags, newTag]);
        }

        setInput('');
        setError(null);
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag();
        }
    };

    return (
        <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
            <div className={`flex flex - wrap items - center gap - 2 p - 2 border rounded - lg bg - gray - 50 ${error ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-300'} `}>
                {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 bg-sky-100 text-sky-800 text-sm font-semibold px-2 py-1 rounded-md">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="text-sky-600 hover:text-sky-800">
                            <XCircleIcon className="w-4 h-4" />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(null); }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="flex-grow bg-transparent p-1 text-gray-700 focus:outline-none"
                    list={`list - ${label.replace(/\s/g, '')} `}
                />
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {/* Datalist for suggestions */}
            {validOptions && (
                <datalist id={`list - ${label.replace(/\s/g, '')} `}>
                    {validOptions.map(opt => <option key={opt} value={opt} />)}
                </datalist>
            )}
        </div>
    );
};


const AddTeacherScreen: React.FC<AddTeacherScreenProps> = ({ teacherToEdit, forceUpdate, handleBack }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [classes, setClasses] = useState<string[]>([]);
    const [status, setStatus] = useState<'Active' | 'Inactive' | 'On Leave'>('Active');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);

    // Phase 7: Curriculum & Compliance
    const [curriculumEligibility, setCurriculumEligibility] = useState<string[]>(['NIGERIAN']); // Default to Nigerian
    const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);

    // Validation Lists
    const [validSubjects, setValidSubjects] = useState<string[]>([]);
    const [validClasses, setValidClasses] = useState<string[]>([]);
    const [loadingRefs, setLoadingRefs] = useState(true);

    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
    } | null>(null);

    // Fetch Reference Data
    useEffect(() => {
        const fetchRefs = async () => {
            if (!isSupabaseConfigured) {
                // Mock reference data
                setValidSubjects(['Math', 'English', 'Science', 'History', 'Geography', 'Art', 'Music', 'PE', 'Physics', 'Chemistry', 'Biology']);
                setValidClasses(['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']);
                setLoadingRefs(false);
                return;
            }

            try {
                // Fetch Subjects
                const { data: sData } = await supabase.from('subjects').select('name');
                if (sData) setValidSubjects(sData.map(d => d.name));

                // Fetch Classes
                const { data: cData } = await supabase.from('classes').select('class_name');
                if (cData) setValidClasses(cData.map(d => d.class_name));

            } catch (err) {
                console.error("Error fetching reference data:", err);
            } finally {
                setLoadingRefs(false);
            }
        };
        fetchRefs();
    }, []);

    useEffect(() => {
        if (teacherToEdit) {
            setName(teacherToEdit.name);
            setEmail(teacherToEdit.email);
            setPhone(teacherToEdit.phone);
            setSubjects(teacherToEdit.subjects);
            // Normalize incoming class strings so they match the app format (e.g. `10A`)
            const normalize = (s: string) => {
                if (!s) return s;
                let cleaned = s.replace(/Grade\s*/i, '').replace(/\s+/g, '').toUpperCase();
                const m = cleaned.match(/(\d+)([A-Z]+)/i);
                if (m) return `${parseInt(m[1], 10)}${m[2]} `;
                const m2 = cleaned.match(/(\d+)/);
                if (m2) return `${parseInt(m2[1], 10)} `;
                return cleaned;
            };
            setClasses((teacherToEdit.classes || []).map(normalize));
            setStatus(teacherToEdit.status);
            setAvatar(teacherToEdit.avatarUrl);
        }
    }, [teacherToEdit]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => { setAvatar(reader.result as string); };
            reader.readAsDataURL(event.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const avatarUrl = avatar || `https://i.pravatar.cc/150?u=${name.replace(' ', '')}`;

            // MOCK MODE HANDLING
            if (!isSupabaseConfigured) {
                const teacherEmail = email || `teacher${Date.now()}@school.com`;
                if (teacherToEdit) {
                    const index = mockTeachers.findIndex(t => t.id === teacherToEdit.id);
                    if (index !== -1) {
                        mockTeachers[index] = {
                            ...mockTeachers[index],
                            name,
                            email: teacherEmail,
                            phone,
                            subjects,
                            classes,
                            status,
                            avatarUrl
                        };
                    }
                    toast.success('Teacher updated successfully (Mock Mode - Session Only)');
                } else {
                    const newId = mockTeachers.length > 0 ? Math.max(...mockTeachers.map(t => t.id)) + 1 : 1;
                    mockTeachers.push({
                        id: newId,
                        name,
                        email: teacherEmail,
                        phone,
                        subjects,
                        classes,
                        status,
                        avatarUrl,
                    });
                    // Simulate credentials generation
                    setCredentials({
                        username: teacherEmail.split('@')[0],
                        password: 'password123',
                        email: teacherEmail
                    });
                    setShowCredentialsModal(true);
                    setIsLoading(false);
                    return;
                }
                forceUpdate();
                handleBack();
                return;
            }

            if (teacherToEdit) {
                // UPDATE MODE
                // 1. Update basic info
                const { error: updateError } = await supabase
                    .from('teachers')
                    .update({
                        name,
                        email,
                        phone,
                        status,
                        avatar_url: avatarUrl
                    })
                    .eq('id', teacherToEdit.id);

                if (updateError) throw updateError;

                // 2. Update Subjects (Delete all, re-insert)
                await supabase.from('teacher_subjects').delete().eq('teacher_id', teacherToEdit.id);
                if (subjects.length > 0) {
                    const subjectInserts = subjects.map(subject => ({
                        teacher_id: teacherToEdit.id,
                        subject
                    }));
                    await supabase.from('teacher_subjects').insert(subjectInserts);
                }

                // 3. Update Classes (Delete all, re-insert)
                await supabase.from('teacher_classes').delete().eq('teacher_id', teacherToEdit.id);
                if (classes.length > 0) {
                    // Normalize classes to a canonical format (e.g. `10A`) before inserting
                    const normalize = (s: string) => {
                        if (!s) return s;
                        let cleaned = s.replace(/Grade\s*/i, '').replace(/\s+/g, '').toUpperCase();
                        const m = cleaned.match(/(\d+)([A-Z]+)/i);
                        if (m) return `${parseInt(m[1], 10)}${m[2]}`;
                        const m2 = cleaned.match(/(\d+)/);
                        if (m2) return `${parseInt(m2[1], 10)}`;
                        return cleaned;
                    };

                    const normalized = Array.from(new Set(classes.map(normalize).filter(Boolean)));
                    const classInserts = normalized.map(className => ({
                        teacher_id: teacherToEdit.id,
                        class_name: className
                    }));
                    await supabase.from('teacher_classes').insert(classInserts);
                }

                toast.success('Teacher updated successfully!');
            } else {
                // CREATE MODE
                const teacherEmail = email || `teacher${Date.now()}@school.com`;

                // 1. Create Login Credentials (Auth User) FIRST
                const authResult = await createUserAccount(
                    name,
                    'Teacher',
                    teacherEmail
                );

                if (authResult.error) {
                    if (authResult.error.includes('already registered') || authResult.error.includes('duplicate')) {
                        toast.error(`Teacher with email ${teacherEmail} is already registered.`);
                    } else {
                        toast.error('Failed to create account: ' + authResult.error);
                    }
                    setIsLoading(false);
                    return;
                }

                // 2. Create User (Legacy Table)

                const { data: newUserData, error: userError } = await supabase
                    .from('users')
                    .insert([{
                        email: teacherEmail,
                        name: name,
                        role: 'Teacher',
                        avatar_url: avatarUrl
                    }])
                    .select()
                    .single();

                if (userError) throw userError;
                const userData = newUserData;

                // 3. Create Teacher Profile

                // Check if teacher profile also exists (unlikely in this flow, but safe to keep logic if merging)
                // Since this is CREATE MODE, we assume it's fresh.

                const { data: newTeacherData, error: teacherError } = await supabase
                    .from('teachers')
                    .insert([{
                        user_id: userData.id,
                        name,
                        email: teacherEmail,
                        phone,
                        avatar_url: avatarUrl,
                        status
                    }])
                    .select()
                    .single();

                if (teacherError) throw teacherError;
                const teacherData = newTeacherData;

                // 4. Add subjects (linked to Legacy ID)
                if (subjects.length > 0) {
                    const subjectInserts = subjects.map(subject => ({
                        teacher_id: teacherData.id,
                        subject
                    }));
                    await supabase.from('teacher_subjects').insert(subjectInserts);
                }

                // 5. Add classes (linked to Legacy ID)
                if (classes.length > 0) {
                    // Normalize classes to a canonical format (e.g. `10A`) before inserting
                    const normalize = (s: string) => {
                        if (!s) return s;
                        let cleaned = s.replace(/Grade\s*/i, '').replace(/\s+/g, '').toUpperCase();
                        const m = cleaned.match(/(\d+)([A-Z]+)/i);
                        if (m) return `${parseInt(m[1], 10)}${m[2]}`;
                        const m2 = cleaned.match(/(\d+)/);
                        if (m2) return `${parseInt(m2[1], 10)}`;
                        return cleaned;
                    };

                    const normalized = Array.from(new Set(classes.map(normalize).filter(Boolean)));
                    const classInserts = normalized.map(className => ({
                        teacher_id: teacherData.id,
                        class_name: className
                    }));
                    await supabase.from('teacher_classes').insert(classInserts);
                }

                // 6. (Auth was already created)
                console.log('Teacher credentials created successfully.');


                // Send verification email
                const emailResult = await sendVerificationEmail(name, teacherEmail, 'School App');
                if (!emailResult.success) {
                    console.warn('Warning: Email verification notification failed:', emailResult.error);
                }

                // Show credentials modal instead of alert
                setCredentials({
                    username: authResult.username,
                    password: authResult.password,
                    email: teacherEmail
                });
                setShowCredentialsModal(true);
            }

            // Don't call forceUpdate/handleBack here - let modal handle it
        } catch (error: any) {
            console.error('Error saving teacher:', error);
            toast.error('Failed to save teacher: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                                {avatar ? <img src={avatar} alt="Teacher" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-12 h-12 text-gray-400" />}
                            </div>
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-sky-500 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-sky-600">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                        <InputField id="name" label="Full Name" value={name} onChange={setName} icon={<UserIcon className="w-5 h-5" />} />
                        <InputField id="email" label="Email" value={email} onChange={setEmail} icon={<MailIcon className="w-5 h-5" />} type="email" />
                        <InputField id="phone" label="Phone" value={phone} onChange={setPhone} icon={<PhoneIcon className="w-5 h-5" />} type="tel" />

                        <TagInput
                            label="Subjects"
                            tags={subjects}
                            setTags={setSubjects}
                            placeholder={loadingRefs ? "Loading subjects..." : "Add subject & press Enter"}
                            validOptions={validSubjects}
                            validationMessage="Subject not found in database. Please ask admin to add it."
                        />
                        <TagInput
                            label="Classes"
                            tags={classes}
                            setTags={setClasses}
                            placeholder={loadingRefs ? "Loading classes..." : "Add class (e.g., 7A) & press Enter"}
                            validOptions={validClasses}
                            validationMessage="Class not found in database. Please ask admin to add it."
                        />


                        {/* Phase 7: Curriculum & Compliance Section */}
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
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                                <UsersIcon className="mx-auto h-8 w-8 text-gray-400" />
                                <p className="mt-1 text-sm text-gray-600">Click to upload TRCN / Certificates</p>
                                <p className="text-xs text-gray-400 mt-1">(PDF, JPG, PNG)</p>
                                <input type="file" multiple className="hidden" onChange={(e) => {
                                    if (e.target.files) setUploadedDocs(Array.from(e.target.files));
                                    toast.success("Documents selected (Mock Upload)");
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
                        className={`w-full flex justify-center py-3 px-4 rounded-lg text-white ${isLoading ? 'bg-gray-400' : 'bg-sky-500 hover:bg-sky-600'} transition-colors`}
                    >
                        {isLoading ? 'Saving...' : (teacherToEdit ? 'Update Teacher' : 'Save Teacher')}
                    </button>
                </div>
            </form>

            {/* Credentials Modal */}
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
            <input type={type} name={id} id={id} value={value} onChange={e => onChange(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder={label} required />
        </div>
    </div>
);

export default AddTeacherScreen;
