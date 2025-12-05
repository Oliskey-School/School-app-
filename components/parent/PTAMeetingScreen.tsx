
import React, { useState } from 'react';
import { mockPtaMeetings } from '../../data';
import { CalendarIcon, ClockIcon, UsersIcon, CheckCircleIcon } from '../../constants';

const PTAMeetingScreen: React.FC = () => {
    const [isRegistered, setIsRegistered] = useState(false);
    const upcomingMeeting = mockPtaMeetings.find(m => !m.isPast);

    if (!upcomingMeeting) {
        return <div className="p-4 text-center">No upcoming PTA meetings scheduled.</div>;
    }
    
    const meetingDate = new Date(upcomingMeeting.date);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                    <UsersIcon className="h-10 w-10 mx-auto text-green-400 mb-2" />
                    <h3 className="font-bold text-lg text-green-800">Upcoming PTA Meeting</h3>
                    <p className="text-sm text-green-700">Stay involved in our school community.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl shadow-sm p-5">
                        <h2 className="text-xl font-bold text-gray-800">{upcomingMeeting.title}</h2>
                        <div className="flex items-center space-x-6 text-sm text-gray-600 mt-3">
                            <div className="flex items-center space-x-2">
                                <CalendarIcon className="w-5 h-5 text-green-500" />
                                <span>{meetingDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <ClockIcon className="w-5 h-5 text-green-500" />
                                <span>{upcomingMeeting.time}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-5">
                        <h3 className="font-bold text-gray-800 mb-3">Meeting Agenda</h3>
                        <ul className="space-y-3">
                            {upcomingMeeting.agenda.map((item, index) => (
                                <li key={index} className="flex items-start">
                                    <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700">{item.title}</p>
                                        <p className="text-xs text-gray-500">Presenter: {item.presenter}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </main>
            <div className="p-4 mt-auto bg-white border-t">
                <button 
                    onClick={() => setIsRegistered(true)} 
                    disabled={isRegistered}
                    className={`w-full flex justify-center items-center space-x-2 py-3 px-4 font-medium rounded-lg shadow-sm transition-colors ${
                        isRegistered 
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'text-white bg-green-500 hover:bg-green-600'
                    }`}
                >
                    {isRegistered ? <CheckCircleIcon className="w-5 h-5" /> : null}
                    <span>{isRegistered ? 'You are Registered' : 'Register to Attend'}</span>
                </button>
            </div>
        </div>
    );
};

export default PTAMeetingScreen;