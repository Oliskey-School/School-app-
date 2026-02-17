import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; import { Student, Teacher } from '../../types';
import IDCardGenerator from '../shared/IDCardGenerator';
import { CreditCard } from 'lucide-react';
import { getFormattedClassName } from '../../constants';

interface IDCardManagementProps {
    initialUser?: Student | Teacher;
    initialView?: 'students' | 'teachers';
}

const IDCardManagement: React.FC<IDCardManagementProps> = ({ initialUser, initialView = 'students' }) => {
    const [view, setView] = useState<'students' | 'teachers'>('students');
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedUser, setSelectedUser] = useState<Student | Teacher | null>(initialUser || null);
    const [loading, setLoading] = useState(!initialUser);

    useEffect(() => {
        if (initialUser) {
            setSelectedUser(initialUser);
            if (initialView) setView(initialView);
        }
    }, [initialUser, initialView]);

    useEffect(() => {
        if (view === 'students') {
            fetchStudents();
        } else {
            fetchTeachers();
        }
    }, [view]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('name');

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('teachers')
                .select('*')
                .order('name');

            if (error) throw error;
            setTeachers(data || []);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoading(false);
        }
    };

    if (selectedUser) {
        return (
            <div className="space-y-4">
                <button
                    onClick={() => setSelectedUser(null)}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                    ← Back to List
                </button>
                <IDCardGenerator
                    user={selectedUser}
                    userType={view === 'students' ? 'student' : 'teacher'}
                />
            </div>
        );
    }

    const users = view === 'students' ? students : teachers;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <CreditCard className="h-8 w-8 text-indigo-600" />
                    <h2 className="text-2xl font-bold text-gray-800">ID Card Management</h2>
                </div>

                <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setView('students')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${view === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'
                            }`}
                    >
                        Students
                    </button>
                    <button
                        onClick={() => setView('teachers')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${view === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'
                            }`}
                    >
                        Teachers
                    </button>
                </div>
            </div>

            {/* User List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow text-left"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.name}
                                            className="w-16 h-16 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                                            {user.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800">{user.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {view === 'students'
                                            ? getFormattedClassName((user as Student).grade, (user as Student).section)
                                            : (user as Teacher).subjects?.[0] || 'Teacher'
                                        }
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        ID: {view === 'students' ? 'STU' : 'TCH'}-{String(user.id).padStart(6, '0')}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 text-center">
                                <span className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-semibold">
                                    Generate ID Card
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default IDCardManagement;
