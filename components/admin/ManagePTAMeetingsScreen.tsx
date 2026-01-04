import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrashIcon, PlusIcon, CalendarIcon, UsersIcon, VideoIcon, UserIcon } from '../../constants';
import ConfirmationModal from '../ui/ConfirmationModal';

const ManagePTAMeetingsScreen: React.FC = () => {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        description: '',
        type: 'In-Person',
        target_group: 'All Parents'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Deletion State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState<number | null>(null);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            const { data, error } = await supabase
                .from('pta_meetings')
                .select('*')
                .order('date', { ascending: true });

            if (error) throw error;
            setMeetings(data || []);
        } catch (err) {
            console.error('Error fetching meetings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('pta_meetings')
                .insert([newItem]);

            if (error) throw error;

            setNewItem({
                title: '',
                date: '',
                time: '',
                location: '',
                description: '',
                type: 'In-Person',
                target_group: 'All Parents'
            });
            fetchMeetings();
            toast.success('Meeting scheduled successfully!');
        } catch (err) {
            console.error('Error scheduling meeting:', err);
            toast.error('Failed to schedule meeting.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (id: number) => {
        setMeetingToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (meetingToDelete === null) return;
        const id = meetingToDelete;
        setShowDeleteModal(false);
        setMeetingToDelete(null);

        try {
            const { error } = await supabase.from('pta_meetings').delete().eq('id', id);
            if (error) throw error;
            fetchMeetings();
            toast.success('Meeting cancelled.');
        } catch (err) {
            console.error('Error deleting:', err);
            toast.error('Failed to cancel meeting.');
        }
    };

    const isUpcoming = (dateString: string) => {
        return new Date(dateString) >= new Date(new Date().setHours(0, 0, 0, 0));
    };

    const upcomingMeetings = meetings.filter(m => isUpcoming(m.date));
    const pastMeetings = meetings.filter(m => !isUpcoming(m.date));

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">PTA Meetings</h1>
                <p className="text-gray-500 text-sm">Schedule and manage Parent-Teacher Association meetings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Form Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2 text-purple-600" />
                            Schedule Meeting
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Annual General Meeting"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.date}
                                        onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input
                                        type="time"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.time}
                                        onChange={e => setNewItem({ ...newItem, time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                                        value={newItem.type}
                                        onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                    >
                                        <option value="In-Person">In-Person</option>
                                        <option value="Virtual">Virtual</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                                        value={newItem.target_group}
                                        onChange={e => setNewItem({ ...newItem, target_group: e.target.value })}
                                    >
                                        <option value="All Parents">All Parents</option>
                                        <option value="Committee">Committee Only</option>
                                        <option value="Class Reps">Class Reps</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Link</label>
                                <input
                                    type="text"
                                    placeholder={newItem.type === 'Virtual' ? 'Meeting Link' : 'e.g. School Auditorium'}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.location}
                                    onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agenda / Description</label>
                                <textarea
                                    placeholder="Topics to discuss..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-200"
                            >
                                {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Upcoming Meetings */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <CalendarIcon className="w-5 h-5 mr-2 text-purple-600" />
                            Upcoming Meetings
                        </h2>
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            </div>
                        ) : upcomingMeetings.length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400">
                                <p>No upcoming meetings scheduled.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingMeetings.map(meeting => (
                                    <div key={meeting.id} className="flex flex-col md:flex-row p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                                        <div className="flex-shrink-0 w-24 text-gray-500 text-sm font-medium mb-2 md:mb-0">
                                            {new Date(meeting.date).toLocaleDateString()}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-700">{meeting.title}</h4>
                                                <button onClick={() => confirmDelete(meeting.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{meeting.description || meeting.agenda}</p>
                                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                                                <span className="flex items-center">
                                                    <UsersIcon className="w-3 h-3 mr-1" />
                                                    {meeting.target_group}
                                                </span>
                                                <span className="flex items-center">
                                                    {meeting.type === 'Virtual' ? <VideoIcon className="w-3 h-3 mr-1" /> : <UsersIcon className="w-3 h-3 mr-1" />}
                                                    {meeting.location}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Past Meetings Section */}
                    {pastMeetings.length > 0 && (
                        <div>
                            <h2 className="text-lg font-bold text-gray-400 mb-4 flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-2" />
                                Past Meetings
                            </h2>
                            <div className="space-y-4 opacity-70 grayscale hover:grayscale-0 transition-all">
                                {pastMeetings.map(meeting => (
                                    <div key={meeting.id} className="flex flex-col md:flex-row p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                        <div className="flex-shrink-0 w-24 text-gray-400 text-sm font-medium mb-2 md:mb-0">
                                            {new Date(meeting.date).toLocaleDateString()}
                                        </div>
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-gray-600">{meeting.title}</h4>
                                                <button onClick={() => confirmDelete(meeting.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Cancel Meeting"
                message="Are you sure you want to cancel this meeting? This action cannot be undone."
                confirmText="Yes, Cancel"
                isDanger={true}
            />
        </div>
    );
};

export default ManagePTAMeetingsScreen;
