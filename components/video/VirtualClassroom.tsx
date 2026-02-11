import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { VirtualClass } from '../../types-additional';
import { toast } from 'react-hot-toast';
import { VideoCameraIcon, CalendarIcon, ClockIcon } from '../../constants';

interface VirtualClassroomProps {
    userRole: 'teacher' | 'student';
    userId: string;
}

const VirtualClassroom: React.FC<VirtualClassroomProps> = ({ userRole, userId }) => {
    const [classes, setClasses] = useState<VirtualClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [showJitsi, setShowJitsi] = useState(false);
    const [selectedClass, setSelectedClass] = useState<VirtualClass | null>(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            let query = supabase
                .from('virtual_classes')
                .select('*, teacher:teachers(name)')
                .order('scheduled_start', { ascending: true });

            if (userRole === 'teacher') {
                query = query.eq('teacher_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            setClasses(data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
            toast.error('Failed to load classes');
        } finally {
            setLoading(false);
        }
    };

    const createClass = async (classData: Partial<VirtualClass>) => {
        try {
            const meetingId = `meet-${Date.now()}`;
            const { error } = await supabase
                .from('virtual_classes')
                .insert({
                    ...classData,
                    teacher_id: userId,
                    meeting_id: meetingId,
                    meeting_link: `https://meet.jit.si/${meetingId}`,
                    status: 'scheduled'
                });

            if (error) throw error;

            toast.success('Virtual class created!');
            fetchClasses();
        } catch (error) {
            console.error('Error creating class:', error);
            toast.error('Failed to create class');
        }
    };

    const joinClass = (virtualClass: VirtualClass) => {
        setSelectedClass(virtualClass);
        setShowJitsi(true);

        // Record attendance
        supabase
            .from('class_attendance_virtual')
            .upsert({
                class_id: virtualClass.id,
                student_id: userId,
                joined_at: new Date().toISOString()
            })
            .then(() => console.log('Attendance recorded'));
    };

    const startClass = async (classId: number) => {
        try {
            await supabase
                .from('virtual_classes')
                .update({ status: 'live' })
                .eq('id', classId);

            const virtualClass = classes.find(c => c.id === classId);
            if (virtualClass) {
                setSelectedClass(virtualClass);
                setShowJitsi(true);
            }
        } catch (error) {
            console.error('Error starting class:', error);
            toast.error('Failed to start class');
        }
    };

    if (showJitsi && selectedClass) {
        return (
            <div className="fixed inset-0 bg-black z-50">
                <div className="flex items-center justify-between bg-gray-900 text-white p-4">
                    <h2 className="font-bold">{selectedClass.title}</h2>
                    <button
                        onClick={() => {
                            setShowJitsi(false);
                            setSelectedClass(null);
                        }}
                        className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
                    >
                        Leave Class
                    </button>
                </div>
                <iframe
                    src={selectedClass.meetingLink}
                    allow="camera; microphone; fullscreen; display-capture"
                    className="w-full h-[calc(100%-64px)]"
                />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Virtual Classroom</h2>
                {userRole === 'teacher' && (
                    <button
                        onClick={() => {
                            const title = prompt('Class Title:');
                            const subject = prompt('Subject:');
                            if (title && subject) {
                                createClass({
                                    title,
                                    subject,
                                    scheduledStart: new Date().toISOString(),
                                    scheduledEnd: new Date(Date.now() + 3600000).toISOString(),
                                    classGrade: 10,
                                    classSection: 'A',
                                    platform: 'jitsi'
                                });
                            }
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Schedule New Class
                    </button>
                )}
            </div>

            {/* Classes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((virtualClass) => (
                    <div key={virtualClass.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800">{virtualClass.title}</h3>
                                <p className="text-sm text-gray-500">{virtualClass.subject}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${virtualClass.status === 'live' ? 'bg-red-100 text-red-800' :
                                    virtualClass.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                }`}>
                                {virtualClass.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                            <div className="flex items-center space-x-2">
                                <CalendarIcon className="h-4 w-4" />
                                <span>{new Date(virtualClass.scheduledStart).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <ClockIcon className="h-4 w-4" />
                                <span>{new Date(virtualClass.scheduledStart).toLocaleTimeString()}</span>
                            </div>
                            {virtualClass.teacher && (
                                <p className="text-xs">Teacher: {virtualClass.teacher.name}</p>
                            )}
                        </div>

                        {userRole === 'teacher' ? (
                            <button
                                onClick={() => startClass(virtualClass.id)}
                                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                            >
                                <VideoCameraIcon className="h-5 w-5" />
                                <span>Start Class</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => joinClass(virtualClass)}
                                disabled={virtualClass.status !== 'live'}
                                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                <VideoCameraIcon className="h-5 w-5" />
                                <span>Join Class</span>
                            </button>
                        )}
                    </div>
                ))}

                {classes.length === 0 && (
                    <div className="col-span-full text-center py-16">
                        <VideoCameraIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No virtual classes scheduled</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VirtualClassroom;
