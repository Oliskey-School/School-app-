import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import TeacherCurriculumBadges from '../shared/TeacherCurriculumBadges';
import { User, FileText, BookOpen, CheckCircle, Upload, AlertCircle } from 'lucide-react';

interface TeacherProfileProps {
    teacherId: string;
}

export default function TeacherProfileEnhanced({ teacherId }: TeacherProfileProps) {
    const [teacher, setTeacher] = useState<any>(null);
    const [curriculumEligibility, setCurriculumEligibility] = useState<'Nigerian' | 'British' | 'Both' | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchTeacher();
    }, [teacherId]);

    const fetchTeacher = async () => {
        try {
            const { data } = await supabase
                .from('teachers')
                .select('*')
                .eq('id', teacherId)
                .single();

            setTeacher(data);
            setCurriculumEligibility(data?.curriculum_eligibility);
        } catch (error) {
            console.error('Error fetching teacher:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCurriculumUpdate = async (value: 'Nigerian' | 'British' | 'Both') => {
        try {
            const { error } = await supabase
                .from('teachers')
                .update({ curriculum_eligibility: value })
                .eq('id', teacherId);

            if (error) throw error;

            setCurriculumEligibility(value);
            toast({
                title: 'Curriculum Updated',
                description: `Teacher is now eligible for ${value} curriculum.`,
            });
        } catch (error: any) {
            toast({
                title: 'Update Failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleDocumentUpload = async (field: string, file: File) => {
        setUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from('teacher-documents')
                .upload(`${teacherId}/${field}/${fileName}`, file);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('teacher-documents')
                .getPublicUrl(data.path);

            await supabase
                .from('teachers')
                .update({ [field]: urlData.publicUrl })
                .eq('id', teacherId);

            toast({
                title: 'Document Uploaded',
                description: `${field} has been uploaded successfully.`,
            });

            fetchTeacher();
        } catch (error: any) {
            toast({
                title: 'Upload Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    if (loading || !teacher) {
        return <div className="p-6">Loading teacher profile...</div>;
    }

    const hasNigerianQualification = !!teacher.trcn_certificate;
    const hasBritishQualification = !!teacher.british_qualification;
    const isCompliant = curriculumEligibility && (
        (curriculumEligibility === 'Nigerian' && hasNigerianQualification) ||
        (curriculumEligibility === 'British' && hasBritishQualification) ||
        (curriculumEligibility === 'Both' && hasNigerianQualification && hasBritishQualification)
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-10 w-10 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">
                                    {teacher.first_name} {teacher.last_name}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    Staff ID: {teacher.staff_id || `T-${teacherId}`}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Subject: {teacher.subject || 'Not assigned'}
                                </p>
                            </div>
                        </div>

                        {/* Curriculum Eligibility Badges */}
                        <div className="flex flex-col items-end gap-2">
                            <TeacherCurriculumBadges
                                curriculumEligibility={curriculumEligibility}
                                size="lg"
                                showWarning={!curriculumEligibility}
                            />

                            {/* Compliance Status */}
                            {isCompliant ? (
                                <div className="flex items-center gap-1 text-sm text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Compliance: Good</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-sm text-amber-600">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>Compliance: Incomplete</span>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Curriculum Eligibility Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Curriculum Eligibility Declaration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600">
                        Select which curriculum(s) this teacher is qualified to teach:
                    </p>

                    <div className="grid grid-cols-3 gap-3">
                        <Card
                            className={`cursor-pointer transition-all ${curriculumEligibility === 'Nigerian' ? 'border-green-500 border-2 bg-green-50' : 'hover:border-gray-400'
                                }`}
                            onClick={() => handleCurriculumUpdate('Nigerian')}
                        >
                            <CardContent className="p-4 text-center">
                                <h4 className="font-semibold">🇳🇬 Nigerian</h4>
                                <p className="text-xs text-gray-600 mt-1">WAEC/NECO</p>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all ${curriculumEligibility === 'British' ? 'border-blue-500 border-2 bg-blue-50' : 'hover:border-gray-400'
                                }`}
                            onClick={() => handleCurriculumUpdate('British')}
                        >
                            <CardContent className="p-4 text-center">
                                <h4 className="font-semibold">🇬🇧 British</h4>
                                <p className="text-xs text-gray-600 mt-1">Cambridge/Edexcel</p>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all ${curriculumEligibility === 'Both' ? 'border-purple-500 border-2 bg-purple-50' : 'hover:border-gray-400'
                                }`}
                            onClick={() => handleCurriculumUpdate('Both')}
                        >
                            <CardContent className="p-4 text-center">
                                <h4 className="font-semibold">🌍 Both</h4>
                                <p className="text-xs text-gray-600 mt-1">Dual Qualified</p>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Qualification Documents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Qualification Documents
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Nigerian Qualifications */}
                    <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            🇳🇬 Nigerian Qualifications
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="trcn">TRCN Certificate</Label>
                                {teacher.trcn_certificate ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-600">Uploaded</span>
                                        <Button size="sm" variant="link" onClick={() => window.open(teacher.trcn_certificate, '_blank')}>
                                            View
                                        </Button>
                                    </div>
                                ) : (
                                    <Input
                                        id="trcn"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => e.target.files && handleDocumentUpload('trcn_certificate', e.target.files[0])}
                                        disabled={uploading}
                                    />
                                )}
                            </div>

                            <div>
                                <Label htmlFor="degree">Degree Certificate</Label>
                                {teacher.degree_certificate ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-600">Uploaded</span>
                                        <Button size="sm" variant="link" onClick={() => window.open(teacher.degree_certificate, '_blank')}>
                                            View
                                        </Button>
                                    </div>
                                ) : (
                                    <Input
                                        id="degree"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => e.target.files && handleDocumentUpload('degree_certificate', e.target.files[0])}
                                        disabled={uploading}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* British Qualifications */}
                    <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            🇬🇧 British Qualifications
                        </h4>
                        <div>
                            <Label htmlFor="british">British Teaching Qualification (QTS/PGCE)</Label>
                            {teacher.british_qualification ? (
                                <div className="flex items-center gap-2 mt-1">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-sm text-green-600">Uploaded</span>
                                    <Button size="sm" variant="link" onClick={() => window.open(teacher.british_qualification, '_blank')}>
                                        View
                                    </Button>
                                </div>
                            ) : (
                                <Input
                                    id="british"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => e.target.files && handleDocumentUpload('british_qualification', e.target.files[0])}
                                    disabled={uploading}
                                />
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
