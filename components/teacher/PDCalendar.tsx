import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    CalendarIcon,
    ClockIcon,
    MapPinIcon,
    UsersIcon,
    CheckCircleIcon
} from '../../constants';

interface PDEvent {
    id: number;
    title: string;
    description: string;
    event_type: string;
    start_date: string;
    end_date: string;
    location: string;
    is_virtual: boolean;
    max_participants: number;
    is_registered: boolean;
}

const PDCalendar: React.FC = () => {
    const [events, setEvents] = useState<PDEvent[]>([]);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'registered'>('upcoming');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('pd_events')
                .select('*')
                .gte('start_date', new Date().toISOString())
                .order('start_date');

            if (error) throw error;

            const formatted: PDEvent[] = (data || []).map((e: any) => ({
                id: e.id,
                title: e.title,
                description: e.description,
                event_type: e.event_type,
                start_date: e.start_date,
                end_date: e.end_date,
                location: e.location,
                is_virtual: e.is_virtual,
                max_participants: e.max_participants,
                is_registered: false
            }));

            setEvents(formatted);
        } catch (error: any) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEvents = events.filter(e => {
        if (filter === 'all') return true;
        if (filter === 'upcoming') return new Date(e.start_date) > new Date();
        if (filter === 'registered') return e.is_registered;
        return true;
    });

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case 'Workshop': return 'bg-blue-100 text-blue-800';
            case 'Seminar': return 'bg-purple-100 text-purple-800';
            case 'Conference': return 'bg-green-100 text-green-800';
            case 'Training': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">PD Calendar</h2>
                <p className="text-sm text-gray-600 mt-1">Upcoming professional development events</p>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
                {(['all', 'upcoming', 'registered'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Events List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No events found</p>
                    </div>
                ) : (
                    filteredEvents.map((event) => (
                        <div key={event.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                                            {event.event_type}
                                        </span>
                                        {event.is_virtual && (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                Virtual
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{event.title}</h3>
                                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>

                                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
                                        <div className="flex items-center space-x-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            <span>{new Date(event.start_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        {!event.is_virtual && (
                                            <div className="flex items-center space-x-2">
                                                <MapPinIcon className="w-4 h-4" />
                                                <span>{event.location}</span>
                                            </div>
                                        )}
                                        {event.max_participants && (
                                            <div className="flex items-center space-x-2">
                                                <UsersIcon className="w-4 h-4" />
                                                <span>Max {event.max_participants} participants</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    {event.is_registered ? (
                                        <div className="flex items-center space-x-2 text-green-600">
                                            <CheckCircleIcon className="w-5 h-5" />
                                            <span className="text-sm font-medium">Registered</span>
                                        </div>
                                    ) : (
                                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                                            Register
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PDCalendar;
