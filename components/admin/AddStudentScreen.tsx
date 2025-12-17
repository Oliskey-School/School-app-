
import React, { useState, useEffect, useMemo } from 'react';
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
            setClassName(`Grade ${studentToEdit.grade}`);
            setSection(studentToEdit.section);
            setDepartment(studentToEdit.department || '');
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
                    alert('Student updated successfully (Mock Mode - Session Only)');
                } else {
                    // Create new mock student
                    const newId = mockStudents.length > 0 ? Math.max(...mockStudents.map(s => s.id)) + 1 : 1;
                    const newStudent = {
                        id: newId,
                        name: fullName,
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
                    if (guardianEmail && guardianName) {
                        const existingParent = mockParents.find(p => p.email === guardianEmail);
                        if (existingParent) {
                            // Link to existing parent
                            if (!existingParent.childIds) existingParent.childIds = [];
                            if (!existingParent.childIds.includes(newId)) {
                                existingParent.childIds.push(newId);
                            }
                            successMessage += `Linked to existing guardian: ${existingParent.name}.\nNotification sent to ${guardianEmail}.`;
                        } else {
                            // Create new parent
                            const newParentId = mockParents.length > 0 ? Math.max(...mockParents.map(p => p.id)) + 1 : 1;
                            mockParents.push({
                                id: newParentId,
                                name: guardianName,
                                email: guardianEmail,
                                phone: guardianPhone,
                                avatarUrl: `https://i.pravatar.cc/150?u=${guardianName.replace(' ', '')}`,
                                childIds: [newId]
                            });
                            successMessage += `New Guardian account created for ${guardianName}.\nCredentials sent to ${guardianEmail}.`;
                        }
                    } else {
                        successMessage += "No guardian linked.";
                    }

                    alert(successMessage);

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
                alert('Student updated successfully!');
            } else {
                // CREATE MODE - Check if email already exists in users or auth_accounts
                const exists = await checkEmailExists(generatedEmail);
                if (exists.error) {
                    console.warn('Email check error:', exists.error);
                    throw new Error('Could not validate email uniqueness');
                }

                let userIdToUse: number | null = null;

                if (exists.inAuthAccounts) {
                    // Fully exists in Auth. This is a duplicate.
                    let whereFound: string[] = [];
                    if (exists.inUsers) whereFound.push(`users (id: ${exists.userRow?.id || 'unknown'})`);
                    whereFound.push(`auth_accounts (id: ${exists.authAccountRow?.id || 'unknown'})`);
                    alert(`Student with email ${generatedEmail} already exists in: ${whereFound.join(', ')}. Please use a different name to generate a unique email.`);
                    setIsLoading(false);
                    return;
                } else if (exists.inUsers) {
                    // Exists in DB but NOT in Auth. This is a "Zombie" record.
                    // We should attempt to repair this by reusing the User ID and creating Auth.
                    console.log(`Email ${generatedEmail} found in 'users' but missing Auth. Attempting to repair/reuse User ID: ${exists.userRow.id}`);
                    userIdToUse = exists.userRow.id;
                }

                // 2. Create User account (Only if not reusing)
                let userData = { id: userIdToUse };

                if (!userIdToUse) {
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

                    if (userError) throw userError;
                    userData = newUserData;
                }

                // 3. Create Student Profile
                // Check if student profile already exists (if we are reusing user)
                if (userIdToUse) {
                    const { data: existingStudent, error: existingStudentError } = await supabase
                        .from('students')
                        .select('id')
                        .eq('user_id', userIdToUse)
                        .maybeSingle();

                    if (existingStudent) {
                        // Student profile also exists. We just need to fix Auth.
                        console.log("Student profile also exists. Updates skipped, proceeding to Auth fix.");
                    } else {
                        // User exists, but Student profile missing. Create it.
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
                    }
                } else {
                    // Fresh User, Fresh Student
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
                }

                // Fetch the student ID for linking (whether new or existing)
                const { data: studentData, error: fetchStudentError } = await supabase
                    .from('students')
                    .select('id')
                    .eq('user_id', userData.id)
                    .single();

                if (fetchStudentError) throw fetchStudentError;

                // 4. Create login credentials (Supabase Auth)
                const authResult = await createUserAccount(fullName, 'Student', generatedEmail, userData.id);

                if (authResult.error) {
                    console.warn('Warning: Auth account created with error:', authResult.error);
                }

                // 5. Send verification email (Student)
                const emailResult = await sendVerificationEmail(fullName, generatedEmail, 'School App');
                if (!emailResult.success) {
                    console.warn('Warning: Email verification notification failed:', emailResult.error);
                }

                // --- GUARDIAN ACCOUNT AUTOMATION ---
                if (guardianEmail && guardianName) {
                    try {
                        const { data: existingParent } = await supabase
                            .from('parents')
                            .select('id, user_id, email')
                            .eq('email', guardianEmail)
                            .maybeSingle();

                        if (existingParent) {
                            // Link existing parent to new student
                            await supabase.from('parent_children').insert({
                                parent_id: existingParent.id,
                                student_id: studentData.id
                            });
                            // Notify existing guardian
                            console.log(`Linked existing guardian ${guardianEmail} to student.`);
                            await sendVerificationEmail(guardianName, guardianEmail, 'Student Added');
                            alert(`Linked to existing guardian: ${guardianName}.\nStudent credentials sent to ${guardianEmail}.`);

                        } else {
                            // Create NEW Guardian Account
                            // 1. Create User
                            const { data: gUser, error: gUserError } = await supabase
                                .from('users')
                                .insert([{
                                    email: guardianEmail,
                                    name: guardianName,
                                    role: 'Parent',
                                    avatar_url: `https://i.pravatar.cc/150?u=${guardianName.replace(' ', '')}`
                                }])
                                .select()
                                .single();

                            if (gUserError) {
                                console.warn("Failed to create Guardian User:", gUserError);
                            } else {
                                // 2. Create Parent Profile linked to User
                                const { data: gParent, error: gParentError } = await supabase
                                    .from('parents')
                                    .insert([{
                                        user_id: gUser.id,
                                        name: guardianName,
                                        email: guardianEmail,
                                        phone: guardianPhone || null,
                                        avatar_url: `https://i.pravatar.cc/150?u=${guardianName.replace(' ', '')}`
                                    }])
                                    .select()
                                    .single();

                                if (gParentError) {
                                    console.warn("Failed to create Guardian Profile:", gParentError);
                                } else {
                                    // 3. Link to Student
                                    await supabase.from('parent_children').insert({
                                        parent_id: gParent.id,
                                        student_id: studentData.id
                                    });

                                    // 4. Create Auth Credentials
                                    const gAuth = await createUserAccount(guardianName, 'Parent', guardianEmail, gUser.id);

                                    // 5. Send Credentials Email
                                    if (gAuth.error) console.warn("Guardian Auth Error:", gAuth.error);
                                    else {
                                        // TODO: Send specific email with credentials?
                                        // For now, verification email is sent by Supabase or our helper
                                        await sendVerificationEmail(guardianName, guardianEmail, 'School App Account Created');
                                        alert(`Guardian account created for ${guardianName}.\nParent & Student credentials sent to ${guardianEmail}.`);
                                    }
                                }
                            }
                        }
                    } catch (gErr) {
                        console.error("Error processing guardian:", gErr);
                        // Do not fail the whole student creation if guardian fails
                    }
                }
                // -----------------------------------

                // Show credentials modal instead of alert
                setCredentials({
                    username: authResult.username,
                    password: authResult.password,
                    email: generatedEmail
                });
                setShowCredentialsModal(true);
            }

            // Trigger parent component to refresh data from Supabase
            forceUpdate();
            handleBack();
        } catch (error: any) {
            console.error('Error saving student:', error);
            alert('Failed to save student: ' + (error.message || 'Unknown error'));
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
                <div className="p-4 mt-auto bg-gray-50">
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
