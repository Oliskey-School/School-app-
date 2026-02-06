import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import { BookOpen, AlertCircle, Save, TrendingUp } from 'lucide-react';
import { CurriculumMismatchWarning } from '../shared/TeacherCurriculumBadges';

interface ResultsEntryProps {
    teacherId: string;
    classId: string;
    examId: string;
    teacherCurriculumEligibility: 'Nigerian' | 'British' | 'Both' | null;
}

export default function ResultsEntryEnhanced({
    teacherId,
    classId,
    examId,
    teacherCurriculumEligibility
}: ResultsEntryProps) {
    const [selectedCurriculum, setSelectedCurriculum] = useState<'Nigerian' | 'British'>('Nigerian');
    const [students, setStudents] = useState<any[]>([]);
    const [results, setResults] = useState<{ [key: string]: { ca: string; exam: string; total: number; grade: string } }>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exam, setExam] = useState<any>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchExamDetails();
        fetchStudents();
    }, [examId, selectedCurriculum]);

    const fetchExamDetails = async () => {
        const { data } = await supabase
            .from('exams')
            .select('*, curricula:curriculum_id(name)')
            .eq('id', examId)
            .single();

        setExam(data);
        if (data?.curricula?.name) {
            setSelectedCurriculum(data.curricula.name as 'Nigerian' | 'British');
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            // Get curriculum ID for the selected curriculum
            const { data: curriculum } = await supabase
                .from('curricula')
                .select('id')
                .ilike('name', `%${selectedCurriculum}%`)
                .single();

            if (!curriculum) {
                console.warn('Curriculum not found:', selectedCurriculum);
                setStudents([]);
                setLoading(false);
                return;
            }

            // Fetch students enrolled in this curriculum
            const { data: tracks, error: tracksError } = await supabase
                .from('academic_tracks')
                .select('student_id')
                .eq('curriculum_id', curriculum.id)
                .eq('status', 'Active');

            if (tracksError) {
                console.error('Error fetching tracks:', tracksError);
                setStudents([]);
                setLoading(false);
                return;
            }

            if (!tracks || tracks.length === 0) {
                console.log('No students enrolled in this curriculum');
                setStudents([]);
                setLoading(false);
                return;
            }

            const studentIds = tracks.map(t => t.student_id);

            // Fetch student details - try with class_id first, fallback to grade/section
            let { data: students, error: studentsError } = await supabase
                .from('students')
                .select('*')
                .in('id', studentIds);

            if (studentsError) {
                console.error('Error fetching students:', studentsError);
                toast({
                    title: 'Error Loading Students',
                    description: studentsError.message,
                    variant: 'destructive'
                });
                setStudents([]);
                setLoading(false);
                return;
            }

            // Filter by class if classId is provided
            if (classId && students) {
                // First try filtering by class_id if it exists
                const classFiltered = students.filter(s => s.class_id === classId);

                // If no results with class_id, try getting class info and filtering by grade/section
                if (classFiltered.length === 0) {
                    const { data: classInfo } = await supabase
                        .from('classes')
                        .select('grade, section')
                        .eq('id', classId)
                        .single();

                    if (classInfo) {
                        students = students.filter(s =>
                            s.grade === classInfo.grade && s.section === classInfo.section
                        );
                    }
                } else {
                    students = classFiltered;
                }
            }

            setStudents(students || []);
            console.log(`Loaded ${students?.length || 0} students for ${selectedCurriculum} curriculum`);

            // Fetch existing results
            const { data: existingResults } = await supabase
                .from('exam_results')
                .select('*')
                .eq('exam_id', examId);

            const resultsMap: { [key: string]: any } = {};
            existingResults?.forEach(result => {
                resultsMap[result.student_id] = {
                    ca: result.ca_score?.toString() || '',
                    exam: result.exam_score?.toString() || '',
                    total: result.total_score || 0,
                    grade: result.grade || ''
                };
            });
            setResults(resultsMap);
        } catch (error: any) {
            console.error('Error fetching students:', error);
            toast({
                title: 'Error Loading Students',
                description: error.message || 'Failed to load students',
                variant: 'destructive'
            });
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateGrade = (total: number, curriculum: 'Nigerian' | 'British'): string => {
        if (curriculum === 'Nigerian') {
            if (total >= 70) return 'A';
            if (total >= 60) return 'B';
            if (total >= 50) return 'C';
            if (total >= 45) return 'D';
            if (total >= 40) return 'E';
            return 'F';
        } else {
            // British grading
            if (total >= 90) return 'A*';
            if (total >= 80) return 'A';
            if (total >= 70) return 'B';
            if (total >= 60) return 'C';
            if (total >= 50) return 'D';
            if (total >= 40) return 'E';
            if (total >= 30) return 'F';
            return 'U';
        }
    };

    const handleScoreChange = (studentId: string, field: 'ca' | 'exam', value: string) => {
        const numValue = parseFloat(value) || 0;
        const maxCA = selectedCurriculum === 'Nigerian' ? 40 : 50;
        const maxExam = selectedCurriculum === 'Nigerian' ? 60 : 50;

        if (field === 'ca' && numValue > maxCA) {
            toast({
                title: 'Invalid Score',
                description: `CA score cannot exceed ${maxCA} for ${selectedCurriculum} curriculum.`,
                variant: 'destructive'
            });
            return;
        }

        if (field === 'exam' && numValue > maxExam) {
            toast({
                title: 'Invalid Score',
                description: `Exam score cannot exceed ${maxExam} for ${selectedCurriculum} curriculum.`,
                variant: 'destructive'
            });
            return;
        }

        setResults(prev => {
            const current = prev[studentId] || { ca: '', exam: '', total: 0, grade: '' };
            const newCa = field === 'ca' ? numValue : (parseFloat(current.ca) || 0);
            const newExam = field === 'exam' ? numValue : (parseFloat(current.exam) || 0);
            const total = newCa + newExam;
            const grade = calculateGrade(total, selectedCurriculum);

            return {
                ...prev,
                [studentId]: {
                    ca: field === 'ca' ? value : current.ca,
                    exam: field === 'exam' ? value : current.exam,
                    total,
                    grade
                }
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const resultRecords = Object.entries(results).map(([studentId, result]) => ({
                student_id: studentId,
                exam_id: examId,
                class_id: classId,
                teacher_id: teacherId,
                curriculum_type: selectedCurriculum,
                ca_score: parseFloat(result.ca) || 0,
                exam_score: parseFloat(result.exam) || 0,
                total_score: result.total,
                grade: result.grade,
            }));

            const { error } = await supabase
                .from('exam_results')
                .upsert(resultRecords, {
                    onConflict: 'student_id,exam_id'
                });

            if (error) throw error;

            toast({
                title: 'Results Saved',
                description: `${selectedCurriculum} curriculum results have been recorded.`,
            });
        } catch (error: any) {
            toast({
                title: 'Save Failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const averageScore = students.length > 0
        ? (Object.values(results).reduce((sum, r) => sum + r.total, 0) / students.length).toFixed(2)
        : '0.00';

    const passCount = Object.values(results).filter(r =>
        selectedCurriculum === 'Nigerian' ? r.total >= 40 : r.total >= 40
    ).length;

    // Check for curriculum mismatch
    const hasMismatch = teacherCurriculumEligibility &&
        teacherCurriculumEligibility !== 'Both' &&
        teacherCurriculumEligibility !== selectedCurriculum;

    return (
        <div className="space-y-6">
            {/* Curriculum Warning */}
            {hasMismatch && (
                <CurriculumMismatchWarning
                    teacherName="You"
                    teacherEligibility={teacherCurriculumEligibility}
                    requiredCurriculum={selectedCurriculum}
                />
            )}

            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Results Entry - {selectedCurriculum} Curriculum
                        </CardTitle>
                        <Badge variant="outline" className={selectedCurriculum === 'Nigerian' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
                            {selectedCurriculum === 'Nigerian' ? '🇳🇬 Nigerian' : '🇬🇧 British'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold">Exam:</span>
                            <span>{exam?.name || 'Loading...'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold">Grading Scale:</span>
                            <span>
                                {selectedCurriculum === 'Nigerian'
                                    ? 'CA (40) + Exam (60) = Total (100)'
                                    : 'Coursework (50) + Exam (50) = Total (100)'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="font-semibold">Pass Mark:</span>
                            <span>{selectedCurriculum === 'Nigerian' ? '40/100 (E)' : '40/100 (E)'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-600">Students</p>
                        <p className="text-3xl font-bold text-primary">{students.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-600">Class Average</p>
                        <p className="text-3xl font-bold text-blue-600">{averageScore}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-600">Pass Rate</p>
                        <p className="text-3xl font-bold text-green-600">
                            {students.length > 0 ? ((passCount / students.length) * 100).toFixed(0) : 0}%
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Results Entry Table */}
            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <p className="text-center py-8 text-gray-500">Loading students...</p>
                    ) : students.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">No students enrolled in {selectedCurriculum} curriculum for this class.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overfow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2">
                                            <th className="text-left p-3">Student Name</th>
                                            <th className="text-center p-3">
                                                {selectedCurriculum === 'Nigerian' ? 'CA (40)' : 'Coursework (50)'}
                                            </th>
                                            <th className="text-center p-3">
                                                {selectedCurriculum === 'Nigerian' ? 'Exam (60)' : 'Exam (50)'}
                                            </th>
                                            <th className="text-center p-3">Total (100)</th>
                                            <th className="text-center p-3">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {students.map((student) => {
                                            const result = results[student.id] || { ca: '', exam: '', total: 0, grade: '' };
                                            return (
                                                <tr key={student.id} className="border-b hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <div>
                                                            <p className="font-semibold">{student.first_name} {student.last_name}</p>
                                                            <p className="text-xs text-gray-600">{student.admission_number || `S-${student.id}`}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={selectedCurriculum === 'Nigerian' ? 40 : 50}
                                                            value={result.ca}
                                                            onChange={(e) => handleScoreChange(student.id, 'ca', e.target.value)}
                                                            className="w-20 text-center"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={selectedCurriculum === 'Nigerian' ? 60 : 50}
                                                            value={result.exam}
                                                            onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                                                            className="w-20 text-center"
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="font-bold text-lg">{result.total}</span>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Badge variant="outline" className={`font-bold ${result.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                                                            result.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                                                                result.grade.startsWith('C') ? 'bg-cyan-100 text-cyan-800' :
                                                                    result.grade === 'F' || result.grade === 'U' ? 'bg-red-100 text-red-800' :
                                                                        'bg-amber-100 text-amber-800'
                                                            }`}>
                                                            {result.grade || '-'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSave} disabled={saving} size="lg">
                                    <Save className="h-4 w-4 mr-2" />
                                    {saving ? 'Saving...' : 'Save Results'}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Grade Legend */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">
                        {selectedCurriculum} Grading Scale Reference
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedCurriculum === 'Nigerian' ? (
                        <div className="grid grid-cols-6 gap-2 text-xs">
                            <div className="p-2 bg-green-100 rounded text-center">
                                <strong>A:</strong> 70-100
                            </div>
                            <div className="p-2 bg-blue-100 rounded text-center">
                                <strong>B:</strong> 60-69
                            </div>
                            <div className="p-2 bg-cyan-100 rounded text-center">
                                <strong>C:</strong> 50-59
                            </div>
                            <div className="p-2 bg-amber-100 rounded text-center">
                                <strong>D:</strong> 45-49
                            </div>
                            <div className="p-2 bg-orange-100 rounded text-center">
                                <strong>E:</strong> 40-44
                            </div>
                            <div className="p-2 bg-red-100 rounded text-center">
                                <strong>F:</strong> 0-39
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="p-2 bg-green-100 rounded text-center">
                                <strong>A*:</strong> 90-100
                            </div>
                            <div className="p-2 bg-green-100 rounded text-center">
                                <strong>A:</strong> 80-89
                            </div>
                            <div className="p-2 bg-blue-100 rounded text-center">
                                <strong>B:</strong> 70-79
                            </div>
                            <div className="p-2 bg-cyan-100 rounded text-center">
                                <strong>C:</strong> 60-69
                            </div>
                            <div className="p-2 bg-amber-100 rounded text-center">
                                <strong>D:</strong> 50-59
                            </div>
                            <div className="p-2 bg-orange-100 rounded text-center">
                                <strong>E:</strong> 40-49
                            </div>
                            <div className="p-2 bg-red-100 rounded text-center">
                                <strong>F/G:</strong> 30-39
                            </div>
                            <div className="p-2 bg-red-100 rounded text-center">
                                <strong>U:</strong> 0-29
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
