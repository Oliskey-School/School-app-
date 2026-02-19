import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PTAMeeting } from '../../types';
import { CalendarIcon, ClockIcon, UsersIcon, CheckCircleIcon } from '../../constants';

const PTAMeetingScreen: React.FC = () => {
    const [meeting, setMeeting] = useState<PTAMeeting | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        fetchUpcomingMeeting();
    }, []);

    const fetchUpcomingMeeting = async () => {
        try {
            // Fetch meetings that are NOT past, order by date ascending (soonest first)
            const { data, error } = await supabase
                .from('pta_meetings')
                .select('*')
                .eq('is_past', false)
                .order('date', { ascending: true })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const m = data[0];
                setMeeting({
                    id: m.id,
                    title: m.title,
                    date: m.date,
                    time: m.time,
                    agenda: m.agenda || [], // Ensure agenda is an array
                    isPast: m.is_past
                });
            } else {
                // Properly handle "No Data" state instead of hardcoded demo
                setMeeting(null);
            }
        } catch (err) {
            console.error('Error fetching PTA meeting:', err);
            setMeeting(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center text-gray-500">
                <UsersIcon className="h-16 w-16 text-gray-200 mb-4" />
                <h3 className="text-xl font-bold text-gray-700">No Upcoming Meetings</h3>
                <p>There are no PTA meetings scheduled at this moment.</p>
            </div>
        );
    }

    // Parse date safely
    const meetingDate = new Date(meeting.date);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <UsersIcon className="h-32 w-32 text-green-800" />
                    </div>
                    <UsersIcon className="h-10 w-10 mx-auto text-green-500 mb-2 relative z-10" />
                    <h3 className="font-bold text-xl text-green-800 relative z-10">Upcoming PTA Meeting</h3>
                    <p className="text-sm text-green-600 relative z-10">Join us to discuss the future of our school.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Meeting Details Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                            Next Session
                        </span>
                        <h2 className="text-2xl font-extrabold text-gray-800 leading-tight mb-6">{meeting.title}</h2>

                        <div className="space-y-4">
                            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                                <div className="p-2 bg-white rounded-lg shadow-sm mr-4 text-green-600">
                                    <CalendarIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Date</p>
                                    <p className="font-bold text-gray-800">
                                        {meetingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                                <div className="p-2 bg-white rounded-lg shadow-sm mr-4 text-green-600">
                                    <ClockIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Time</p>
                                    <p className="font-bold text-gray-800">{meeting.time}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agenda Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-gray-800">Meeting Agenda</h3>
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                                {meeting.agenda.length} Items
                            </span>
                        </div>

                        <div className="flex-grow">
                            <ul className="space-y-4 relative before:absolute before:inset-y-0 before:left-[15px] before:w-0.5 before:bg-gray-100">
                                {meeting.agenda.map((item, index) => (
                                    <li key={index} className="relative pl-10">
                                        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-green-100 flex items-center justify-center text-xs font-bold text-green-600 shadow-sm z-10">
                                            {index + 1}
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                                            {item.presenter && (
                                                <p className="text-xs text-gray-500 mt-1 flex items-center">
                                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                                                    Default Speaker: <span className="font-medium ml-1">{item.presenter}</span>
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Action */}
            <div className="p-4 bg-white border-t border-gray-200 z-10">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => setIsRegistered(true)}
                        disabled={isRegistered}
                        className={`w-full flex justify-center items-center space-x-3 py-4 px-6 font-bold text-lg rounded-xl shadow-lg transition-all transform active:scale-95 ${isRegistered
                                ? 'bg-green-50 text-green-600 border border-green-200 shadow-none cursor-default'
                                : 'text-white bg-gray-900 hover:bg-black hover:shadow-xl'
                            }`}
                    >
                        {isRegistered ? <CheckCircleIcon className="w-6 h-6" /> : null}
                        <span>{isRegistered ? 'Registration Confirmed' : 'Register for Meeting'}</span>
                    </button>
                    {isRegistered && (
                        <p className="text-center text-xs text-gray-400 mt-2">
                            A confirmation email has been sent to your registered address.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PTAMeetingScreen;