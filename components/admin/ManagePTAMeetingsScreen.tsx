import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrashIcon, PlusIcon, CalendarIcon, MapIcon, ClockIcon, SearchIcon, CheckCircleIcon, XCircleIcon, UserIcon } from '../../constants';

const ManagePTAMeetingsScreen: React.FC = () => {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        agenda: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('pta_meetings')
                .select('*')
                .order('date', { ascending: true });

            if (error) throw error;
            setMeetings(data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setStatusMessage({ type: 'error', text: 'Failed to load meetings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            const { error } = await supabase
                .from('pta_meetings')
                .insert([newItem]);

            if (error) throw error;

            setNewItem({ title: '', date: '', time: '', location: '', agenda: '' });
            fetchData();
            setStatusMessage({ type: 'success', text: 'Meeting scheduled successfully!' });
        } catch (err) {
            console.error('Error creating meeting:', err);
            setStatusMessage({ type: 'error', text: 'Failed to schedule meeting.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Cancel this meeting?')) return;
        try {
            const { error } = await supabase.from('pta_meetings').delete().eq('id', id);
            if (error) throw error;
            fetchData();
            setStatusMessage({ type: 'success', text: 'Meeting cancelled.' });
        } catch (err) {
            console.error('Error deleting:', err);
            setStatusMessage({ type: 'error', text: 'Failed to cancel meeting.' });
        }
    };

    const isPast = (dateStr: string) => {
        return new Date(dateStr) < new Date();
    };

    const filteredMeetings = meetings.filter(m =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.agenda?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const upcomingMeetings = filteredMeetings.filter(m => !isPast(m.date));
    const pastMeetings = filteredMeetings.filter(m => isPast(m.date));

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">PTA Meetings</h1>
                <p className="text-gray-500 text-sm">Schedule and manage Parent-Teacher Association meetings.</p>
                {statusMessage && (
                    <div className={`p-4 rounded-lg flex items-center space-x-2 animate-fade-in-down ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {statusMessage.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Title</label>
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location / Link</label>
                                <input
                                    type="text"
                                    placeholder="e.g. School Hall or Zoom Link"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.location}
                                    onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agenda / Topics</label>
                                <textarea
                                    placeholder="List main discussion points..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all h-28 resize-none"
                                    value={newItem.agenda}
                                    onChange={e => setNewItem({ ...newItem, agenda: e.target.value })}
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
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-lg font-bold text-gray-800">Meeting Schedule</h2>
                            <div className="relative w-full sm:w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search meetings..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-grow flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            </div>
                        ) : meetings.length === 0 ? (
                            <div className="flex-grow flex flex-col justify-center items-center text-gray-400 py-12">
                                <UserIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p>No meetings scheduled.</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Upcoming */}
                                {upcomingMeetings.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="uppercase text-xs font-bold text-gray-400 tracking-wider">Upcoming</h3>
                                        {upcomingMeetings.map(meeting => (
                                            <div key={meeting.id} className="relative flex flex-col md:flex-row p-5 bg-white border border-purple-100 rounded-xl shadow-sm hover:shadow-md transition-all group border-l-4 border-l-purple-500">
                                                <div className="flex-shrink-0 flex md:flex-col items-center justify-center md:mr-6 mb-4 md:mb-0 md:w-20 bg-purple-50 rounded-lg p-3 text-purple-700">
                                                    <span className="text-xs font-bold uppercase">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-2xl font-bold">{new Date(meeting.date).getDate()}</span>
                                                    <span className="text-xs opacity-75">{new Date(meeting.date).toLocaleString('default', { weekday: 'short' })}</span>
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h3 className="text-lg font-bold text-gray-800">{meeting.title}</h3>
                                                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                                                <div className="flex items-center">
                                                                    <ClockIcon className="w-4 h-4 mr-1.5 text-purple-400" />
                                                                    {meeting.time}
                                                                </div>
                                                                <div className="flex items-center">
                                                                    <MapIcon className="w-4 h-4 mr-1.5 text-purple-400" />
                                                                    {meeting.location}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDelete(meeting.id)}
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <p className="mt-3 text-gray-600 text-sm">{meeting.agenda}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Past */}
                                {pastMeetings.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="uppercase text-xs font-bold text-gray-400 tracking-wider">Past History</h3>
                                        {pastMeetings.map(meeting => (
                                            <div key={meeting.id} className="flex flex-col md:flex-row p-4 bg-gray-50 border border-gray-100 rounded-xl opacity-70 hover:opacity-100 transition-opacity">
                                                <div className="flex-shrink-0 w-24 text-gray-500 text-sm font-medium mb-2 md:mb-0">
                                                    {new Date(meeting.date).toLocaleDateString()}
                                                </div>
                                                <div className="flex-grow">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-gray-700">{meeting.title}</h4>
                                                        <button onClick={() => handleDelete(meeting.id)} className="text-gray-300 hover:text-red-500">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-gray-500 mt-1">{meeting.agenda}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagePTAMeetingsScreen;
