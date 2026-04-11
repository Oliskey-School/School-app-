import React, { useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, MapPin, Check, X, HelpCircle, Download } from 'lucide-react';
import { CalendarService, SchoolEvent } from '../../lib/calendar-service';
import { useAuth } from '../../context/AuthContext';

const TYPE_COLORS = {
    Academic: 'bg-blue-100 text-blue-700 border-blue-200',
    Social: 'bg-purple-100 text-purple-700 border-purple-200',
    Exam: 'bg-red-100 text-red-700 border-red-200',
    Financial: 'bg-amber-100 text-amber-700 border-amber-200'
};

export const SmartCalendar: React.FC = () => {
    const { user, currentSchool } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadEvents = useCallback(async () => {
        if (!currentSchool?.id) return;
        const data = await CalendarService.getEvents(currentSchool.id);
        setEvents(data);
        setLoading(false);
    }, [currentSchool?.id]);

    // Real-time synchronization
    useAutoSync(['events', 'rsvps'], loadEvents);

    useEffect(() => {
        if (currentSchool) loadEvents();
    }, [currentSchool, loadEvents]);

    const handleRSVP = async (eventId: string, status: 'yes' | 'no' | 'maybe') => {
        if (!user) return;
        await CalendarService.rsvp(eventId, user.id, status);
        loadEvents(); // Reload to show updated count/status
    };

    if (loading) return <div>Loading calendar...</div>;

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">School Calendar</h2>
                <div className="bg-white p-2 rounded-xl shadow-sm border">
                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                </div>
            </div>

            <div className="space-y-4">
                {events.map((event) => {
                    const myRSVP = event.event_rsvps?.find((r: any) => r.parent_id === user?.id);
                    
                    return (
                        <motion.div 
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4"
                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${TYPE_COLORS[event.type as keyof typeof TYPE_COLORS]}`}>
                                        {event.type}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-900">{event.title}</h3>
                                    <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
                                        <MapPin className="w-4 h-4" />
                                        <span>{event.location}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-indigo-600 leading-none">
                                        {new Date(event.date).getDate()}
                                    </p>
                                    <p className="text-xs font-bold text-gray-400 uppercase">
                                        {new Date(event.date).toLocaleString('default', { month: 'short' })}
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 leading-relaxed">
                                {event.description}
                            </p>

                            {event.rsvp_enabled && (
                                <div className="pt-2 border-t border-gray-50">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Your RSVP</p>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleRSVP(event.id, 'yes')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${myRSVP?.status === 'yes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-gray-50 text-gray-500 hover:bg-emerald-50'}`}
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            YES
                                        </button>
                                        <button 
                                            onClick={() => handleRSVP(event.id, 'no')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${myRSVP?.status === 'no' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-gray-50 text-gray-500 hover:bg-red-50'}`}
                                        >
                                            <X className="w-3.5 h-3.5" />
                                            NO
                                        </button>
                                        <button 
                                            onClick={() => handleRSVP(event.id, 'maybe')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${myRSVP?.status === 'maybe' ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-gray-50 text-gray-500 hover:bg-amber-50'}`}
                                        >
                                            <HelpCircle className="w-3.5 h-3.5" />
                                            MAYBE
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={() => CalendarService.downloadICS(event)}
                                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-indigo-600 py-2 border-2 border-indigo-50 rounded-xl hover:bg-indigo-50 transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                ADD TO PHONE CALENDAR
                            </button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
