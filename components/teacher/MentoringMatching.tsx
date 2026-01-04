import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import {
    UsersIcon,
    CheckCircleIcon,
    UserGroupIcon
} from '../../constants';

interface Teacher {
    id: number;
    full_name: string;
    email: string;
}

interface MentoringMatch {
    id: number;
    mentor_name: string;
    mentee_name: string;
    subject_area: string;
    status: string;
    started_at: string;
    is_mentor: boolean;
}

const MentoringMatching: React.FC = () => {
    const { profile } = useProfile();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [myMatches, setMyMatches] = useState<MentoringMatch[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<number>(0);
    const [subjectArea, setSubjectArea] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) {
                setLoading(false);
                return;
            }

            // Fetch all teachers
            const { data: allTeachers } = await supabase
                .from('teachers')
                .select('id, full_name, email')
                .neq('id', teacherData.id);

            setTeachers(allTeachers || []);

            // Fetch my mentoring matches
            const { data: matches } = await supabase
                .from('mentoring_matches')
                .select(`
          *,
          mentor:teachers!mentoring_matches_mentor_id_fkey(full_name),
          mentee:teachers!mentoring_matches_mentee_id_fkey(full_name)
        `)
                .or(`mentor_id.eq.${teacherData.id},mentee_id.eq.${teacherData.id}`)
                .eq('status', 'Active');

            const formatted: MentoringMatch[] = (matches || []).map((m: any) => ({
                id: m.id,
                mentor_name: m.mentor?.full_name || 'Unknown',
                mentee_name: m.mentee?.full_name || 'Unknown',
                subject_area: m.subject_area,
                status: m.status,
                started_at: m.started_at,
                is_mentor: m.mentor_id === teacherData.id
            }));

            setMyMatches(formatted);
        } catch (error: any) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestMentor = async () => {
        if (!selectedTeacher || !subjectArea.trim()) {
            toast.error('Please select a teacher and enter subject area');
            return;
        }

        try {
            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) return;

            const { error } = await supabase
                .from('mentoring_matches')
                .insert({
                    mentor_id: selectedTeacher,
                    mentee_id: teacherData.id,
                    subject_area: subjectArea,
                    status: 'Active'
                });

            if (error) throw error;

            toast.success('Mentoring request sent successfully!');
            setSelectedTeacher(0);
            setSubjectArea('');
            fetchData();
        } catch (error: any) {
            console.error('Error creating match:', error);
            toast.error('Failed to create mentoring match');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Mentoring</h2>
                <p className="text-sm text-gray-600 mt-1">Connect with fellow teachers for professional growth</p>
            </div>

            {/* Request Mentor Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Request a Mentor</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Mentor
                        </label>
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value={0}>Choose a teacher</option>
                            {teachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.full_name} ({teacher.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject Area
                        </label>
                        <input
                            type="text"
                            value={subjectArea}
                            onChange={(e) => setSubjectArea(e.target.value)}
                            placeholder="e.g., Mathematics, Classroom Management"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={handleRequestMentor}
                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                        Send Request
                    </button>
                </div>
            </div>

            {/* My Mentoring Relationships */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">My Mentoring Relationships</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {myMatches.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p>No active mentoring relationships</p>
                        </div>
                    ) : (
                        myMatches.map((match) => (
                            <div key={match.id} className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <UsersIcon className="w-5 h-5 text-gray-400" />
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                                {match.is_mentor ? 'Mentor' : 'Mentee'}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-gray-900">
                                            {match.is_mentor ? `Mentoring: ${match.mentee_name}` : `Mentor: ${match.mentor_name}`}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <strong>Subject:</strong> {match.subject_area}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Started: {new Date(match.started_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentoringMatching;
