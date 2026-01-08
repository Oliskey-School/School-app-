
import React, { useState, useEffect } from 'react';
import { CameraIcon, UserIcon, MailIcon, PhoneIcon, StudentsIcon } from '../../constants';

import { toast } from 'react-hot-toast';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import { Parent } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createUserAccount, sendVerificationEmail, checkEmailExists } from '../../lib/auth';
import { sendWelcomeEmail } from '../../lib/emailService';
import CredentialsModal from '../ui/CredentialsModal';
import { mockParents } from '../../data';

interface AddParentScreenProps {
    parentToEdit?: Parent;
    forceUpdate: () => void;
    handleBack: () => void;
}

const AddParentScreen: React.FC<AddParentScreenProps> = ({ parentToEdit, forceUpdate, handleBack }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [childIds, setChildIds] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
    } | null>(null);

    useEffect(() => {
        const loadParentData = async () => {
            if (parentToEdit) {
                setName(parentToEdit.name);
                setEmail(parentToEdit.email);
                setPhone(parentToEdit.phone);
                setAvatar(parentToEdit.avatarUrl);

                if (isSupabaseConfigured) {
                    try {
                        const { data: links } = await supabase
                            .from('parent_children')
                            .select('student_id')
                            .eq('parent_id', parentToEdit.id);

                        if (links && links.length > 0) {
                            setChildIds(links.map(l => l.student_id).join(', '));
                        } else {
                            // Fallback to prop if DB fetch empty (or just empty)
                            setChildIds((parentToEdit.childIds || []).join(', '));
                        }
                    } catch (err) {
                        console.error("Error loading child links:", err);
                        setChildIds((parentToEdit.childIds || []).join(', '));
                    }
                } else {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const avatarUrl = avatar || `https://i.pravatar.cc/150?u=${name.replace(' ', '')}`;
            const childIdArray = childIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

            // MOCK MODE HANDLING
            if (!isSupabaseConfigured) {
                if (parentToEdit) {
                    const index = mockParents.findIndex(p => p.id === parentToEdit.id);
                    if (index !== -1) {
                        mockParents[index] = {
                            ...mockParents[index],
                            name,
                            email,
                            phone,
                            avatarUrl,
                            childIds: childIdArray
                        };
                    }
                    toast.success('Parent updated successfully (Mock Mode - Session Only)');
                } else {
                    const newId = mockParents.length > 0 ? Math.max(...mockParents.map(p => p.id)) + 1 : 1;
                    mockParents.push({
                        id: newId,
                        name,
                        email,
                        phone,
                        avatarUrl,
                        childIds: childIdArray
                    });
                    // Simulate credentials generation
                    setCredentials({
                        username: email.split('@')[0],
                        password: 'password123',
                        email: email
                    });
                    setShowCredentialsModal(true);
                    setIsLoading(false);
                    return;
                }
                forceUpdate();
                handleBack();
                return;
            }

            if (parentToEdit) {
                // UPDATE MODE
                const { error: updateError } = await supabase
                    .from('parents')
                    .update({
                        name,
                        email,
                        phone,
                        avatar_url: avatarUrl
                    })
                    .eq('id', parentToEdit.id);

                if (updateError) throw updateError;

                // Also update the core User record to keep name/avatar in sync
                if (parentToEdit.user_id) {
                    await supabase
                        .from('users')
                        .update({ name: name, avatar_url: avatarUrl })
                        .eq('id', parentToEdit.user_id);
                }

                // Sync Children Relations
                // 1. Remove all existing links for this parent
                await supabase.from('parent_children').delete().eq('parent_id', parentToEdit.id);

                // 2. Add new links if any
                if (childIdArray.length > 0) {
                    const relations = childIdArray.map(childId => ({
                        parent_id: parentToEdit.id,
                        student_id: childId
                    }));
                    await supabase.from('parent_children').insert(relations);
                }

                toast.success('Parent updated successfully!');
                forceUpdate();
                handleBack();
                return; // Stop execution here
            }
            // CREATE MODE

            // 1. Create Login Credentials (Auth User) FIRST.
            // This ensures we don't end up with a DB record but no login method if Auth fails.
            // Also, this handles the email uniqueness check via Supabase Auth.

            const authResult = await createUserAccount(
                name,
                'Parent',
                email
            );

            if (authResult.error) {
                // Determine if it is a duplicate email error
                if (authResult.error.includes('already registered') || authResult.error.includes('duplicate')) {
                    toast.error('This email is already registered. Please use a different email.');
                } else {
                    toast.error('Failed to create account: ' + authResult.error);
                }
                setIsLoading(false);
                return;
            }

            // 2. Create User Record (Legacy Table)
            // We use the ID from the previous step if we can, but since public.users uses Serial/BigInt,
            // we let it generate its own ID, and we just link them logically via email or a new column if exists.
            // Ideally we should store the Auth UUID in 'users' table, but adhering to existing schema:

            const { data: newUserData, error: userError } = await supabase
                .from('users')
                .insert([{
                    email: email,
                    name: name,
                    role: 'Parent',
                    avatar_url: avatarUrl
                }])
                .select()
                .single();

            if (userError) {
                // Rollback opportunity here (delete auth user), but for MVP we just show error.
                // In production, use a transaction or edge function.
                throw userError;
            }

            const userData = newUserData;

            // 3. Create Parent Profile
            const { data: newParentData, error: parentError } = await supabase
                .from('parents')
                .insert([{
                    user_id: userData.id, // Linking to Legacy User ID
                    name,
                    email: email,
                    phone,
                    avatar_url: avatarUrl
                }])
                .select()
                .single();

            if (parentError) throw parentError;
            const parentData = newParentData;

            // 4. Link Students to Parent
            if (childIdArray.length > 0) {
                const relations = childIdArray.map(childId => ({
                    parent_id: parentData.id,
                    student_id: childId
                }));

                const { error: relationError } = await supabase
                    .from('parent_children')
                    .insert(relations);

                if (relationError) console.warn("Could not link all students:", relationError.message);
            }

            // 5. Send Welcome Email (Handled by Supabase Auth automatically now)
            // But we can still simulate the welcome message in the UI or logs.
            console.log('User created. Verification email sent by Supabase.');

            // Show credentials modal
            setCredentials({
                username: authResult.username,
                password: authResult.password,
                email: email
            });
            setShowCredentialsModal(true);
            // Don't call forceUpdate/handleBack here - let modal handle it
        } catch (error: any) {
            console.error('Error saving parent:', error);
            toast.error('Failed to save parent: ' + (error.message || 'Unknown error'));
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
