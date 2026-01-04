import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, Video, MapPin, CheckCircle, XCircle } from 'lucide-react';

interface TeacherAvailability {
    id: number;
    teacher_id: number;
    date: string;
    time_start: string;
    time_end: string;
    is_available: boolean;
    location: string;
    conference_type: string;
    teachers?: {
        id: number;
        name: string;
        subject: string;
    };
}

interface Conference {
    id: number;
    scheduled_date: string;
    scheduled_time: string;
    duration_minutes: number;
    conference_type: string;
    meeting_link?: string;
    location?: string;
    status: string;
    teacher_notes?: string;
    teachers: {
        name: string;
        subject: string;
    };
    students: {
        name: string;
    };
}

const ConferenceScheduling: React.FC = () => {
    const { profile } = useProfile();
    const [availability, setAvailability] = useState<TeacherAvailability[]>([]);
    const [myConferences, setMyConferences] = useState<Conference[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TeacherAvailability | null>(null);
    const [studentId, setStudentId] = useState<number | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [showBookModal, setShowBookModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'book' | 'my-conferences'>('book');

    useEffect(() => {
        fetchStudents();
        fetchAvailability();
        fetchMyConferences();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('id, name')
                .eq('parent_id', profile.id);

            if (error) throw error;
            setStudents(data || []);
            if (data && data.length > 0) {
                setStudentId(data[0].id);
            }
        } catch (error: any) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchAvailability = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('teacher_availability')
                .select(`
          *,
          teachers (id, name, subject)
        `)
                .eq('is_available', true)
                .gte('date', today)
                .order('date', { ascending: true })
                .order('time_start', { ascending: true });

            if (error) throw error;
            setAvailability(data || []);
        } catch (error: any) {
            console.error('Error fetching availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyConferences = async () => {
        try {
            const { data, error } = await supabase
                .from('parent_teacher_conferences')
                .select(`
          *,
          teachers (name, subject),
          students (name)
        `)
                .eq('parent_id', profile.id)
                .order('scheduled_date', { ascending: true });

            if (error) throw error;
            setMyConferences(data || []);
        } catch (error: any) {
            console.error('Error fetching conferences:', error);
        }
    };

    const handleBookConference = async () => {
        if (!selectedSlot || !studentId) {
            toast.error('Please select a student');
            return;
        }

        try {
            const meetingLink = selectedSlot.conference_type === 'Virtual'
                ? `https://meet.google.com/${Math.random().toString(36).substring(7)}`
                : null;

            const { error } = await supabase.from('parent_teacher_conferences').insert({
                parent_id: profile.id,
                teacher_id: selectedSlot.teacher_id,
                student_id: studentId,
                scheduled_date: selectedSlot.date,
                scheduled_time: selectedSlot.time_start,
                duration_minutes: 30,
                conference_type: selectedSlot.conference_type,
                meeting_link: meetingLink,
                location: selectedSlot.location,
                status: 'Scheduled',
                parent_notes: notes
            });

            if (error) throw error;

            // Mark slot as unavailable
            await supabase
                .from('teacher_availability')
                .update({ is_available: false })
                .eq('id', selectedSlot.id);

            toast.success('Conference booked successfully! 📅');
            setShowBookModal(false);
            setNotes('');
            fetchAvailability();
            fetchMyConferences();
        } catch (error: any) {
            toast.error('Failed to book conference');
            console.error(error);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Scheduled: 'bg-blue-100 text-blue-800',
            Confirmed: 'bg-green-100 text-green-800',
            Completed: 'bg-gray-100 text-gray-800',
            Cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTypeIcon = (type: string) => {
        return type === 'Virtual' ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">Parent-Teacher Conferences</h1>
                <p className="text-indigo-100">Schedule meetings with your child's teachers</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('book')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'book'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Book Conference
                </button>
                <button
                    onClick={() => setActiveTab('my-conferences')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'my-conferences'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    My Conferences ({myConferences.length})
                </button>
            </div>

            {/* Available Slots */}
            {activeTab === 'book' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Available Time Slots</h2>
                    {availability.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No available slots at the moment</p>
                            <p className="text-sm">Teachers will post availability soon</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availability.map(slot => (
                                <div key={slot.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-gray-900">{slot.teachers?.name}</h3>
                                        <p className="text-sm text-gray-600">{slot.teachers?.subject}</p>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(slot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <Clock className="h-4 w-4" />
                                            <span>{slot.time_start} - {slot.time_end}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            {getTypeIcon(slot.conference_type)}
                                            <span>{slot.conference_type}</span>
                                        </div>
                                        {slot.location && slot.conference_type === 'In-Person' && (
                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                <MapPin className="h-4 w-4" />
                                                <span>{slot.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedSlot(slot);
                                            setShowBookModal(true);
                                        }}
                                        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors"
                                    >
                                        Book This Slot
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* My Conferences */}
            {activeTab === 'my-conferences' && (
                <div className="space-y-4">
                    {myConferences.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No conferences scheduled</p>
                            <p className="text-sm">Book a conference to get started</p>
                        </div>
                    ) : (
                        myConferences.map(conf => (
                            <div key={conf.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{conf.teachers.name}</h3>
                                        <p className="text-sm text-gray-600">{conf.teachers.subject} • {conf.students.name}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(conf.status)}`}>
                                        {conf.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>{new Date(conf.scheduled_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        <Clock className="h-4 w-4" />
                                        <span>{conf.scheduled_time} ({conf.duration_minutes} mins)</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                                        {getTypeIcon(conf.conference_type)}
                                        <span>{conf.conference_type}</span>
                                    </div>
                                    {conf.conference_type === 'In-Person' && conf.location && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <MapPin className="h-4 w-4" />
                                            <span>{conf.location}</span>
                                        </div>
                                    )}
                                </div>

                                {conf.meeting_link && conf.status !== 'Cancelled' && (
                                    <a
                                        href={conf.meeting_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                                    >
                                        <Video className="h-4 w-4" />
                                        <span>Join Video Call</span>
                                    </a>
                                )}

                                {conf.teacher_notes && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm font-semibold text-gray-700 mb-1">Teacher Notes:</p>
                                        <p className="text-sm text-gray-600">{conf.teacher_notes}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Booking Modal */}
            {showBookModal && selectedSlot && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Book Conference</h2>

                        <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-700">Teacher:</p>
                            <p className="text-gray-900">{selectedSlot.teachers?.name} - {selectedSlot.teachers?.subject}</p>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-700">Date & Time:</p>
                            <p className="text-gray-900">
                                {new Date(selectedSlot.date).toLocaleDateString()} at {selectedSlot.time_start}
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Student</label>
                            <select
                                value={studentId || ''}
                                onChange={(e) => setStudentId(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                {students.map(student => (
                                    <option key={student.id} value={student.id}>{student.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Topics you'd like to discuss..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            ></textarea>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowBookModal(false);
                                    setNotes('');
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBookConference}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                            >
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConferenceScheduling;
