
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Phone as PhoneIcon, Mail as MailIcon, Camera as CameraIcon, X as XMarkIcon, AlertTriangle as ExclamationTriangleIcon } from 'lucide-react';
import { Student, Department } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { api } from '../../lib/api';
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
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
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
        if (selectedClassIds.length === 0) return 0;
        const primaryClass = availableClasses.find(c => c.id === selectedClassIds[0]);
        return primaryClass?.grade || 0;
    }, [selectedClassIds, availableClasses]);
    useEffect(() => {
        if (!schoolId) {
            console.log("School ID missing in profile/auth, refreshing...");
            refreshProfile();
        }
    }, [refreshProfile, schoolId]);

    useEffect(() => {
        const loadClasses = async () => {
            const classes = await api.fetchClasses(schoolId);
            setAvailableClasses(classes);
        };
        if (schoolId) loadClasses();
    }, [schoolId]);

    useEffect(() => {
        if (studentToEdit) {
            setSelectedImage(studentToEdit.avatarUrl);
            setFullName(studentToEdit.name);
            setBirthday(studentToEdit.birthday || '');
            setDepartment(studentToEdit.department || '');

            // Fetch Enrollments
            const loadEnrollments = async () => {
                const enrollments = await api.fetchStudentEnrollments(studentToEdit.id);
                setSelectedClassIds(enrollments.map(e => e.class_id));
            };
            loadEnrollments();

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

        if (!studentToEdit && isLimitReached) {
            setShowUpgradeModal(true);
            setIsLoading(false);
            return;
        }

        try {
            const avatarUrl = selectedImage || `https://i.pravatar.cc/150?u=${fullName.replace(' ', '')}`;
            const [firstName, ...lastNameParts] = fullName.split(' ');
            const lastName = lastNameParts.join(' ') || '.';

            const studentData = {
                firstName,
                lastName,
                email: !studentToEdit ? `${fullName.toLowerCase().replace(/\s+/g, '.')}@student.school.com` : undefined,
                gender,
                dateOfBirth: birthday,
                class_id: selectedClassIds[0],
                selectedClassIds,
                department,
                school_id: schoolId,
                branch_id: currentBranchId || profile.branchId || null,
                admissionNumber,
                address: studentAddress,
                parentName: guardianName,
                parentEmail: guardianEmail,
                parentPhone: guardianPhone,
                documentUrls: { passportPhoto: avatarUrl }
            };

            if (studentToEdit) {
                // UPDATE
                await api.updateStudent(studentToEdit.id, {
                    name: fullName,
                    first_name: firstName,
                    last_name: lastName,
                    department: department || null,
                    birthday: birthday || null,
                    avatar_url: avatarUrl,
                    admission_number: admissionNumber || null,
                    address: studentAddress || null,
                    gender: gender || null,
                } as any);

                // Sync Enrollments (Keep this for now if updateStudent doesn't handle them)
                await api.linkStudentToClasses(studentToEdit.id, selectedClassIds, schoolId, studentData.branch_id);

                // Guardian Update
                if (guardianEmail && guardianName) {
                    await api.linkGuardian({
                        studentId: studentToEdit.id,
                        guardianName: guardianName,
                        guardianEmail: guardianEmail,
                        guardianPhone: guardianPhone,
                        branchId: studentData.branch_id
                    });
                }

                toast.success('Student updated successfully!');
            } else {
                // CREATE via Backend
                const result = await api.enrollStudent(studentData, { useBackend: true });

                setCredentials({
                    username: result.username,
                    password: result.password,
                    email: result.email,
                    // If backend returned nested result, map it here
                });
                setShowCredentialsModal(true);
                setIsLoading(false);
                return;
            }

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
                            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full border-2 border-white cursor-pointer hover:bg-blue-700">
                                <CameraIcon className="text-white h-4 w-4" />
                                <input id="photo-upload" name="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Student Information Section */}
                        <div className="space-y-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <h3 className="font-bold text-blue-800">Student Information</h3>
                            </div>
                            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon className="w-5 h-5" /></span>
                                        <input type="text" name="fullName" id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="Adebayo Adewale" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                        <select id="gender" name="gender" value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                                            <option value="">Select Gender...</option>
                                            <option>Male</option>
                                            <option>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                                        <input type="date" name="birthday" id="birthday" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="Date of Birth" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Class Enrollments</label>
                                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                                        {availableClasses.length > 0 ? (
                                            availableClasses.map((cls) => (
                                                <label key={cls.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-gray-200">
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedClassIds.includes(cls.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedClassIds([...selectedClassIds, cls.id]);
                                                            } else {
                                                                setSelectedClassIds(selectedClassIds.filter(id => id !== cls.id));
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {cls.name} {cls.section ? `(${cls.section})` : ''}
                                                    </span>
                                                </label>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-500 italic py-2 text-center">No classes configured for this school.</p>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400">The first selected class will be treated as the Primary Class.</p>
                                </div>
                                {grade >= 10 && (
                                    <div>
                                        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                        <select id="department" name="department" value={department} onChange={e => setDepartment(e.target.value as Department | '')} className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
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
                                        className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                                        className="w-full px-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                                    <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><UserIcon className="w-5 h-5" /></span><input type="text" name="guardianName" id="guardianName" value={guardianName} onChange={e => setGuardianName(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="Mr. Adewale" /></div>
                                </div>
                                <div>
                                    <label htmlFor="guardianPhone" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Phone</label>
                                    <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><PhoneIcon className="w-5 h-5" /></span><input type="tel" name="guardianPhone" id="guardianPhone" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="+234 801 234 5678" /></div>
                                </div>
                                <div>
                                    <label htmlFor="guardianEmail" className="block text-sm font-medium text-gray-700 mb-1">Guardian's Email</label>
                                    <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><MailIcon className="w-5 h-5" /></span><input type="email" name="guardianEmail" id="guardianEmail" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} className="w-full pl-10 pr-3 py-3 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="guardian@example.com" /></div>
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
                        className={`flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
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
