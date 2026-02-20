
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Phone as PhoneIcon, Mail as MailIcon, Camera as CameraIcon, X as XMarkIcon, AlertTriangle as ExclamationTriangleIcon } from 'lucide-react';
import { Student, Department } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createUserAccount, generateUsername, generatePassword, sendVerificationEmail, checkEmailExists } from '../../lib/auth';
import CredentialsModal from '../ui/CredentialsModal';
import { useProfile } from '../../context/ProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useTenantLimit } from '../../hooks/useTenantLimit';
import UpgradeModal from '../shared/UpgradeModal';

interface AddStudentScreenProps {
    studentToEdit?: Student;
    forceUpdate: () => void;
    handleBack: () => void;
}

const AddStudentScreen: React.FC<AddStudentScreenProps> = ({ studentToEdit, forceUpdate, handleBack }) => {
    const { profile, refreshProfile } = useProfile();
    const { currentSchool, currentBranchId, user } = useAuth(); // Added user and currentBranchId

    // Triple-layer schoolId detection
    const schoolId = profile.schoolId || currentSchool?.id;

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [birthday, setBirthday] = useState('');
    const [className, setClassName] = useState('');
    const [section, setSection] = useState('');
    const [department, setDepartment] = useState<Department | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentials, setCredentials] = useState<{
        username: string;
        password: string;
        email: string;
        secondary?: {
            userName: string;
            username: string;
            password: string;
            email: string;
            userType: string;
        };
    } | null>(null);

    const [guardianName, setGuardianName] = useState('');
    const [guardianPhone, setGuardianPhone] = useState('');
    const [guardianEmail, setGuardianEmail] = useState('');
    const [admissionNumber, setAdmissionNumber] = useState(''); // ⚠️ Added orphaned field
    const [studentAddress, setStudentAddress] = useState(''); // ⚠️ Added orphaned field

    const grade = useMemo(() => {
        const match = className.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }, [className]);
    useEffect(() => {
        if (!schoolId) {
            console.log("School ID missing in profile/auth, refreshing...");
            refreshProfile();
        }
    }, [refreshProfile, schoolId]);

    useEffect(() => {
        if (studentToEdit) {
            setSelectedImage(studentToEdit.avatarUrl);
            setFullName(studentToEdit.name);
            setBirthday(studentToEdit.birthday || '');
            setClassName(`Grade ${studentToEdit.grade} `);
            setSection(studentToEdit.section);
            setDepartment(studentToEdit.department || '');

            // Fetch Guardian Info
            const fetchGuardian = async () => {
                try {
                    const { data, error } = await supabase
                        .from('parent_children')
                        .select(`
parents(
    name,
    email,
    phone
)
                        `)
                        .eq('student_id', studentToEdit.id)
                        .maybeSingle();

                    if (!error && data && data.parents) {
                        // Supabase returns the joined resource. Typescript might view it as array or object.
                        // In a singular select like this from a join table, it's usually an object if the FK is correct.
                        const p: any = Array.isArray(data.parents) ? data.parents[0] : data.parents;
                        if (p) {
                            setGuardianName(p.name || '');
                            setGuardianEmail(p.email || '');
                            setGuardianPhone(p.phone || '');
                        }
                    }
                } catch (err) {
                    console.error("Error fetching guardian info:", err);
                }
            };

            fetchGuardian();

            // ⚠️ Set orphaned fields if available
            setAdmissionNumber(studentToEdit.admission_number || '');
            setStudentAddress(studentToEdit.address || '');
            setGender(studentToEdit.gender || '');
        }
    }, [studentToEdit]);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { isLimitReached, currentCount, maxLimit, isPremium } = useTenantLimit();

    const navigate = useNavigate();
    const navigateToSubscription = () => {
        setShowUpgradeModal(false);
        navigate('/subscription');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // CHECK USAGE LIMITS (Only for new students, not edits)
        if (!studentToEdit && isLimitReached) {
            setShowUpgradeModal(true);
            setIsLoading(false);
            return;
        }

        try {
            // Normalize inputs
            const gEmail = guardianEmail.trim().toLowerCase();
            const gName = guardianName.trim();

            if (gName && !gEmail) {
                toast.error("Guardian Email is required to create or link guardian details.");
                setIsLoading(false);
                return;
            }

            // Generate email for the student
            let generatedEmail = `${fullName.toLowerCase().replace(/\s+/g, '.')}@student.school.com`;
            const avatarUrl = selectedImage || `https://i.pravatar.cc/150?u=${fullName.replace(' ', '')}`;

            // Determine Status and Branch
            const isTeacher = profile?.role === 'teacher' || user?.user_metadata?.role === 'teacher';
            // If editing, preserve status unless explicitly approved? For now, keep as is or default to Active.
            // If creating, Teachers -> Pending, Admins -> Active
            const initialStatus = (isTeacher ? 'Pending' : 'Active') as 'Pending' | 'Active';
            const branchId = currentBranchId || profile.branchId || null;

            if (studentToEdit) {
                // UPDATE MODE - Update existing student in Supabase
                const { error: updateError } = await supabase
                    .from('students')
                    .update({
                        name: fullName,
                        grade,
                        section,
                        department: department || null,
                        birthday: birthday || null,
                        dob: birthday || null, // Also update dob column
                        avatar_url: avatarUrl,
                        admission_number: admissionNumber || null, // ⚠️ Added
                        address: studentAddress || null, // ⚠️ Added
                        gender: gender || null,
                        // status: 'Active' // Don't reset status on edit unless admin?
                        // If admin edits, maybe they want to approve? But separate approve action is better.
                    })
                    .eq('id', studentToEdit.id);

                if (updateError) throw updateError;

                let guardianMessage = '';

                // --- GUARDIAN HANDLING FOR UPDATE ---
                if (gEmail && gName) {
                    try {
                        // 1. Check if User exists first (to handle cases where User exists but Parent profile doesn't)
                        const { data: existingUser } = await supabase
                            .from('users')
                            .select('id, name, email')
                            .eq('email', gEmail)
                            .maybeSingle();

                        let parentIdToLink: string | null = null; // UUID type
                        let parentNameForMsg = gName;

                        if (existingUser) {
                            // User exists. Check if Parent profile exists.
                            const { data: existingParent } = await supabase
                                .from('parents')
                                .select('id')
                                .eq('user_id', existingUser.id)
                                .maybeSingle();

                            if (existingParent) {
                                parentIdToLink = existingParent.id;
                                // Update phone/name if needed? Optional.
                            } else {
                                // User exists, create Parent profile
                                const { data: newProfile, error: profileErr } = await supabase
                                    .from('parents')
                                    .insert([{
                                        user_id: existingUser.id,
                                        name: gName,
                                        email: gEmail,
                                        phone: guardianPhone || null,
                                        avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`,
                                        branch_id: branchId
                                    }])
                                    .select()
                                    .single();

                                if (profileErr) throw profileErr;
                                parentIdToLink = newProfile.id;
                            }
                        } else {
                            // Create Fresh User & Parent
                            const { data: newUser, error: uErr } = await supabase
                                .from('users')
                                .insert([{
                                    email: gEmail,
                                    name: gName,
                                    role: 'parent',
                                    avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`,
                                    school_id: schoolId,
                                    branch_id: branchId
                                }])
                                .select()
                                .single();

                            if (uErr) throw uErr;

                            const { data: newParent, error: pErr } = await supabase
                                .from('parents')
                                .insert([{
                                    user_id: newUser.id,
                                    name: gName,
                                    email: gEmail,
                                    phone: guardianPhone || null,
                                    avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`,
                                    school_id: schoolId,
                                    branch_id: branchId
                                }])
                                .select()
                                .single();

                            if (pErr) throw pErr;
                            parentIdToLink = newParent.id;

                            // Create Auth
                            await createUserAccount(gName, 'Parent', gEmail, newUser.id);
                            await sendVerificationEmail(gName, gEmail, 'School App Account Created');
                            guardianMessage += `\nNew Guardian account created for ${gName}.`;
                        }

                        // 2. Link if we have a Parent ID
                        if (parentIdToLink && studentToEdit?.id) {
                            // ✅ FIX 1: Update student.parent_id FK
                            const { error: linkError } = await supabase
                                .from('students')
                                .update({ parent_id: parentIdToLink })
                                .eq('id', studentToEdit.id);

                            if (linkError) {
                                console.error('Failed to link parent_id to student:', linkError);
                            }

                            // ✅ FIX 2: Check if already linked in junction table
                            const { data: link } = await supabase
                                .from('parent_children')
                                .select('*')
                                .eq('parent_id', parentIdToLink)
                                .eq('student_id', studentToEdit.id)
                                .maybeSingle();

                            if (!link) {
                                const { error: junctionError } = await supabase
                                    .from('parent_children')
                                    .insert({
                                        parent_id: parentIdToLink,
                                        student_id: studentToEdit.id,
                                        school_id: schoolId,
                                        branch_id: branchId
                                    });

                                if (junctionError && junctionError.code !== '23505') {
                                    console.warn('Junction table insert failed:', junctionError);
                                }
                                guardianMessage += `\nLinked to guardian: ${parentNameForMsg}.`;
                            } else {
                                guardianMessage += `\nAlready linked to ${parentNameForMsg}.`;
                            }
                        }

                    } catch (gErr: any) {
                        console.error('Error updating guardian:', gErr);
                        guardianMessage += `\nError updating guardian: ${gErr.message || 'Unknown error'}`;
                    }
                }

                toast.success(`Student updated successfully!${guardianMessage}`);
            } else {
                // CREATE MODE

                // 1. Create Login Credentials (Auth User) FIRST
                // This validates email uniqueness in Supabase Auth immediately.

                if (!schoolId) {
                    toast.error('Fatal: Current admin/user has no School ID. Cannot register student.');
                    setIsLoading(false);
                    return;
                }

                let authResult = await createUserAccount(fullName, 'Student', generatedEmail, schoolId);

                // Handle already registered error with a unique suffix retry
                if (authResult.error && (authResult.error.includes('already registered') || authResult.error.includes('duplicate'))) {
                    console.log(`Email ${generatedEmail} is already registered. Retrying with uniqueness suffix...`);
                    const randomSuffix = Math.floor(100 + Math.random() * 900); // 3-digit random number
                    const [localPart, domain] = generatedEmail.split('@');
                    const uniqueEmail = `${localPart}${randomSuffix}@${domain}`;

                    const retryResult = await createUserAccount(fullName, 'Student', uniqueEmail, schoolId);

                    if (!retryResult.error) {
                        authResult = retryResult; // Success on retry
                        generatedEmail = uniqueEmail; // Update the email for subsequent profile creation
                        toast.success(`Account created with unique identifier: ${uniqueEmail}`);
                    } else {
                        // Retry failed, keep the original error or the new one?
                        // If checking for 'already registered' again, it means the random suffix also collided (rare)
                        // or there is a deeper issue.
                        console.warn('Retry creation failed:', retryResult.error);
                        authResult = retryResult;
                    }
                }

                if (authResult.error) {
                    // Check specifically for "already registered" first (in case retry failed)
                    if (authResult.error.includes('already registered') || authResult.error.includes('duplicate')) {
                        toast.error(`Student with email ${generatedEmail} is already registered. Please try a different name or manually edit the email.`);
                        setIsLoading(false);
                        return;
                    }

                    // Check specifically for email DELIVERY errors or rate limits
                    // Avoid catching "user with this *email* exists"
                    const lowerError = authResult.error.toLowerCase();
                    if ((lowerError.includes('email') && lowerError.includes('sending')) || lowerError.includes('rate limit')) {
                        // warning but proceed? No, if we don't have an ID, we cannot proceed.
                        if (!authResult.userId) {
                            toast.error(`Fatal: Could not create login account (${authResult.error}). Operations aborted.`);
                            setIsLoading(false);
                            return;
                        }
                    } else {
                        // For captive failures etc
                        toast.error('Login account failed: ' + authResult.error + '. Aborting.');
                        setIsLoading(false);
                        return;
                    }
                }

                if (!authResult.userId) {
                    toast.error('Auth created but no ID returned. Aborting.');
                    setIsLoading(false);
                    return;
                }

                // 2. Create User Profile in users table (with conflict handling)
                // The auth trigger already created a record in profiles table,
                // now we ensure the users table is also populated
                const { error: userInsertError } = await supabase
                    .from('users')
                    .insert([{
                        id: authResult.userId,
                        email: generatedEmail,
                        name: fullName,
                        role: 'student',
                        school_id: schoolId,
                        branch_id: branchId, // Add Branch
                        avatar_url: avatarUrl
                    }])
                    .select()
                    .single();

                if (userInsertError) {
                    // If it's a duplicate key error, it means the user already exists (created by trigger)
                    // This is fine, we can continue
                    if (userInsertError.code !== '23505') { // 23505 is duplicate key violation
                        console.error('Error creating user profile:', userInsertError);
                        throw new Error(`Failed to create user profile: ${userInsertError.message}`);
                    } else {
                        console.log('User profile already exists (created by trigger), continuing...');
                    }
                }

                // Reference to the created/existing user
                const userData = { id: authResult.userId };


                // 3. Create Student Profile
                const { error: studentError } = await supabase
                    .from('students')
                    .insert([{
                        user_id: userData.id,
                        school_id: schoolId,
                        branch_id: branchId, // Add Branch
                        name: fullName,
                        email: generatedEmail, // Add email
                        avatar_url: avatarUrl,
                        grade: grade,
                        section: section,
                        department: department || null,
                        birthday: birthday || null,
                        dob: birthday || null, // Also save to dob column
                        admission_number: admissionNumber || null, // ⚠️ Added
                        address: studentAddress || null, // ⚠️ Added
                        gender: gender || null,
                        status: initialStatus,
                        attendance_status: 'Present'
                    }]);
                if (studentError) throw studentError;

                // Fetch the student ID for linking
                const { data: studentData, error: fetchStudentError } = await supabase
                    .from('students')
                    .select('id')
                    .eq('user_id', userData.id)
                    .single();

                if (fetchStudentError) throw fetchStudentError;

                // 4. Log Success
                console.log('Student credentials created successfully.');


                // 5. Send verification email (Student)
                const emailResult = await sendVerificationEmail(fullName, generatedEmail, 'School App');
                if (!emailResult.success) {
                    console.warn('Warning: Email verification notification failed:', emailResult.error);
                }

                // --- GUARDIAN ACCOUNT AUTOMATION ---
                let parentAuthDetails = null;

                if (gEmail && gName && studentData?.id) {
                    try {
                        const GuardianResponse = await api.linkGuardian({
                            studentId: studentData.id,
                            guardianName: gName,
                            guardianEmail: gEmail,
                            guardianPhone: guardianPhone,
                            branchId: branchId
                        });

                        if (GuardianResponse.credentials) {
                            parentAuthDetails = GuardianResponse.credentials;
                            await sendVerificationEmail(gName, gEmail, 'School App Account Created');
                        } else {
                            toast.success(`Linked to existing guardian: ${gName}.`, { duration: 4000 });
                            await sendVerificationEmail(gName, gEmail, 'Student Added');
                        }

                    } catch (gErr) {
                        console.error("Error processing guardian:", gErr);
                        toast.error("Student created, but failed to link Guardian: " + (gErr as any).message);
                    }
                }
                // -----------------------------------

                // Show credentials modal instead of alert
                setCredentials({
                    username: authResult.username,
                    password: authResult.password,
                    email: generatedEmail,
                    secondary: parentAuthDetails || undefined
                });
                setShowCredentialsModal(true);
                setIsLoading(false);
                return; // Wait for modal close
            }

            // Trigger parent component to refresh data from Supabase
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error saving student:', error);
            toast.error('Failed to save student: ' + (error.message || 'Unknown error'));
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="ml-3 text-lg text-gray-600">Loading student data...</div>
            </div>
        );
    }

    // New Block: Prevent form usage if School ID is missing
    if (!schoolId) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 rounded-2xl border border-amber-100 m-4 shadow-sm">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
                </div>
                <div className="text-xl font-bold text-slate-800 mb-2">Tenancy Handshake Missing</div>
                <p className="text-slate-600 mb-6 text-center max-w-xs text-sm">
                    We've detected you're logged in, but your session hasn't been linked to your school profile yet.
                </p>
                <div className="flex flex-col w-full space-y-3">
                    <button
                        onClick={async () => {
                            setIsLoading(true);
                            await refreshProfile();
                            setIsLoading(false);
                        }}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        Sync School Profile
                    </button>
                    <button
                        onClick={handleBack}
                        className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

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
                    {/* Photo Upload */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                                {selectedImage ? (
                                    <img src={selectedImage} alt="Student" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <UserIcon className="w-12 h-12 text-gray-400" />
                                )}
                            </div>
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-sky-500 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-sky-600">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" name="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Student Information Section */}
                        <div className="space-y-4">
                            <div className="p-2 bg-sky-100 rounded-lg">
                                <h3 className="font-bold text-sky-800">Student Information</h3>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon className="w-5 h-5" /></span>
                                        <input type="text" name="fullName" id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder="Adebayo Adewale" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                        <select id="gender" name="gender" value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500">
                                            <option value="">Select Gender...</option>
                                            <option>Male</option>
                                            <option>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                        <input type="date" name="birthday" id="birthday" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder="Date of Birth" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="class" className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                        <select id="class" name="class" value={className} onChange={e => setClassName(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required>
                                            <option value="">Select Class...</option>
                                            {[...Array(12).keys()].map(i => <option key={i + 1} value={`Grade ${i + 1}`}>Grade {i + 1}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="section" className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                                        <select id="section" name="section" value={section} onChange={e => setSection(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" required>
                                            <option value="">Select Section...</option>
                                            <option>A</option>
                                            <option>B</option>
                                            <option>C</option>
                                        </select>
                                    </div>
                                </div>
                                {grade >= 10 && (
                                    <div>
                                        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <select id="department" name="department" value={department} onChange={e => setDepartment(e.target.value as Department | '')} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500">
                                            <option value="">Select Department...</option>
                                            <option value="Science">Science</option>
                                            <option value="Commercial">Commercial</option>
                                            <option value="Arts">Arts</option>
                                        </select>
                                    </div>
                                )}

                                {/* ⚠️ Added orphaned database fields */}
                                <div>
                                    <label htmlFor="admissionNumber" className="block text-sm font-medium text-gray-700 mb-1">Admission Number <span className="text-gray-400 text-xs">(Optional)</span></label>
                                    <input
                                        type="text"
                                        name="admissionNumber"
                                        id="admissionNumber"
                                        value={admissionNumber}
                                        onChange={e => setAdmissionNumber(e.target.value)}
                                        className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                                        placeholder="ADM-2024-001"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="studentAddress" className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-gray-400 text-xs">(Optional)</span></label>
                                    <textarea
                                        name="studentAddress"
                                        id="studentAddress"
                                        value={studentAddress}
                                        onChange={e => setStudentAddress(e.target.value)}
                                        className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                                        placeholder="24 Ademola Street, Ikeja, Lagos"
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Guardian Information Section */}
                        <div className="space-y-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <h3 className="font-bold text-green-800">Guardian Information</h3>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                                <div>
                                    <label htmlFor="guardianName" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Name</label>
                                    <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon className="w-5 h-5" /></span><input type="text" name="guardianName" id="guardianName" value={guardianName} onChange={e => setGuardianName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder="Mr. Adewale" /></div>
                                </div>
                                <div>
                                    <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Phone</label>
                                    <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><PhoneIcon className="w-5 h-5" /></span><input type="tel" name="guardianPhone" id="guardianPhone" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder="+234 801 234 5678" /></div>
                                </div>
                                <div>
                                    <label htmlFor="guardianEmail" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Email</label>
                                    <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><MailIcon className="w-5 h-5" /></span><input type="email" name="guardianEmail" id="guardianEmail" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500" placeholder="guardian@example.com" /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Action Button */}
                <div className="p-4 mt-auto bg-gray-50 pb-32 lg:pb-4 flex gap-3">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-gray-400' : 'bg-sky-500 hover:bg-sky-600'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors`}
                    >
                        {isLoading ? 'Saving...' : (studentToEdit ? 'Update Student' : 'Save Student')}
                    </button>
                </div>
            </form>

            {/* Credentials Modal */}
            {credentials && (
                <CredentialsModal
                    isOpen={showCredentialsModal}
                    userName={fullName}
                    username={credentials.username}
                    password={credentials.password}
                    email={credentials.email}
                    userType="Student"
                    secondaryCredentials={credentials.secondary}
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

export default AddStudentScreen;
