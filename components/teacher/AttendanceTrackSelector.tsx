import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../lib/supabase';
import { BookOpen, AlertCircle, Save, CheckCircle } from 'lucide-react';

interface AttendanceTrackSelectorProps {
    teacherId: number;
    classId: number;
    onCurriculumChange?: (curriculum: 'Nigerian' | 'British') => void;
}

export default function AttendanceTrackSelector({
    teacherId,
    classId,
    onCurriculumChange
}: AttendanceTrackSelectorProps) {
    const [selectedCurriculum, setSelectedCurriculum] = useState<'Nigerian' | 'British'>('Nigerian');
    const [students, setStudents] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<{ [key: number]: 'Present' | 'Absent' | 'Late' }>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchStudents();
    }, [classId, selectedCurriculum]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            // Fetch students who are enrolled in the selected curriculum
            const { data } = await supabase
                .from('students')
                .select(`
          *,
          academic_tracks!inner (
            id,
            curricula!inner (
              name
            )
          )
        `)
                .eq('class_id', classId)
                .eq('academic_tracks.curricula.name', selectedCurriculum);

            setStudents(data || []);

            // Initialize attendance state
            const initialAttendance: { [key: number]: 'Present' | 'Absent' | 'Late' } = {};
            data?.forEach(student => {
                initialAttendance[student.id] = 'Present';
            });
            setAttendance(initialAttendance);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCurriculumSwitch = (curriculum: 'Nigerian' | 'British') => {
        if (Object.keys(attendance).some(key => attendance[parseInt(key)] !== 'Present')) {
            if (!confirm('You have unsaved changes. Switching curriculum will discard them. Continue?')) {
                return;
            }
        }

        setSelectedCurriculum(curriculum);
        onCurriculumChange?.(curriculum);
    };

    const handleAttendanceChange = (studentId: number, status: 'Present' | 'Absent' | 'Late') => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const attendanceRecords = Object.entries(attendance).map(([studentId, status]) => ({
                student_id: parseInt(studentId),
                class_id: classId,
                teacher_id: teacherId,
                curriculum_type: selectedCurriculum,
                status,
                date: new Date().toISOString().split('T')[0],
            }));

            const { error } = await supabase
                .from('attendance')
                .upsert(attendanceRecords, {
                    onConflict: 'student_id,date,curriculum_type'
                });

            if (error) throw error;

            toast({
                title: 'Attendance Saved',
                description: `${selectedCurriculum} curriculum attendance has been recorded.`,
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
