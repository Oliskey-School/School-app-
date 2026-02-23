import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { UserGroupIcon, SearchIcon, DownloadIcon, CheckCircleIcon, DocumentTextIcon, XCircleIcon } from '../../constants';

interface ExamBody {
    id: string;
    name: string;
    code: string;
    curriculum_type?: string;
}

interface Student {
    id: string;
    name: string;
    grade: number;
    attendance_status: string;
    enrollment_number?: string;
    school_generated_id?: string;
    track_status?: string; // from academic_tracks
}

interface ExamCandidateRegistrationProps {
    schoolId?: string;
    currentBranchId?: string;
}

export const ExamCandidateRegistration: React.FC<ExamCandidateRegistrationProps> = ({ schoolId, currentBranchId }) => {
    const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchExamBodies();
    }, []);

    useEffect(() => {
        if (selectedExam) {
            fetchEligibleStudents(selectedExam);
        }
    }, [selectedExam]);

    const fetchExamBodies = async () => {
        const { data, error } = await supabase.from('exam_bodies').select('*');
        if (data) setExamBodies(data);
    };

    // Helper to fetch registrations
    const fetchRegistrations = async (bodyId: string) => {
        const { data } = await supabase
            .from('exam_candidates')
            .select('student_id')
            .eq('exam_body_id', bodyId);

        if (data) {
            // Create a set for O(1) lookups. Note: DB might return different types, ensure consistency.
            setRegisteredIds(new Set(data.map(r => r.student_id)));
        } else {
            setRegisteredIds(new Set());
        }
    };

    const fetchEligibleStudents = async (bodyId: string) => {
        setLoading(true);
        const body = examBodies.find(b => b.id === bodyId);

        // Parallel fetch for speed
        await fetchRegistrations(bodyId);

        // Strict Fetch: Only fetch students whose curriculum matches the exam body and same school
        let query = supabase
            .from('students')
            .select('*')
            .eq('attendance_status', 'Present');

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query.order('name');

        if (data) {
            // Filter locally if curriculum data isn't joined in the main table yet
            setStudents(data.filter(s => {
                if (body?.curriculum_type === 'Nigerian') return true;
                if (body?.curriculum_type === 'British') return s.grade >= 9;
                return true;
            }));
        }
        setLoading(false);
    };

    const handleExport = () => {
        const body = examBodies.find(b => b.id === selectedExam);
        const headers = ["Candidate Name", "Student ID", "Grade", "Board", "Curriculum"];
        const rows = filteredStudents.map(s => [
            s.name,
            s.school_generated_id || s.enrollment_number || s.id.slice(0, 8),
            s.grade,
            body?.code || 'Board',
            body?.curriculum_type || 'General'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${body?.code || 'Exam'}_Candidates_2026.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filteredStudents.length} candidates for ${body?.code}`);
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (selectedGrade === '' || s.grade.toString() === selectedGrade)
    );

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudents(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedStudents.size === filteredStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const registerCandidates = async (candidateIds: string[]) => {
        setRegistering(true);
        const body = examBodies.find(b => b.id === selectedExam);
        let successCount = 0;
        let lastError = '';

        for (const studentId of candidateIds) {
            try {
                // 1. Check if already registered
                const { data: existing } = await supabase
                    .from('exam_candidates')
                    .select('id')
                    .eq('exam_body_id', selectedExam)
                    .eq('student_id', studentId)
                    .maybeSingle();

                if (existing) {
                    continue;
                }

                // 2. Register
                const { error: regError } = await supabase.from('exam_candidates').insert({
                    school_id: schoolId,
                    exam_body_id: selectedExam,
                    student_id: studentId,
                    status: 'Registered'
                });

                if (regError) throw regError;

                successCount++;

                // 3. Notifications
                // Fetch Parent info AND Student User ID
                const { data: studentData } = await supabase
                    .from('students')
                    .select('user_id, name')
                    .eq('id', studentId)
                    .single();

                const { data: parentLinks } = await supabase
                    .from('parent_children')
                    .select('parent_id, parents(user_id)')
                    .eq('student_id', studentId);

                const examName = `${body?.name} (${body?.code})`;

                // Notify Parent(s)
                if (parentLinks && parentLinks.length > 0) {
                    const link: any = parentLinks[0];
                    const parentData = link.parents;
                    const parent = Array.isArray(parentData) ? parentData[0] : parentData;

                    if (parent && parent.user_id) {
                        try {
                            await supabase.from('notifications').insert({
                                user_id: parent.user_id,
                                category: 'Academics',
                                title: 'Exam Registration Confirmed',
                                summary: `Success! Your child ${studentData?.name || ''} has been registered for the ${examName}.`,
                                audience: ['parent'],
                                is_read: false
                            });
                        } catch (e) { console.warn('Parent notify failed', e); }
                    }
                }

                // Notify Student
                if (studentData && studentData.user_id) {
                    try {
                        await supabase.from('notifications').insert({
                            user_id: studentData.user_id,
                            category: 'Academics',
                            title: 'Exam Registration Confirmed',
                            summary: `You have been successfully registered for the ${examName}. Good luck!`,
                            audience: ['student'],
                            is_read: false
                        });
                    } catch (e) { console.warn('Student notify failed', e); }
                }
            } catch (err: any) {
                console.error(`Failed to register student ${studentId}:`, err);
                lastError = err.message || 'Unknown error';
            }
        }

        if (successCount > 0) {
            toast.success(`Successfully registered ${successCount} candidates.`);
            fetchEligibleStudents(selectedExam);
            setSelectedStudents(new Set());
        } else {
            if (candidateIds.length === 0) {
                toast.error('No candidates selected.');
            } else if (lastError) {
                toast.error(`Registration failed: ${lastError}`);
            } else {
                toast.error('No new candidates were registered (candidates might already be registered).');
            }
        }
        setRegistering(false);
    };

    const handleBulkRegister = () => {
        if (selectedStudents.size === 0) return;
        registerCandidates(Array.from(selectedStudents));
    };

    return (
        <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6 pb-32 lg:pb-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">External Exam Registration</h1>
                    <p className="text-gray-500 text-sm lg:text-base">Register students for WAEC, NECO, IGCSE and other bodies.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <button
                        onClick={handleExport}
                        disabled={!selectedExam || filteredStudents.length === 0}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50 w-full sm:w-auto"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span>Export CSV</span>
                    </button>
                    <button
                        onClick={handleBulkRegister}
                        disabled={!selectedExam || registering || selectedStudents.size === 0}
                        className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 w-full sm:w-auto"
                    >
                        <UserGroupIcon className="w-5 h-5" />
                        <span>{registering ? 'Registering...' : `Register Selected (${selectedStudents.size})`}</span>
                    </button>
                </div>
            </div>

            {/* Exam Selector */}
            <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Examination Body</label>
                <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                    {examBodies.map(exam => (
                        <button
                            key={exam.id}
                            onClick={() => setSelectedExam(exam.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all w-32 h-32 flex-shrink-0 ${selectedExam === exam.id
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <DocumentTextIcon className="w-8 h-8 mb-2" />
                            <span className="font-bold">{exam.code}</span>
                            <span className="text-xs text-gray-500 text-center truncate w-full">{exam.name}</span>
                        </button>
                    ))}
                    {examBodies.length === 0 && (
                        <div className="p-4 text-gray-500 italic">No active exam bodies found.</div>
                    )}
                </div>
            </div>

            {/* Student List */}
            {selectedExam && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
                        <h2 className="font-semibold text-gray-700 text-lg">Eligible Candidates</h2>
                        <div className="relative w-full sm:w-64">
                            {/* Filter Controls Row */}
                            <div className="flex space-x-2 w-full">
                                <select
                                    value={selectedGrade}
                                    onChange={(e) => setSelectedGrade(e.target.value)}
                                    className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                >
                                    <option value="">All Grades</option>
                                    <option value="9">Grade 9</option>
                                    <option value="10">Grade 10</option>
                                    <option value="11">Grade 11</option>
                                    <option value="12">Grade 12</option>
                                </select>
                                <div className="relative flex-grow">
                                    <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Loading eligible students...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 px-4">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                                checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="checkbox"
                                                    disabled={registeredIds.has(student.id)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                    checked={selectedStudents.has(student.id)}
                                                    onChange={() => toggleSelection(student.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{student.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.school_generated_id || student.id.slice(0, 8)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                Grade {student.grade}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {registeredIds.has(student.id) ? (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        Registered
                                                    </span>
                                                ) : (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        Not Registered
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {registeredIds.has(student.id) ? (
                                                    <span className="text-gray-400 text-sm">Done</span>
                                                ) : (
                                                    <button
                                                        onClick={() => registerCandidates([student.id])}
                                                        className="text-indigo-600 hover:text-indigo-900 border border-indigo-600 px-3 py-1 rounded hover:bg-indigo-50"
                                                    >
                                                        Register
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExamCandidateRegistration;
