import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { api } from '../../lib/api';
import TeacherCurriculumBadges from '../shared/TeacherCurriculumBadges';
import { User, FileText, BookOpen, CheckCircle, Upload, AlertCircle } from 'lucide-react';
import { useAutoSync } from '../../hooks/useAutoSync';

interface TeacherProfileProps {
    teacherId: string;
}

export default function TeacherProfileEnhanced({ teacherId }: TeacherProfileProps) {
    const [teacher, setTeacher] = useState<any>(null);
    const [curriculumEligibility, setCurriculumEligibility] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(Date.now());
    const { toast } = useToast();

    const fetchTeacher = useCallback(async () => {
        try {
            const data = await api.getTeacherById(teacherId);
            setTeacher(data);
            setCurriculumEligibility(Array.isArray(data?.curriculum_eligibility) ? data.curriculum_eligibility : []);
            setRefreshKey(Date.now());
        } catch (error) {
            console.error('Error fetching teacher:', error);
        } finally {
            setLoading(false);
        }
    }, [teacherId]);

    useEffect(() => {
        fetchTeacher();
    }, [fetchTeacher]);

    useAutoSync(['teachers'], fetchTeacher);

    const handleCurriculumUpdate = async (value: 'Nigerian' | 'British' | 'Both') => {
        try {
            const newValue = value === 'Both' ? ['Nigerian', 'British'] : [value];
            await api.updateTeacher(teacherId, { curriculum_eligibility: newValue });

            setCurriculumEligibility(newValue);
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
            const res = await api.uploadFile('teacher-documents', `${teacherId}/${field}`, file);
            const publicUrl = ('publicUrl' in res) ? res.publicUrl : res.url;

            await api.updateTeacher(teacherId, { [field]: publicUrl });

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
    
    const isEligibleNigerian = curriculumEligibility.includes('Nigerian');
    const isEligibleBritish = curriculumEligibility.includes('British');

    const isCompliant = (isEligibleNigerian ? hasNigerianQualification : true) &&
                        (isEligibleBritish ? hasBritishQualification : true) &&
                        curriculumEligibility.length > 0;
    
    const displayEligibility = curriculumEligibility.length === 2 ? 'Both' : 
                               curriculumEligibility.includes('Nigerian') ? 'Nigerian' :
                               curriculumEligibility.includes('British') ? 'British' : null;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-inner">
                                {teacher.avatar_url ? (
                                    <img 
                                        key={refreshKey}
                                        src={`${teacher.avatar_url}${teacher.avatar_url.includes('uploads/') ? `?t=${refreshKey}` : ''}`} 
                                        alt={teacher.full_name || teacher.name} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(teacher.full_name || teacher.name || 'T') + '&background=random';
                                        }}
                                    />
                                ) : (
                                    <User className="h-12 w-12 text-primary/40" />
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-all group-hover:scale-110">
                                <Upload className="w-3.5 h-3.5 text-primary" />
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleDocumentUpload('avatar_url', e.target.files[0])}
                                />
                            </label>
                        </div>
                            <div>
                                <CardTitle className="text-2xl">
                                    {teacher.full_name || teacher.name || `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Unknown Teacher'}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    Staff ID: {teacher.school_generated_id || 'Pending Generation'}
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
                            className={`cursor-pointer transition-all ${displayEligibility === 'Nigerian' ? 'border-green-500 border-2 bg-green-50' : 'hover:border-gray-400'
                                }`}
                            onClick={() => handleCurriculumUpdate('Nigerian')}
                        >
                            <CardContent className="p-4 text-center">
                                <h4 className="font-semibold">🇳🇬 Nigerian</h4>
                                <p className="text-xs text-gray-600 mt-1">WAEC/NECO</p>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all ${displayEligibility === 'British' ? 'border-blue-500 border-2 bg-blue-50' : 'hover:border-gray-400'
                                }`}
                            onClick={() => handleCurriculumUpdate('British')}
                        >
                            <CardContent className="p-4 text-center">
                                <h4 className="font-semibold">🇬🇧 British</h4>
                                <p className="text-xs text-gray-600 mt-1">Cambridge/Edexcel</p>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all ${displayEligibility === 'Both' ? 'border-purple-500 border-2 bg-purple-50' : 'hover:border-gray-400'
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
                                        <div className="flex flex-col gap-2 mt-1">
                                            {teacher.trcn_certificate ? (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    <span className="text-sm text-green-600">Uploaded</span>
                                                    <Button size="sm" variant="link" onClick={() => window.open(teacher.trcn_certificate, '_blank')}>
                                                        View
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-amber-600">Missing TRCN</span>
                                            )}
                                            <Input
                                                id="trcn"
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => e.target.files && handleDocumentUpload('trcn_certificate', e.target.files[0])}
                                                disabled={uploading}
                                            />
                                        </div>
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
                            <div>
                                <Label htmlFor="british">British Teaching Qualification (QTS/PGCE)</Label>
                                <div className="flex flex-col gap-2 mt-1">
                                    {teacher.british_qualification ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <span className="text-sm text-green-600">Uploaded</span>
                                            <Button size="sm" variant="link" onClick={() => window.open(teacher.british_qualification, '_blank')}>
                                                View
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-sm text-amber-600">Missing British Qualification</span>
                                    )}
                                    <Input
                                        id="british"
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => e.target.files && handleDocumentUpload('british_qualification', e.target.files[0])}
                                        disabled={uploading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

