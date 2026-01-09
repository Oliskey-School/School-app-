
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { CameraIcon, UserIcon, MailIcon, PhoneIcon } from '../../constants';
import { Student, Department } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createUserAccount, generateUsername, generatePassword, sendVerificationEmail, checkEmailExists } from '../../lib/auth';
import CredentialsModal from '../ui/CredentialsModal';
import { mockStudents, mockParents } from '../../data';

interface AddStudentScreenProps {
    studentToEdit?: Student;
    forceUpdate: () => void;
    handleBack: () => void;
}

const AddStudentScreen: React.FC<AddStudentScreenProps> = ({ studentToEdit, forceUpdate, handleBack }) => {
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

    const grade = useMemo(() => {
        const match = className.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }, [className]);

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
                if (isSupabaseConfigured) {
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
                        console.error("Error fetching guardian:", err);
                    }
                } else {
                    // Mock Mode Lookup
                    const parent = mockParents.find(p => p.childIds?.includes(studentToEdit.id));
                    if (parent) {
                        setGuardianName(parent.name);
                        setGuardianEmail(parent.email);
                        setGuardianPhone(parent.phone);
                    }
                }
            };
            fetchGuardian();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

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

            // MOCK MODE HANDLING
            if (!isSupabaseConfigured) {
                if (studentToEdit) {
                    // Update existing mock student
                    const index = mockStudents.findIndex(s => s.id === studentToEdit.id);
                    if (index !== -1) {
                        mockStudents[index] = {
                            ...mockStudents[index],
                            name: fullName,
                            grade,
                            section,
                            department: department || undefined,
                            birthday: birthday || undefined,
                            avatarUrl: avatarUrl
                        };
                    }
                    toast.success('Student updated successfully (Mock Mode - Session Only)');
                } else {
                    // Create new mock student
                    const newId = mockStudents.length > 0 ? Math.max(...mockStudents.map(s => s.id)) + 1 : 1;
                    const newStudent = {
                        id: newId,
                        name: fullName,
                        email: generatedEmail,
                        avatarUrl: avatarUrl,
                        grade: grade,
                        section: section,
                        department: department || undefined,
                        attendanceStatus: 'Present' as const,
                        birthday: birthday || undefined,
                        academicPerformance: [], // Empty for now
                        behaviorNotes: []
                    };
                    mockStudents.push(newStudent);

                    let successMessage = `Student account created for ${fullName}.\nCredentials: ${generatedEmail.split('@')[0]} / password123\n\n`;

                    // Handle Guardian in Mock Mode
                    if (gEmail && gName) {
                        const existingParent = mockParents.find(p => p.email === gEmail);
                        if (existingParent) {
                            // Link to existing parent
                            if (!existingParent.childIds) existingParent.childIds = [];
                            if (!existingParent.childIds.includes(newId)) {
                                existingParent.childIds.push(newId);
                            }
                            successMessage += `Linked to existing guardian: ${existingParent.name}.\nNotification sent to ${gEmail}.`;
                        } else {
                            // Create new parent
                            const newParentId = mockParents.length > 0 ? Math.max(...mockParents.map(p => p.id)) + 1 : 1;
                            mockParents.push({
                                id: newParentId,
                                name: gName,
                                email: gEmail,
                                phone: guardianPhone,
                                avatarUrl: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`,
                                childIds: [newId]
                            });
                            successMessage += `New Guardian account created for ${gName}.\nCredentials sent to ${gEmail}.`;
                        }
                    } else {
                        successMessage += "No guardian linked.";
                    }

                    toast.success(successMessage);

                    // Simulate credentials generation for display
                    setCredentials({
                        username: generatedEmail.split('@')[0],
                        password: 'password123',
                        email: generatedEmail
                    });
                    // We show the modal for the Student's credentials
                    setShowCredentialsModal(true);
                    setIsLoading(false);
                    return; // Don't close immediately, wait for modal
                }
                forceUpdate();
                handleBack();
                return;
            }

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
                        avatar_url: avatarUrl
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

                        let parentIdToLink: number | null = null;
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
                                        avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`
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
                                    role: 'Parent',
                                    avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`
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
                                    avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`
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
                        if (parentIdToLink) {
                            // Check if already linked
                            const { data: link } = await supabase
                                .from('parent_children')
                                .select('*')
                                .eq('parent_id', parentIdToLink)
                                .eq('student_id', studentToEdit.id)
                                .maybeSingle();

                            if (!link) {
                                await supabase.from('parent_children').insert({
                                    parent_id: parentIdToLink,
                                    student_id: studentToEdit.id
                                });
                                guardianMessage += `\nLinked to guardian: ${parentNameForMsg}.`;
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

                const authResult = await createUserAccount(fullName, 'Student', generatedEmail);

                if (authResult.error) {
                    // Check specifically for email sending errors or rate limits (common in free tier)
                    if (authResult.error.toLowerCase().includes('email') || authResult.error.toLowerCase().includes('rate limit')) {
                        toast.error(`Login account creation skipped: ${authResult.error}. Proceeding to create profile...`, { duration: 5000 });
                        // Proceed without returning!
                    } else if (authResult.error.includes('already registered') || authResult.error.includes('duplicate')) {
                        toast.error(`Student with email ${generatedEmail} is already registered. Please check the name or email format.`);
                        setIsLoading(false);
                        return;
                    } else {
                        // For other critical auth errors, maybe still proceed? 
                        // Let's safe fail and proceed for now, as profile creation is more important than login for Admin.
                        toast.error('Login account failed: ' + authResult.error + '. Creating profile only.');
                    }
                }

                // 2. Create User account (Legacy Table)

                const { data: newUserData, error: userError } = await supabase
                    .from('users')
                    .insert([{
                        email: generatedEmail,
                        name: fullName,
                        role: 'Student',
                        avatar_url: avatarUrl
                    }])
                    .select()
                    .single();

                if (userError) {
                    // Potentially rollback Auth user here in a real production app
                    throw userError;
                }

                const userData = newUserData;

                // 3. Create Student Profile
                const { error: studentError } = await supabase
                    .from('students')
                    .insert([{
                        user_id: userData.id,
                        name: fullName,
                        avatar_url: avatarUrl,
                        grade: grade,
                        section: section,
                        department: department || null,
                        birthday: birthday || null,
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

                // 4. (Auth was already created at start)
                // We just log it now.
                console.log('Student credentials created successfully.');


                // 5. Send verification email (Student)
                const emailResult = await sendVerificationEmail(fullName, generatedEmail, 'School App');
                if (!emailResult.success) {
                    console.warn('Warning: Email verification notification failed:', emailResult.error);
                }

                // --- GUARDIAN ACCOUNT AUTOMATION ---
                let parentAuthDetails = null;

                if (gEmail && gName) {
                    try {
                        const { data: existingUser } = await supabase
                            .from('users')
                            .select('id, name, email')
                            .eq('email', gEmail)
                            .maybeSingle();

                        let parentIdToLink: number | null = null;

                        if (existingUser) {
                            // User exists, find/create Parent
                            const { data: existingParent } = await supabase
                                .from('parents')
                                .select('id')
                                .eq('user_id', existingUser.id)
                                .maybeSingle();

                            if (existingParent) {
                                parentIdToLink = existingParent.id;
                            } else {
                                // Create Parent Profile for existing User
                                const { data: newProfile, error: profileErr } = await supabase
                                    .from('parents')
                                    .insert([{
                                        user_id: existingUser.id,
                                        name: gName,
                                        email: gEmail,
                                        phone: guardianPhone || null,
                                        avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`
                                    }])
                                    .select()
                                    .single();

                                if (!profileErr) parentIdToLink = newProfile.id;
                            }
                        } else {
                            // Create New User & Parent
                            const { data: newUser, error: uErr } = await supabase
                                .from('users')
                                .insert([{
                                    email: gEmail,
                                    name: gName,
                                    role: 'Parent',
                                    avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`
                                }])
                                .select()
                                .single();

                            if (!uErr) {
                                const { data: newParent, error: pErr } = await supabase
                                    .from('parents')
                                    .insert([{
                                        user_id: newUser.id,
                                        name: gName,
                                        email: gEmail,
                                        phone: guardianPhone || null,
                                        avatar_url: `https://i.pravatar.cc/150?u=${gName.replace(' ', '')}`
                                    }])
                                    .select()
                                    .single();

                                if (!pErr) {
                                    parentIdToLink = newParent.id;
                                    // Create Auth & Send Email
                                    const pAuth = await createUserAccount(gName, 'Parent', gEmail, newUser.id);
                                    await sendVerificationEmail(gName, gEmail, 'School App Account Created');

                                    // Capture for Modal
                                    parentAuthDetails = {
                                        userName: gName,
                                        username: pAuth.username,
                                        password: pAuth.password,
                                        email: gEmail,
                                        userType: 'Parent'
                                    };
                                }
                            }
                        }

                        if (parentIdToLink) {
                            await supabase.from('parent_children').insert({
                                parent_id: parentIdToLink,
                                student_id: studentData.id
                            });
                            if (existingUser) {
                                toast.success(`Linked to existing guardian: ${gName}.`, { duration: 4000 });
                                await sendVerificationEmail(gName, gEmail, 'Student Added');
                            }
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

    return (
        <div className="flex flex-col h-full bg-gray-50">
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
                <div className="p-4 mt-auto bg-gray-50 pb-32 lg:pb-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-gray-400' : 'bg-sky-500 hover:bg-sky-600'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors`}
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
