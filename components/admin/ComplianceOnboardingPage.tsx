import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import {
    FileText, CheckCircle, Upload,
    ChevronRight, ChevronLeft, Building2, AlertCircle,
    Shield, Calendar, Flame
} from 'lucide-react';

interface DocumentData {
    // Legal Documents
    cacDocument?: File;
    cacExpiryDate: string;
    ministryApproval?: File;
    ministryExpiryDate: string;

    // Safety Certificates
    fireSafetyCert?: File;
    fireSafetyExpiry: string;
    healthCert?: File;
    healthExpiry: string;

    // Insurance & Building
    insuranceDoc?: File;
    insuranceExpiry: string;
    buildingApproval?: File;
    buildingExpiry: string;

    // Curriculum Declaration
    curriculumType: 'Nigerian' | 'British' | 'Both' | '';
}

// Map frontend keys to DB document types
const DOC_TYPE_MAP: Record<string, string> = {
    cacExpiryDate: 'CAC',
    ministryExpiryDate: 'MinistryApproval',
    fireSafetyExpiry: 'FireSafety',
    healthExpiry: 'Health',
    insuranceExpiry: 'Insurance',
    buildingExpiry: 'BuildingPlan',
};

export default function ComplianceOnboardingPage({
    onComplete,
    schoolId
}: {
    onComplete: () => void;
    schoolId: string;
}) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState<DocumentData>({
        cacExpiryDate: '',
        ministryExpiryDate: '',
        fireSafetyExpiry: '',
        healthExpiry: '',
        insuranceExpiry: '',
        buildingExpiry: '',
        curriculumType: '',
    });

    // Auto-save logic
    const autoSaveField = async (field: string, value: any) => {
        if (!schoolId) return;

        try {
            if (field === 'curriculumType') {
                await api.put(`/schools/${schoolId}`, { curriculum_type: value });
                console.log('✅ Curriculum auto-saved');
            } else if (DOC_TYPE_MAP[field]) {
                const docType = DOC_TYPE_MAP[field];
                await api.post('/infrastructure/documents', {
                    document_type: docType,
                    expiry_date: value,
                    verification_status: 'Pending'
                });
                console.log(`✅ ${docType} expiry auto-saved`);
            }
        } catch (err) {
            console.error('Auto-save error:', err);
        }
    };

    const fetchExistingDocs = async () => {
        if (!schoolId) return;
        setFetching(true);
        try {
            // Fetch Documents
            const docResult = await api.get('/infrastructure/documents') as any;
            const docs = docResult.data || [];

            // Fetch School for curriculum
            let school: any = null;
            try {
                school = await api.get(`/schools/${schoolId}`);
            } catch (e) {
                console.log('School fetch failed:', e);
            }

            if (docs.length > 0 || school) {
                setFormData(prev => {
                    const next = { ...prev };
                    if (school?.curriculum_type) {
                        next.curriculumType = school.curriculum_type as any;
                    }

                    docs?.forEach((doc: any) => {
                        switch (doc.document_type || doc.type) {
                            case 'CAC':
                                next.cacExpiryDate = doc.expiry_date || '';
                                break;
                            case 'MinistryApproval':
                                next.ministryExpiryDate = doc.expiry_date || '';
                                break;
                            case 'FireSafety':
                                next.fireSafetyExpiry = doc.expiry_date || '';
                                break;
                            case 'Health':
                                next.healthExpiry = doc.expiry_date || '';
                                break;
                            case 'Insurance':
                                next.insuranceExpiry = doc.expiry_date || '';
                                break;
                            case 'BuildingPlan':
                                next.buildingExpiry = doc.expiry_date || '';
                                break;
                        }
                    });
                    return next;
                });
            }
        } catch (err) {
            console.error("Error fetching existing compliance data:", err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchExistingDocs();
    }, [schoolId]);

    useAutoSync(['school_documents', 'schools'], () => {
        console.log('🔄 [ComplianceOnboarding] Real-time auto-sync triggered');
        fetchExistingDocs();
    });

    const handleInputChange = (field: keyof DocumentData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Trigger auto-save to backend
        autoSaveField(field as string, value);
    };

    const handleFileChange = async (field: keyof DocumentData, file: File | undefined) => {
        setFormData(prev => ({ ...prev, [field]: file }));

        // Auto-upload file if selected
        if (file && schoolId) {
            try {
                const folder = field.includes('Document') || field.includes('Approval') ? 'legal' :
                    field.includes('Cert') ? 'safety' :
                        field.includes('insurance') ? 'insurance' : 'building';

                const response = await api.uploadFileWithCategory(file, folder);
                const publicUrl = response.url;

                // Map file field to doc type for DB update
                let docType = '';
                if (field === 'cacDocument') docType = 'CAC';
                if (field === 'ministryApproval') docType = 'MinistryApproval';
                if (field === 'fireSafetyCert') docType = 'FireSafety';
                if (field === 'healthCert') docType = 'Health';
                if (field === 'insuranceDoc') docType = 'Insurance';
                if (field === 'buildingApproval') docType = 'BuildingPlan';

                if (docType) {
                    await api.post('/infrastructure/documents', {
                        document_type: docType,
                        file_url: publicUrl,
                        verification_status: 'Pending'
                    });

                    console.log(`✅ ${docType} file uploaded and linked`);
                    toast({
                        title: 'File Uploaded',
                        description: `${file.name} saved to backend.`,
                    });
                }
            } catch (err: any) {
                console.error('File auto-upload error:', err);
                toast({
                    title: 'Upload Failed',
                    description: err.message,
                    variant: 'destructive'
                });
            }
        }
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.cacDocument || !formData.cacExpiryDate) {
                toast({ title: 'Missing Documents', description: 'CAC registration is required.', variant: 'destructive' });
                return false;
            }
        }
        if (step === 2) {
            if (!formData.fireSafetyCert || !formData.fireSafetyExpiry) {
                toast({ title: 'Missing Certificates', description: 'Fire safety certificate is required.', variant: 'destructive' });
                return false;
            }
        }
        if (step === 4) {
            if (!formData.curriculumType) {
                toast({ title: 'Curriculum Required', description: 'Please declare your school curriculum.', variant: 'destructive' });
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
            const uploadFileManually = async (file: File | undefined, category: string) => {
                if (!file) return null;
                const response = await api.uploadFileWithCategory(file, category);
                return response.url;
            };

            // Upload all documents sequentially or in parallel
            // Note: handleFileChange already auto-uploads, but handleSubmit ensures everything is synced
            const [
                cacUrl,
                ministryUrl,
                fireSafetyUrl,
                healthUrl,
                insuranceUrl,
                buildingUrl
            ] = await Promise.all([
                uploadFileManually(formData.cacDocument, 'legal'),
                uploadFileManually(formData.ministryApproval, 'legal'),
                uploadFileManually(formData.fireSafetyCert, 'safety'),
                uploadFileManually(formData.healthCert, 'safety'),
                uploadFileManually(formData.insuranceDoc, 'insurance'),
                uploadFileManually(formData.buildingApproval, 'building')
            ]);

            // Create document records in backend
            const docsToCreate = [
                { document_type: 'CAC', file_url: cacUrl, expiry_date: formData.cacExpiryDate },
                { document_type: 'MinistryApproval', file_url: ministryUrl, expiry_date: formData.ministryExpiryDate },
                { document_type: 'FireSafety', file_url: fireSafetyUrl, expiry_date: formData.fireSafetyExpiry },
                { document_type: 'Health', file_url: healthUrl, expiry_date: formData.healthExpiry },
                { document_type: 'Insurance', file_url: insuranceUrl, expiry_date: formData.insuranceExpiry },
                { document_type: 'BuildingPlan', file_url: buildingUrl, expiry_date: formData.buildingExpiry },
            ].filter(doc => doc.file_url || doc.expiry_date);

            // Send each record to the infrastructure/documents endpoint
            // The backend handles upsert logic based on school_id and type
            for (const doc of docsToCreate) {
                await api.createDocument(doc);
            }

            // Update school curriculum type
            await api.updateSchoolInfo(schoolId, { curriculum_type: formData.curriculumType });

            toast({
                title: 'Compliance Documents Submitted!',
                description: 'Your school is now set up for compliance tracking.',
            });

            onComplete();
        } catch (error: any) {
            console.error('Compliance upload error:', error);
            toast({
                title: 'Upload Failed',
                description: error.message || 'An error occurred during document upload.',
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
                        <Shield className="h-6 w-6 text-primary" />
                        School Compliance Onboarding
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
                    {fetching && (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2">Loading existing documents...</span>
                        </div>
                    )}

                    {/* Step 1: Legal Documents */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Legal Documents
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="cacDoc">CAC Registration Certificate *</Label>
                                    <Input
                                        id="cacDoc"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('cacDocument', e.target.files?.[0])}
                                    />
                                    {formData.cacDocument && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.cacDocument.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="cacExpiry">CAC Expiry Date *</Label>
                                    <Input
                                        id="cacExpiry"
                                        type="date"
                                        value={formData.cacExpiryDate}
                                        onChange={(e) => handleInputChange('cacExpiryDate', e.target.value)}
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <Label htmlFor="ministryDoc">Ministry of Education Approval</Label>
                                    <Input
                                        id="ministryDoc"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('ministryApproval', e.target.files?.[0])}
                                    />
                                    {formData.ministryApproval && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.ministryApproval.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="ministryExpiry">Ministry Approval Expiry</Label>
                                    <Input
                                        id="ministryExpiry"
                                        type="date"
                                        value={formData.ministryExpiryDate}
                                        onChange={(e) => handleInputChange('ministryExpiryDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Safety Certificates */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Flame className="h-5 w-5 text-orange-600" />
                                Safety & Health Certificates
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="fireCert">Fire Safety Certificate *</Label>
                                    <Input
                                        id="fireCert"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('fireSafetyCert', e.target.files?.[0])}
                                    />
                                    {formData.fireSafetyCert && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.fireSafetyCert.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="fireExpiry">Fire Certificate Expiry *</Label>
                                    <Input
                                        id="fireExpiry"
                                        type="date"
                                        value={formData.fireSafetyExpiry}
                                        onChange={(e) => handleInputChange('fireSafetyExpiry', e.target.value)}
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <Label htmlFor="healthCert">Health & Sanitation Certificate</Label>
                                    <Input
                                        id="healthCert"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('healthCert', e.target.files?.[0])}
                                    />
                                    {formData.healthCert && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.healthCert.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="healthExpiry">Health Certificate Expiry</Label>
                                    <Input
                                        id="healthExpiry"
                                        type="date"
                                        value={formData.healthExpiry}
                                        onChange={(e) => handleInputChange('healthExpiry', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Insurance & Building */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Insurance & Building Approval
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="insurance">Insurance Certificate</Label>
                                    <Input
                                        id="insurance"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('insuranceDoc', e.target.files?.[0])}
                                    />
                                    {formData.insuranceDoc && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.insuranceDoc.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="insuranceExpiry">Insurance Expiry</Label>
                                    <Input
                                        id="insuranceExpiry"
                                        type="date"
                                        value={formData.insuranceExpiry}
                                        onChange={(e) => handleInputChange('insuranceExpiry', e.target.value)}
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <Label htmlFor="buildingDoc">Building Plan Approval</Label>
                                    <Input
                                        id="buildingDoc"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => handleFileChange('buildingApproval', e.target.files?.[0])}
                                    />
                                    {formData.buildingApproval && (
                                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="h-4 w-4" /> {formData.buildingApproval.name}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="buildingExpiry">Building Approval Expiry</Label>
                                    <Input
                                        id="buildingExpiry"
                                        type="date"
                                        value={formData.buildingExpiry}
                                        onChange={(e) => handleInputChange('buildingExpiry', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Curriculum Declaration */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                Curriculum Declaration
                            </h3>

                            <div className="space-y-3">
                                <Card
                                    className={`cursor-pointer transition-all ${formData.curriculumType === 'Nigerian' ? 'border-primary border-2 bg-primary/5' : 'hover:border-gray-400'
                                        }`}
                                    onClick={() => handleInputChange('curriculumType', 'Nigerian')}
                                >
                                    <CardContent className="p-4">
                                        <h4 className="font-semibold">🇳🇬 Nigerian Curriculum Only</h4>
                                        <p className="text-sm text-gray-600 mt-1">WAEC, NECO, JAMB standard</p>
                                    </CardContent>
                                </Card>

                                <Card
                                    className={`cursor-pointer transition-all ${formData.curriculumType === 'British' ? 'border-primary border-2 bg-primary/5' : 'hover:border-gray-400'
                                        }`}
                                    onClick={() => handleInputChange('curriculumType', 'British')}
                                >
                                    <CardContent className="p-4">
                                        <h4 className="font-semibold">🇬🇧 British Curriculum Only</h4>
                                        <p className="text-sm text-gray-600 mt-1">Cambridge IGCSE, A-Levels</p>
                                    </CardContent>
                                </Card>

                                <Card
                                    className={`cursor-pointer transition-all ${formData.curriculumType === 'Both' ? 'border-primary border-2 bg-primary/5' : 'hover:border-gray-400'
                                        }`}
                                    onClick={() => handleInputChange('curriculumType', 'Both')}
                                >
                                    <CardContent className="p-4">
                                        <h4 className="font-semibold">🌍 Dual Curriculum</h4>
                                        <p className="text-sm text-gray-600 mt-1">Nigerian + British parallel tracks</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-semibold text-blue-900">📋 Summary</p>
                                <div className="mt-2 space-y-1 text-sm text-blue-800">
                                    <p>✓ CAC Registration: {formData.cacDocument ? 'Uploaded' : 'Not uploaded'}</p>
                                    <p>✓ Fire Safety: {formData.fireSafetyCert ? 'Uploaded' : 'Not uploaded'}</p>
                                    <p>✓ Curriculum: {formData.curriculumType || 'Not selected'}</p>
                                </div>
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
                                {loading ? 'Submitting...' : 'Complete Setup'}
                                <CheckCircle className="h-4 w-4 ml-1" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

