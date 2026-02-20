import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import { BookOpen, AlertCircle, Save, CheckCircle } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';
import { api } from '../../lib/api';

interface AttendanceTrackSelectorProps {
    teacherId: string;
    classId: string;
    onCurriculumChange?: (curriculum: 'Nigerian' | 'British') => void;
}

export default function AttendanceTrackSelector({
    teacherId,
    classId,
    onCurriculumChange
}: AttendanceTrackSelectorProps) {
    const [selectedCurriculum, setSelectedCurriculum] = useState<'Nigerian' | 'British'>('Nigerian');
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<{ [key: string]: 'Present' | 'Absent' | 'Late' }>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const { profile } = useProfile();

    useEffect(() => {
        fetchStudents();
    }, [classId, selectedCurriculum]);

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

            // Fetch student details
            let { data: studentList, error: studentsError } = await supabase
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
            if (classId && studentList) {
                // First try filtering by class_id if it exists
                const classFiltered = studentList.filter(s => s.class_id === classId || s.current_class_id === classId);

                // If no results with class_id, try getting class info and filtering by grade/section
                if (classFiltered.length === 0) {
                    const { data: classInfo } = await supabase
                        .from('classes')
                        .select('grade, section')
                        .eq('id', classId)
                        .single();

                    if (classInfo) {
                        studentList = studentList.filter(s =>
                            s.grade === classInfo.grade && s.section === classInfo.section
                        );
                    }
                } else {
                    studentList = classFiltered;
                }
            }

            setStudents(studentList || []);
            console.log(`Loaded ${studentList?.length || 0} students for ${selectedCurriculum} curriculum`);

            // Initialize attendance state
            const initialAttendance: { [key: string]: 'Present' | 'Absent' | 'Late' } = {};
            studentList?.forEach(student => {
                initialAttendance[student.id] = 'Present';
            });
            setAttendance(initialAttendance);
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

    const handleCurriculumSwitch = (curriculum: 'Nigerian' | 'British') => {
        if (Object.keys(attendance).some(key => attendance[key] !== 'Present')) {
            if (!confirm('You have unsaved changes. Switching curriculum will discard them. Continue?')) {
                return;
            }
        }

        setSelectedCurriculum(curriculum);
        onCurriculumChange?.(curriculum);
    };

    const handleAttendanceChange = (studentId: string, status: 'Present' | 'Absent' | 'Late') => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSave = async () => {
        if (!profile?.schoolId) {
            toast({
                title: 'Error',
                description: 'School context missing. Please refresh.',
                variant: 'destructive'
            });
            return;
        }

        setSaving(true);
        try {
            const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
                student_id: studentId,
                class_id: classId,
                school_id: profile.schoolId,
                branch_id: profile.branchId || null,
                date: new Date().toISOString().split('T')[0],
                status: status.toLowerCase(),
            }));

            await api.saveAttendance(attendanceRecords);

            toast({
                title: 'Attendance Saved',
                description: `${selectedCurriculum} curriculum attendance has been recorded.`,
            });
        } catch (error: any) {
            console.error('Attendance save error:', error);
            toast({
                title: 'Save Failed',
                description: error.message || 'Failed to save attendance',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const presentCount = Object.values(attendance).filter(s => s === 'Present').length;
    const absentCount = Object.values(attendance).filter(s => s === 'Absent').length;
    const lateCount = Object.values(attendance).filter(s => s === 'Late').length;

    return (
        <div className="space-y-6">
            {/* Curriculum Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Select Curriculum Track
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <p className="text-sm text-amber-900">
                            <strong>Important:</strong> Attendance is recorded separately for Nigerian and British curriculum students.
                            Make sure to select the correct track before marking.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Card
                            className={`cursor-pointer transition-all ${selectedCurriculum === 'Nigerian' ? 'border-green-500 border-2 bg-green-50' : 'hover:border-gray-400'
                                }`}
                            onClick={() => handleCurriculumSwitch('Nigerian')}
                        >
                            <CardContent className="p-6 text-center">
                                <h3 className="text-xl font-bold mb-2">🇳🇬 Nigerian Track</h3>
                                <p className="text-sm text-gray-600">WAEC/NECO Students</p>
                                <Badge className="mt-3 bg-green-600 text-white">
                                    {students.length} Student{students.length !== 1 ? 's' : ''}
                                </Badge>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all ${selectedCurriculum === 'British' ? 'border-blue-500 border-2 bg-blue-50' : 'hover:border-gray-400'
                                }`}
                            onClick={() => handleCurriculumSwitch('British')}
                        >
                            <CardContent className="p-6 text-center">
                                <h3 className="text-xl font-bold mb-2">🇬🇧 British Track</h3>
                                <p className="text-sm text-gray-600">Cambridge/IGCSE Students</p>
                                <Badge className="mt-3 bg-blue-600 text-white">
                                    {students.length} Student{students.length !== 1 ? 's' : ''}
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* Attendance Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-600">Present</p>
                        <p className="text-3xl font-bold text-green-600">{presentCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-600">Absent</p>
                        <p className="text-3xl font-bold text-red-600">{absentCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-600">Late</p>
                        <p className="text-3xl font-bold text-amber-600">{lateCount}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Student List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>
                            Mark Attendance - {selectedCurriculum} Track
                        </CardTitle>
                        <Badge variant="outline" className={selectedCurriculum === 'Nigerian' ? 'border-green-500 text-green-700' : 'border-blue-500 text-blue-700'}>
                            {selectedCurriculum === 'Nigerian' ? '🇳🇬 Nigerian' : '🇬🇧 British'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-center py-8 text-gray-500">Loading students...</p>
                    ) : students.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600">No students enrolled in {selectedCurriculum} curriculum for this class.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {students.map((student) => (
                                <div key={student.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-sm font-semibold">
                                                {student.first_name?.[0]}{student.last_name?.[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-semibold">{student.first_name} {student.last_name}</p>
                                            <p className="text-xs text-gray-600">{student.admission_number || `S-${student.id}`}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={attendance[student.id] === 'Present' ? 'default' : 'outline'}
                                            onClick={() => handleAttendanceChange(student.id, 'Present')}
                                            className={attendance[student.id] === 'Present' ? 'bg-green-600 hover:bg-green-700' : ''}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Present
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={attendance[student.id] === 'Absent' ? 'default' : 'outline'}
                                            onClick={() => handleAttendanceChange(student.id, 'Absent')}
                                            className={attendance[student.id] === 'Absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                                        >
                                            Absent
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={attendance[student.id] === 'Late' ? 'default' : 'outline'}
                                            onClick={() => handleAttendanceChange(student.id, 'Late')}
                                            className={attendance[student.id] === 'Late' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                        >
                                            Late
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {students.length > 0 && (
                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleSave} disabled={saving} size="lg">
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : 'Save Attendance'}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
