
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Exam, Student } from '../../types';
import { CheckCircleIcon } from '../../constants';

import { toast } from 'react-hot-toast';

const getScoreIndicatorStyle = (scoreStr: string): string => {
    const score = parseInt(scoreStr, 10);
    if (scoreStr === '' || isNaN(score)) return 'border-gray-300 bg-gray-50 focus:bg-white';
    if (score >= 90) return 'border-green-400 bg-green-100 text-green-900 font-bold';
    if (score >= 75) return 'border-sky-400 bg-sky-100 text-sky-900 font-bold';
    if (score >= 60) return 'border-amber-400 bg-amber-100 text-amber-900 font-bold';
    return 'border-red-400 bg-red-100 text-red-900 font-bold';
};

const SaveStatusIndicator: React.FC<{ status: 'idle' | 'saving' | 'saved' }> = ({ status }) => {
    switch (status) {
        case 'saving':
            return <span className="text-sm text-gray-500 animate-pulse">Saving...</span>;
        case 'saved':
            return <span className="text-sm text-green-600 flex items-center"><CheckCircleIcon className="w-4 h-4 mr-1" /> All changes saved</span>;
        default:
            return <span className="text-sm text-gray-400">Grades will auto-save.</span>;
    }
};

interface GradeEntryScreenProps {
    exam: Exam;
}

const GradeEntryScreen: React.FC<GradeEntryScreenProps> = ({ exam }) => {
    const [scores, setScores] = useState<{ [studentId: number]: string }>({});
    const [students, setStudents] = useState<Student[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [loading, setLoading] = useState(true);
    const debounceTimeoutRef = useRef<number | null>(null);

    // Parse Class Name
    const gradeSection = React.useMemo(() => {
        const gradeMatch = exam.className.match(/\d+/);
        const sectionMatch = exam.className.match(/[A-Z]/);
        if (!gradeMatch || !sectionMatch) return null;
        return {
            grade: parseInt(gradeMatch[0], 10),
            section: sectionMatch[0]
        };
    }, [exam.className]);

    // Fetch Students
    useEffect(() => {
        if (!gradeSection) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Students
                const { data: studentsData, error } = await supabase
                    .from('students')
                    .select('*')
                    .eq('grade', gradeSection.grade)
                    .eq('section', gradeSection.section)
                    .order('name');

                if (error) throw error;

                const loadedStudents = studentsData.map((s: any) => ({
                    ...s,
                    avatarUrl: s.avatar_url
                }));
                setStudents(loadedStudents);

                // 2. Fetch Existing Grades for this subject
                const studentIds = loadedStudents.map(s => s.id);
                if (studentIds.length > 0) {
                    const { data: gradesData } = await supabase
                        .from('academic_performance')
                        .select('student_id, score')
                        .eq('subject', exam.subject)
                        .eq('term', 'First Term') // Hardcoded for simplified context
                        .in('student_id', studentIds);

                    if (gradesData) {
                        const scoreMap: { [key: number]: string } = {};
                        gradesData.forEach((g: any) => {
                            scoreMap[g.student_id] = g.score.toString();
                        });
                        setScores(scoreMap);
                    }
                }

            } catch (err) {
                console.error("Error loading grade entry data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [gradeSection, exam.subject]);


    const saveGrade = async (studentId: number, value: string) => {
        const numericScore = parseInt(value, 10);

        // Upsert logic (requires unique constraint usually, but we handle via check first or assume insert/update)
        // Check if exists
        const { data: existing } = await supabase
            .from('academic_performance')
            .select('id')
            .eq('student_id', studentId)
            .eq('subject', exam.subject)
            .eq('term', 'First Term')
            .maybeSingle();

        if (existing) {
            await supabase.from('academic_performance').update({ score: numericScore }).eq('id', existing.id);
        } else {
            await supabase.from('academic_performance').insert([{
                student_id: studentId,
                subject: exam.subject,
                score: numericScore,
                term: 'First Term',
                session: '2024/2025'
            }]);
        }

        console.log(`Saved score for student ${studentId}: ${value}`);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleScoreChange = (studentId: number, value: string) => {
        const numericValue = parseInt(value, 10);
        if (value === '' || (numericValue >= 0 && numericValue <= 100)) {
            setScores(prev => ({ ...prev, [studentId]: value }));

            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            setSaveStatus('saving');

            debounceTimeoutRef.current = window.setTimeout(() => {
                if (value !== '') {
                    saveGrade(studentId, value);
                }
            }, 1200);
        }
    };

    const handleSubmit = () => {
        toast.success('All grades submitted successfully!');
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            {/* Header section */}
            <div className="p-4 bg-white border-b border-gray-200">
                <h3 className="font-bold text-lg text-gray-800">{exam.subject} - {exam.type}</h3>
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500">{exam.className}</p>
                    <SaveStatusIndicator status={saveStatus} />
                </div>
            </div>

            {/* Student List */}
            <main className="flex-grow overflow-y-auto">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading student list...</div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {students.map(student => (
                            <li key={student.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50">
                                <div className="flex items-center space-x-4">
                                    {student.avatarUrl ? (
                                        <img src={student.avatarUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                            <span className="font-bold">{student.name.charAt(0)}</span>
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-gray-800">{student.name}</p>
                                        <p className="text-sm text-gray-500">Student ID: SCH-0{student.id}</p>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    value={scores[student.id] || ''}
                                    onChange={(e) => handleScoreChange(student.id, e.target.value)}
                                    placeholder="--"
                                    max={100}
                                    min={0}
                                    aria-label={`Score for ${student.name}`}
                                    className={`w-16 sm:w-20 h-12 text-center text-lg rounded-lg border-2 transition-colors ${getScoreIndicatorStyle(scores[student.id] || '')}`}
                                />
                            </li>
                        ))}
                        {students.length === 0 && (
                            <div className="text-center py-10 bg-white">
                                <p className="text-gray-500">No students found for this class ({exam.className}).</p>
                            </div>
                        )}
                    </ul>
                )}
            </main>

            {/* Footer action button */}
            <div className="p-4 bg-white border-t border-gray-200">
                <button
                    onClick={handleSubmit}
                    disabled={saveStatus === 'saving'}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400"
                >
                    Submit All Grades
                </button>
            </div>
        </div>
    );
};

export default GradeEntryScreen;
