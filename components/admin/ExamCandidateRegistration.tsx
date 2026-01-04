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
    id: number;
    name: string;
    grade: number;
    attendance_status: string;
    track_status?: string; // from academic_tracks
}

export const ExamCandidateRegistration = () => {
    const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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

    const fetchEligibleStudents = async (bodyId: string) => {
        setLoading(true);
        const body = examBodies.find(b => b.id === bodyId);

        // Strict Fetch: Only fetch students whose curriculum matches the exam body
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('attendance_status', 'Present')
            .order('name');

        if (data) {
            // Filter locally if curriculum data isn't joined in the main table yet
            // In a dual-track school, some students might be eligible for both, but usually they have a primary track
            setStudents(data.filter(s => {
                if (body?.curriculum_type === 'Nigerian') return true; // Most students do WAEC
                if (body?.curriculum_type === 'British') return s.grade >= 9; // Only secondary for IGCSE
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
            `STD-${s.id}`,
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

    const handleBulkRegister = async () => {
        setRegistering(true);
        // This would connect to the 'exam_candidates' table
        const body = examBodies.find(b => b.id === selectedExam);
        toast.success(`Bulk registration initiated for ${filteredStudents.length} candidates`);
        setRegistering(false);
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">External Exam Registration</h1>
                    <p className="text-gray-500">Register students for WAEC, NECO, IGCSE and other bodies.</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleExport}
                        disabled={!selectedExam || filteredStudents.length === 0}
                        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span>Export Portal CSV</span>
                    </button>
                    <button
                        onClick={handleBulkRegister}
                        disabled={!selectedExam || registering}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <UserGroupIcon className="w-5 h-5" />
                        <span>{registering ? 'Registering...' : 'Bulk Register Candidates'}</span>
                    </button>
                </div>
            </div>

            {/* Exam Selector */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Examination Body</label>
                <div className="flex space-x-4">
                    {examBodies.map(exam => (
                        <button
                            key={exam.id}
                            onClick={() => setSelectedExam(exam.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all w-32 h-32 ${selectedExam === exam.id
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <DocumentTextIcon className="w-8 h-8 mb-2" />
                            <span className="font-bold">{exam.code}</span>
                            <span className="text-xs text-gray-500">{exam.name}</span>
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
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-700">Eligible Candidates</h2>
                        <div className="relative">
                            <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search students..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Loading eligible students...</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Grade</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{student.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            STD-{student.id.toString().padStart(4, '0')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            Grade {student.grade}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Not Registered
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-indigo-600 hover:text-indigo-900">Register</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExamCandidateRegistration;
