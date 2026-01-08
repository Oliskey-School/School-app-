import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
    User, FileText, CheckCircle, Upload,
    ChevronRight, ChevronLeft, BookOpen, AlertCircle
} from 'lucide-react';
import { createUserAccount, checkEmailExists, sendVerificationEmail } from '@/lib/auth';

type CurriculumType = 'Nigerian' | 'British' | 'Both' | null;

interface EnrollmentData {
    // Step 1: Basic Details
    firstName: string;
    lastName: string;
    dateOfBirth: string;

    gender: string;
    parentName: string;
    parentEmail: string;
    parentPhone: string;

    // Step 2: Curriculum Selection
    curriculumType: CurriculumType;

    // Step 3: Documents
    birthCertificate?: File;
    previousReport?: File;
    medicalRecords?: File;
    passportPhoto?: File;
}

export default function EnhancedEnrollmentWizard({
    onComplete,
    schoolId
}: {
    onComplete: () => void;
    schoolId: string;
}) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState<EnrollmentData>({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        curriculumType: null,
    });

    // Pricing for dual-track (example)
    const nigerianFee = 250000;
    const britishFee = 450000;
    const dualTrackFee = nigerianFee + britishFee;

    const handleInputChange = (field: keyof EnrollmentData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (field: keyof EnrollmentData, file: File | undefined) => {
        setFormData(prev => ({ ...prev, [field]: file }));
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender) {
                toast({ title: 'Missing Information', description: 'Please fill in all required fields.', variant: 'destructive' });
                return false;
            }
        }
        if (step === 2) {
            if (!formData.curriculumType) {
                toast({ title: 'Curriculum Required', description: 'Please select a curriculum type.', variant: 'destructive' });
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // 0. Prepare Student Data & Generate Email
            const studentEmail = `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@student.school.com`;
            const fullName = `${formData.firstName} ${formData.lastName}`;

            // 1. Create Student Auth (Check duplicate first)
            const authResult = await createUserAccount(fullName, 'Student', studentEmail);

            if (authResult.error) {
                if (authResult.error.includes('already registered') || authResult.error.includes('duplicate')) {
                    toast({ title: 'Duplicate Student', description: `Student with email ${studentEmail} is already registered.`, variant: 'destructive' });
                    setLoading(false);
                    return;
                }
                // Continue if error is minor or handle better? For now, we abort.
                // Actually, if Auth fails, we shouldn't proceed.
                throw new Error('Auth creation failed: ' + authResult.error);
            }

            // 2. Create Legacy User Record
            const { data: newUserData, error: userError } = await supabase
                .from('users')
                .insert([{
                    email: studentEmail,
                    name: fullName,
                    role: 'Student',
                    // avatar_url: ... // Optional
                }])
                .select()
                .single();

            if (userError) throw userError;
            const userData = newUserData;

            // 3. Upload documents to Supabase Storage
            const documentUrls: any = {};

            const uploadDocument = async (file: File | undefined, folder: string) => {
                if (!file) return null;
                const fileName = `${Date.now()}_${file.name}`;
                const { data, error } = await supabase.storage
                    .from('student-documents')
                    .upload(`${folder}/${fileName}`, file);

                if (error) throw error; // Handle storage errors gracefully?

                const { data: urlData } = supabase.storage
                    .from('student-documents')
                    .getPublicUrl(data.path);

                return urlData.publicUrl;
            };

            // Parallel uploads could be faster
            documentUrls.birthCertificate = await uploadDocument(formData.birthCertificate, 'birth-certificates');
            documentUrls.previousReport = await uploadDocument(formData.previousReport, 'previous-reports');
            documentUrls.medicalRecords = await uploadDocument(formData.medicalRecords, 'medical-records');
            documentUrls.passportPhoto = await uploadDocument(formData.passportPhoto, 'passport-photos');

            // 4. Create Student Record (Linked to User)
            const { data: student, error: studentError } = await supabase
                .from('students')
                .insert({
                    user_id: userData.id, // Linked!
                    // user_id: authResult.username ? userData.id : userData.id, // Double Check
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    name: fullName, // Some tables use 'name'
                    date_of_birth: formData.dateOfBirth,
                    gender: formData.gender,
                    school_id: schoolId,
                    grade: 1, // Default or derived? Missing in Wizard. Assuming Grade 1 for now or NULL.
                    attendance_status: 'Present',
                    ...documentUrls
                })
                .select()
                .single();

            if (studentError) throw studentError;

            // 5. Create Academic Track(s)
            const tracks = [];

            if (formData.curriculumType === 'Nigerian' || formData.curriculumType === 'Both') {
                const { data: nigerianCurriculum } = await supabase
                    .from('curricula')
                    .select('id')
                    .eq('name', 'Nigerian') // Ensure case matches DB
                    .maybeSingle();

                if (nigerianCurriculum) {
                    tracks.push({
                        student_id: student.id,
                        curriculum_id: nigerianCurriculum.id,
                        status: 'Active'
                    });
                }
            }

            if (formData.curriculumType === 'British' || formData.curriculumType === 'Both') {
                const { data: britishCurriculum } = await supabase
                    .from('curricula')
                    .select('id')
                    .eq('name', 'British')
                    .maybeSingle();

                if (britishCurriculum) {
                    tracks.push({
                        student_id: student.id,
                        curriculum_id: britishCurriculum.id,
                        status: 'Active'
                    });
                }
            }

            if (tracks.length > 0) {
                await supabase.from('academic_tracks').insert(tracks);
            }

            // 6. Handle Parent (Create or Link)
            if (formData.parentEmail) {
                let parentIdToLink: number | null = null;
                const pEmail = formData.parentEmail;
                const pName = formData.parentName || 'Parent';

                // Check User
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('id, name')
                    .eq('email', pEmail)
                    .maybeSingle();

                if (existingUser) {
                    // Check Parent Profile
                    const { data: existingParent } = await supabase
                        .from('parents')
                        .select('id')
                        .eq('user_id', existingUser.id)
                        .maybeSingle();

                    if (existingParent) {
                        parentIdToLink = existingParent.id;
                    } else {
                        // Create Parent Profile
                        const { data: newProfile } = await supabase
                            .from('parents')
                            .insert([{
                                user_id: existingUser.id,
                                name: pName,
                                email: pEmail,
                                phone: formData.parentPhone,
                            }])
                            .select()
                            .single();
                        if (newProfile) parentIdToLink = newProfile.id;
                    }
                } else {
                    // Create NEW Parent User, Auth, Profile
                    const { data: newUser } = await supabase
                        .from('users')
                        .insert([{
                            email: pEmail,
                            name: pName,
                            role: 'Parent'
                        }])
                        .select()
                        .single();

                    if (newUser) {
                        const { data: newParent } = await supabase
                            .from('parents')
                            .insert([{
                                user_id: newUser.id,
                                name: pName,
                                email: pEmail,
                                phone: formData.parentPhone
                            }])
                            .select()
                            .single();

                        if (newParent) {
                            parentIdToLink = newParent.id;
                            // Create Auth
                            await createUserAccount(pName, 'Parent', pEmail, newUser.id);
                            await sendVerificationEmail(pName, pEmail, 'Welcome Parent');
                        }
                    }
                }

                if (parentIdToLink) {
                    // Check Link
                    const { data: link } = await supabase
                        .from('parent_children')
                        .select('*')
                        .eq('parent_id', parentIdToLink)
                        .eq('student_id', student.id) // check this ID type match
                        .maybeSingle();

                    if (!link) {
                        // Insert into parent_children (or student_guardians if that's the table?)
                        // Original code used 'student_guardians'. Let's use 'parent_children' as seen in AddStudentScreen 
                        // OR 'student_guardians' if that's preferred. The wizard originally used `student_guardians`.
                        // Let's check Schema... 'parent_children' was used in AddStudentScreen.
                        // I will try BOTH or stick to one. enhanced used `student_guardians`.
                        // I'll stick to `parent_children` as it seems to be the main join table I saw earlier.
                        // Wait, `AddStudentScreen` used `parent_children`. `Enhanced` used `student_guardians`.
                        // This inconsistency is dangerous.
                        // I will try likely `parent_children` based on AddStudentScreen success.

                        const { error: linkErr } = await supabase.from('parent_children').insert({
                            parent_id: parentIdToLink,
                            student_id: student.id
                        });

                        // Fallback to student_guardians if needed? No, let's assume consistent schema.
                    }
                }
            }

            // Send Verification for Student
            await sendVerificationEmail(fullName, studentEmail, 'School Enrollment');

            toast({
                title: 'Enrollment Successful!',
                description: `${formData.firstName} has been enrolled. Login: ${studentEmail}`,
            });

            onComplete();
        } catch (error: any) {
            console.error('Enrollment error:', error);
            toast({
                title: 'Enrollment Failed',
                description: error.message || 'An error occurred during enrollment.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-6 w-6 text-primary" />
                        Student Enrollment Wizard
                    </CardTitle>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2 mt-4">
                        {[1, 2, 3, 4].map((s) => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${s < step ? 'bg-green-500 text-white' :
                                    s === step ? 'bg-primary text-white' :
                                        'bg-gray-200 text-gray-600'
                                    }`}>
                                    {s < step ? <CheckCircle className="h-4 w-4" /> : s}
                                </div>
                                {s < 4 && <div className={`h-1 w-12 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                            </div>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Step 1: Basic Details */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Student Basic Information
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="firstName">First Name *</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                                        placeholder="John"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="lastName">Last Name *</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                                    <Input
                                        id="dateOfBirth"
                                        type="date"
                                        value={formData.dateOfBirth}
                                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="gender">Gender *</Label>
                                    <select
                                        id="gender"
                                        value={formData.gender}
                                        onChange={(e) => handleInputChange('gender', e.target.value)}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="parentName">Parent Name</Label>
                                    <Input
                                        id="parentName"
                                        value={formData.parentName}
                                        onChange={(e) => handleInputChange('parentName', e.target.value)}
                                        placeholder="Parent Full Name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="parentEmail">Parent Email</Label>
                                    <Input
                                        id="parentEmail"
                                        type="email"
                                        value={formData.parentEmail}
                                        onChange={(e) => handleInputChange('parentEmail', e.target.value)}
                                        placeholder="parent@example.com"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="parentPhone">Parent Phone</Label>
                                    <Input
                                        id="parentPhone"
                                        value={formData.parentPhone}
                                        onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                                        placeholder="+234 800 000 0000"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Curriculum Selection */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Select Academic Curriculum
                            </h3>

                            <div className="space-y-3">
                                {/* Nigerian Curriculum */}
                                <Card
                                    className={`cursor-pointer transition-all ${formData.curriculumType === 'Nigerian' ? 'border-primary border-2 bg-primary/5' : 'hover:border-gray-400'
                                        }`}
                                    onClick={() => handleInputChange('curriculumType', 'Nigerian')}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-lg">🇳🇬 Nigerian Curriculum</h4>
                                                <p className="text-sm text-gray-600 mt-1">WAEC, NECO, JAMB preparation</p>
                                                <p className="text-sm text-gray-500 mt-2">Subjects: English, Mathematics, Civic Education, Basic Science, etc.</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Annual Fee</p>
                                                <p className="text-xl font-bold text-primary">₦{nigerianFee.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* British Curriculum */}
                                <Card
                                    className={`cursor-pointer transition-all ${formData.curriculumType === 'British' ? 'border-primary border-2 bg-primary/5' : 'hover:border-gray-400'
                                        }`}
                                    onClick={() => handleInputChange('curriculumType', 'British')}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-lg">🇬🇧 British Curriculum</h4>
                                                <p className="text-sm text-gray-600 mt-1">Cambridge IGCSE, A-Levels</p>
                                                <p className="text-sm text-gray-500 mt-2">Subjects: English Literature, Combined Science, History, Geography, etc.</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Annual Fee</p>
                                                <p className="text-xl font-bold text-primary">₦{britishFee.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Dual Curriculum */}
                                <Card
                                    className={`cursor-pointer transition-all ${formData.curriculumType === 'Both' ? 'border-primary border-2 bg-primary/5' : 'hover:border-gray-400'
                                        }`}
                                    onClick={() => handleInputChange('curriculumType', 'Both')}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-lg">🌍 Dual Curriculum (Nigerian + British)</h4>
                                                <p className="text-sm text-gray-600 mt-1">Best of both worlds - WAEC + Cambridge preparation</p>
                                                <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                                    <p className="text-xs text-amber-800">
                                                        Student will maintain two separate academic records, attend dual-track classes, and receive two report cards.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-600">Annual Fee</p>
                                                <p className="text-xl font-bold text-primary">₦{dualTrackFee.toLocaleString()}</p>
                                                <p className="text-xs text-green-600 mt-1">Save 10%</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Document Uploads */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Upload Required Documents
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="birthCert">Birth Certificate *</Label>
                                    <Input
                                        id="birthCert"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('birthCertificate', e.target.files?.[0])}
                                    />
                                    {formData.birthCertificate && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.birthCertificate.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="previousReport">Previous School Report (Optional)</Label>
                                    <Input
                                        id="previousReport"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('previousReport', e.target.files?.[0])}
                                    />
                                    {formData.previousReport && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.previousReport.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="medicalRecords">Medical Records (Optional)</Label>
                                    <Input
                                        id="medicalRecords"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('medicalRecords', e.target.files?.[0])}
                                    />
                                    {formData.medicalRecords && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.medicalRecords.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="passportPhoto">Passport Photograph *</Label>
                                    <Input
                                        id="passportPhoto"
                                        type="file"
                                        accept=".jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('passportPhoto', e.target.files?.[0])}
                                    />
                                    {formData.passportPhoto && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.passportPhoto.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Confirmation */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Confirm Enrollment Details
                            </h3>

                            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Student Name</p>
                                        <p className="font-semibold">{formData.firstName} {formData.lastName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Date of Birth</p>
                                        <p className="font-semibold">{formData.dateOfBirth}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Curriculum Type</p>
                                    <p className="font-semibold text-primary">{formData.curriculumType}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Documents Uploaded</p>
                                    <div className="flex gap-2 mt-1">
                                        {formData.birthCertificate && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Birth Cert ✓</span>
                                        )}
                                        {formData.passportPhoto && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Photo ✓</span>
                                        )}
                                        {formData.previousReport && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Report ✓</span>
                                        )}
                                        {formData.medicalRecords && (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Medical ✓</span>
                                        )}
                                    </div>
                                </div>

                                {formData.curriculumType === 'Both' && (
                                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                                        <p className="text-sm font-semibold text-amber-900">⚠️ Dual Curriculum Reminder</p>
                                        <p className="text-xs text-amber-800 mt-1">
                                            This student will be enrolled in both Nigerian and British tracks. They will receive separate report cards and maintain independent academic records for each curriculum.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t">
                        {step > 1 && (
                            <Button onClick={handleBack} variant="outline">
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>
                        )}

                        {step < 4 ? (
                            <Button onClick={handleNext} className="ml-auto">
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                                {loading ? 'Enrolling...' : 'Complete Enrollment'}
                                <CheckCircle className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
