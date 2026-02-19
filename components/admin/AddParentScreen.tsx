
import React, { useState, useEffect } from 'react';
import { CameraIcon, UserIcon, MailIcon, PhoneIcon, StudentsIcon } from '../../constants';

import { toast } from 'react-hot-toast';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import { Parent } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createUserAccount, sendVerificationEmail, checkEmailExists } from '../../lib/auth';
import { sendWelcomeEmail } from '../../lib/emailService';
import CredentialsModal from '../ui/CredentialsModal';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';

interface AddParentScreenProps {
    parentToEdit?: Parent;
    forceUpdate: () => void;
    handleBack: () => void;
}

const AddParentScreen: React.FC<AddParentScreenProps> = ({ parentToEdit, forceUpdate, handleBack }) => {
    const { profile } = useProfile();
    const { currentSchool, currentBranchId } = useAuth(); // Added useAuth
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [childIds, setChildIds] = useState('');
    const [address, setAddress] = useState(''); // Existing field
    const [occupation, setOccupation] = useState(''); // Existing field
    const [relationship, setRelationship] = useState<'Father' | 'Mother' | 'Guardian' | 'Other'>('Father'); // ✅ NEW
    const [emergencyContact, setEmergencyContact] = useState(''); // ✅ NEW
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
    } | null>(null);

    // School and Branch IDs
    const schoolId = profile.schoolId || currentSchool?.id;
    const branchId = currentBranchId || profile.branchId || null;

    useEffect(() => {
        const loadParentData = async () => {
            if (parentToEdit) {
                setName(parentToEdit.name);
                setEmail(parentToEdit.email);
                setPhone(parentToEdit.phone);
                setAvatar(parentToEdit.avatarUrl);
                setAddress(parentToEdit.address || ''); // ✅ NEW
                setOccupation(parentToEdit.occupation || ''); // ✅ NEW
                setRelationship((parentToEdit.relationship as any) || 'Father'); // ✅ NEW
                setEmergencyContact(parentToEdit.emergency_contact || ''); // ✅ NEW

                try {
                    const { data: links } = await supabase
                        .from('student_parent_links')
                        .select('student_user_id')
                        .eq('parent_user_id', parentToEdit.user_id);

                    if (links && links.length > 0) {
                        // Fetch the readable IDs for these students
                        const studentUserIds = links.map(l => l.student_user_id);
                        const { data: students } = await supabase
                            .from('students')
                            .select('school_generated_id, admission_number')
                            .in('user_id', studentUserIds);

                        if (students && students.length > 0) {
                            // Prefer school_generated_id, fallback to admission_number
                            const readableIds = students.map(s => s.school_generated_id || s.admission_number).filter(Boolean);
                            setChildIds(readableIds.join(', '));
                        } else {
                            // Fallback to UUIDs if lookup fails (shouldn't happen)
                            setChildIds(studentUserIds.join(', '));
                        }
                    } else {
                        // Fallback to prop if DB fetch empty (or just empty)
                        setChildIds((parentToEdit.childIds || []).join(', '));
                    }
                } catch (err) {
                    console.error("Error loading child links:", err);
                    setChildIds((parentToEdit.childIds || []).join(', '));
                }
            }
        };
        loadParentData();
    }, [parentToEdit]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => { setAvatar(reader.result as string); };
            reader.readAsDataURL(event.target.files[0]);
        }
    };

    // Error Mapping Utility
    const mapErrorToUserMessage = (error: any): string => {
        const msg = error.message || error.toString();
        if (msg.includes('permission denied')) return 'Administrative privileges required to perform this action.';
        if (msg.includes('duplicate key')) return 'A parent with this email already exists.';
        if (msg.includes('network')) return 'Network connection issue. Please check your internet.';
        if (msg.includes('timeout')) return 'Request timed out due to slow connection. Please try again.';
        return 'An unexpected error occurred. Please try again.';
    };

    const retryWithTimeout = async (fn: () => Promise<any>, retries = 3, timeout = 15000): Promise<any> => {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < retries; i++) {
            try {
                // creating a promise that rejects after timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('timeout')), timeout)
                );

                // race against timeout
                return await Promise.race([fn(), timeoutPromise]);
            } catch (err: any) {
                if (i === retries - 1) throw err; // throw if last retry
                await delay(2000 * (i + 1)); // Increased backoff
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        const toastId = toast.loading('Saving parent information...');

        try {
            const avatarUrl = avatar || `https://i.pravatar.cc/150?u=${name.replace(' ', '')}`;
            // Handle both admission numbers and UUIDs
            const rawChildIds = childIds.split(',').map(id => id.trim()).filter(id => id.length > 0);
            // const childIdArray = rawChildIds.map(id => parseInt(id)).filter(id => !isNaN(id)); // Removed as we use string IDs now

            // Wrap the main logic in a function for retry
            const saveOperation = async () => {
                if (parentToEdit) {
                    // UPDATE MODE
                    const { error: updateError } = await supabase
                        .from('parents')
                        .update({
                            name,
                            email,
                            phone,
                            address: address || null,
                            occupation: occupation || null,
                            relationship: relationship,
                            emergency_contact: emergencyContact || null,
                            avatar_url: avatarUrl,
                            branch_id: branchId
                        })
                        .eq('id', parentToEdit.id);

                    if (updateError) throw updateError;

                    if (parentToEdit.user_id) {
                        await supabase.from('users').update({ name, avatar_url: avatarUrl, branch_id: branchId }).eq('id', parentToEdit.user_id);
                    }

                    // Transactional-like update for children
                    if (parentToEdit.user_id) {
                        await supabase
                            .from('student_parent_links')
                            .delete()
                            .eq('parent_user_id', parentToEdit.user_id)
                            .eq('school_id', schoolId);
                    }
                    if (rawChildIds.length > 0) {
                        // Resolve IDs: Check school_generated_id, admission_number, OR user_id (UUID)
                        const { data: students } = await supabase
                            .from('students')
                            .select('user_id')
                            .or(`school_generated_id.in.(${rawChildIds.join(',')}),admission_number.in.(${rawChildIds.join(',')}),user_id.in.(${rawChildIds.join(',')})`);

                        if (students && students.length > 0) {
                            // Deduplicate user_ids just in case
                            const uniqueStudentUserIds = [...new Set(students.map(s => s.user_id))];
                            const relations = uniqueStudentUserIds.map(sid => ({
                                parent_user_id: parentToEdit.user_id,
                                student_user_id: sid,
                                school_id: schoolId,
                                branch_id: branchId
                            }));
                            await supabase.from('student_parent_links').insert(relations);
                        }
                    }

                    toast.success('Parent updated successfully!', { id: toastId });
                    forceUpdate();
                    handleBack();
                } else {
                    // CREATE MODE
                    // 1. Create Login Credentials
                    const authResult = await createUserAccount(name, 'Parent', email, schoolId);
                    if (authResult.error) throw new Error(authResult.error);

                    // 2. Create User Record
                    const { data: newUserData, error: userError } = await supabase
                        .from('users')
                        .insert([{
                            email,
                            name,
                            role: 'Parent',
                            avatar_url: avatarUrl,
                            school_id: schoolId,
                            branch_id: branchId
                        }])
                        .select()
                        .single();

                    if (userError) throw userError;

                    // 3. Create Parent Profile
                    const { data: newParentData, error: parentError } = await supabase
                        .from('parents')
                        .insert([{
                            user_id: newUserData.id,
                            school_id: schoolId,
                            branch_id: branchId,
                            name,
                            email,
                            phone,
                            address: address || null,
                            occupation: occupation || null,
                            relationship: relationship,
                            emergency_contact: emergencyContact || null,
                            avatar_url: avatarUrl
                        }])
                        .select()
                        .single();

                    if (parentError) throw parentError;

                    // 4. Link Students
                    if (rawChildIds.length > 0) {
                        // Resolve IDs: Check school_generated_id, admission_number, OR user_id (UUID)
                        const { data: students } = await supabase
                            .from('students')
                            .select('user_id')
                            .or(`school_generated_id.in.(${rawChildIds.join(',')}),admission_number.in.(${rawChildIds.join(',')}),user_id.in.(${rawChildIds.join(',')})`);

                        if (students && students.length > 0) {
                            const uniqueStudentUserIds = [...new Set(students.map(s => s.user_id))];
                            const relations = uniqueStudentUserIds.map(sid => ({
                                parent_user_id: newUserData.id,
                                student_user_id: sid,
                                school_id: schoolId,
                                branch_id: branchId
                            }));
                            await supabase.from('student_parent_links').insert(relations);
                        }
                    }

                    toast.success('Parent created successfully!', { id: toastId });
                    setCredentials({ username: authResult.username, password: authResult.password, email });
                    setShowCredentialsModal(true);
                }
            };

            // Execute with Retry
            await retryWithTimeout(saveOperation);

        } catch (error: any) {
            console.error('Error saving parent:', error);
            const userMsg = mapErrorToUserMessage(error);
            toast.error(userMsg, { id: toastId, duration: 5000 });
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
                                {avatar ? <img src={avatar} alt="Parent" className="w-full h-full rounded-full object-cover" /> : <UserIcon className="w-12 h-12 text-gray-400" />}
                            </div>
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-sky-500 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-sky-600">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">

                        {/* Personal Information Section */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField id="name" label="Full Name" value={name} onChange={setName} icon={<UserIcon className="w-5 h-5" />} placeholder="e.g. John Doe" />
                                <InputField id="phone" label="Phone Number" value={phone} onChange={setPhone} icon={<PhoneIcon className="w-5 h-5" />} type="tel" placeholder="+1234567890" />
                            </div>
                            <InputField id="email" label="Email Address" value={email} onChange={setEmail} icon={<MailIcon className="w-5 h-5" />} type="email" placeholder="john.doe@example.com" />

                            {/* ✅ NEW FIELDS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
                                        Relationship to Student *
                                    </label>
                                    <select
                                        id="relationship"
                                        value={relationship}
                                        onChange={(e) => setRelationship(e.target.value as any)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="Father">Father</option>
                                        <option value="Mother">Mother</option>
                                        <option value="Guardian">Guardian</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <InputField
                                    id="occupation"
                                    label="Occupation"
                                    value={occupation}
                                    onChange={setOccupation}
                                    icon={<UserIcon className="w-5 h-5" />}
                                    placeholder="e.g. Software Engineer"
                                    required={false}
                                />
                            </div>
                            <InputField
                                id="address"
                                label="Home Address"
                                value={address}
                                onChange={setAddress}
                                icon={<UserIcon className="w-5 h-5" />}
                                placeholder="123 Main St, City, State"
                                required={false}
                            />
                            <InputField
                                id="emergencyContact"
                                label="Emergency Contact Number"
                                value={emergencyContact}
                                onChange={setEmergencyContact}
                                icon={<PhoneIcon className="w-5 h-5" />}
                                type="tel"
                                placeholder="+1234567890 (Alternative contact)"
                                required={false}
                            />
                        </div>

                        {/* Student Linking Section */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold text-gray-800">Link Students</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Optional</span>
                            </div>
                            <p className="text-sm text-gray-500">Enter the IDs of students this parent is responsible for.</p>
                            <InputField
                                id="childIds"
                                label="Student IDs (Comma Separated)"
                                value={childIds}
                                onChange={setChildIds}
                                icon={<StudentsIcon className="w-5 h-5" />}
                                placeholder="e.g. 101, 102"
                                required={false}
                            />
                        </div>
                    </div>
                </main>
                <div className="p-4 mt-auto bg-gray-50">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 rounded-lg text-white ${isLoading ? 'bg-gray-400' : 'bg-sky-500 hover:bg-sky-600'} transition-colors`}
                    >
                        {isLoading ? 'Saving...' : (parentToEdit ? 'Update Parent' : 'Save Parent')}
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
                    userType="Parent"
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

const InputField: React.FC<{
    id: string,
    label: string,
    value: string,
    onChange: (val: string) => void,
    icon: React.ReactNode,
    type?: string,
    placeholder?: string,
    required?: boolean
}> = ({ id, label, value, onChange, icon, type = 'text', placeholder, required = true }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">{icon}</span>
            <input
                type={type}
                name={id}
                id={id}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all placeholder-gray-400 focus:bg-white"
                placeholder={placeholder || label}
                required={required}
            />
        </div>
    </div>
);

export default AddParentScreen;
