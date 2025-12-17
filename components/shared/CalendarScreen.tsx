
import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, EVENT_TYPE_CONFIG, CakeIcon, CalendarIcon, ClockIcon } from '../../constants';
import { mockCalendarEvents } from '../../data';
import { CalendarEvent } from '../../types';

interface BirthdayHighlight {
    date: string; // YYYY-MM-DD
    label: string;
}

interface CalendarScreenProps {
    birthdayHighlights?: BirthdayHighlight[];
}

const CalendarScreen: React.FC<CalendarScreenProps> = ({ birthdayHighlights = [] }) => {
    // Start with a fixed date for consistently showing data in this demo
    // In a real app, use new Date()
    const [currentDate, setCurrentDate] = useState(new Date('2024-08-01T12:00:00Z'));
    const [selectedDate, setSelectedDate] = useState(new Date('2024-08-10T12:00:00Z'));
    const [direction, setDirection] = useState<'left' | 'right' | 'none'>('none');

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const lastDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

    const daysInMonth = useMemo(() => {
        const days = [];
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
        }
        return days;
    }, [lastDayOfMonth, currentDate]);

    const startingDayIndex = firstDayOfMonth.getDay();

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        mockCalendarEvents.forEach(event => {
            const dateKey = event.date;
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(event);
        });
        return map;
    }, []);

    const birthdaysByDate = useMemo(() => {
        const map = new Map<string, BirthdayHighlight[]>();
        if (birthdayHighlights) {
            birthdayHighlights.forEach(event => {
                const dateKey = event.date;
                if (!map.has(dateKey)) {
                    map.set(dateKey, []);
                }
                map.get(dateKey)!.push(event);
            });
        }
        return map;
    }, [birthdayHighlights]);

    const selectedDateEvents = useMemo(() => {
        const dateKey = selectedDate.toISOString().split('T')[0];
        return eventsByDate.get(dateKey) || [];
    }, [selectedDate, eventsByDate]);

    const selectedDateBirthdays = useMemo(() => {
        const dateKey = selectedDate.toISOString().split('T')[0];
        return birthdaysByDate.get(dateKey) || [];
    }, [selectedDate, birthdaysByDate]);

    const goToPreviousMonth = () => {
        setDirection('left');
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        setCurrentDate(newDate);
    };

    const goToNextMonth = () => {
        setDirection('right');
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        setCurrentDate(newDate);
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    };

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Animations Style */}
            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slide-in-left {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .calendar-grid-anim {
                    animation: ${direction === 'right' ? 'slide-in-right' : direction === 'left' ? 'slide-in-left' : 'none'} 0.3s ease-out;
                }
            `}</style>
            <main className="flex-grow p-4 md:p-6 space-y-8 overflow-y-auto no-scrollbar">

                {/* Calendar Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 p-6 border border-gray-100">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <button
                            onClick={goToPreviousMonth}
                            className="p-3 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-green-600 transition-colors"
                            aria-label="Previous month"
                        >
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <h3 className="font-extrabold text-xl text-gray-800 tracking-tight">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button
                            onClick={goToNextMonth}
                            className="p-3 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-green-600 transition-colors"
                            aria-label="Next month"
                        >
                            <ChevronRightIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 gap-1 mb-4">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <div key={day} className="text-center text-xs font-bold text-gray-300 uppercase tracking-widest">{day}</div>
                        ))}
                    </div>

                    {/* Month Grid */}
                    <div key={currentDate.toISOString()} className="grid grid-cols-7 gap-1 calendar-grid-anim">
                        {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}

                        {daysInMonth.map(day => {
                            const dateKey = day.toISOString().split('T')[0];
                            const dayEvents = eventsByDate.get(dateKey) || [];
                            const dayBirthdays = birthdaysByDate.get(dateKey) || [];
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);

                            const hasEvents = dayEvents.length > 0;
                            const hasBirthdays = dayBirthdays.length > 0;

                            return (
                                <div key={day.toString()} className="flex flex-col items-center py-1">
                                    <button
                                        onClick={() => setSelectedDate(day)}
                                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 relative
                                        ${isSelected
                                                ? 'bg-green-600 text-white shadow-lg shadow-green-200 scale-110 z-10'
                                                : isToday
                                                    ? 'bg-green-50 text-green-700 ring-2 ring-green-100'
                                                    : 'hover:bg-gray-50 text-gray-600'
                                            }`}
                                    >
                                        {day.getDate()}

                                        {/* Status Dots */}
                                        <div className="absolute -bottom-1 flex space-x-0.5">
                                            {hasBirthdays && (
                                                <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-pink-500'}`}></span>
                                            )}
                                            {hasEvents && !hasBirthdays && (
                                                <span className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-green-500'}`}></span>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Schedule Section */}
                <div>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h3 className="text-xl font-bold text-gray-800">
                            Schedule
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </span>
                        </h3>
                    </div>

                    {selectedDateEvents.length === 0 && selectedDateBirthdays.length === 0 ? (
                        <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 flex flex-col items-center">
                            <div className="bg-gray-50 p-4 rounded-full mb-4">
                                <CalendarIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <h4 className="font-bold text-gray-800 mb-1">No Events Scheduled</h4>
                            <p className="text-gray-400 text-sm">Enjoy your free time!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Birthdays */}
                            {selectedDateBirthdays.map((bday, index) => (
                                <div key={`bday-${index}`} className="group bg-gradient-to-r from-pink-50 to-white rounded-2xl p-5 border border-pink-100 shadow-sm flex items-center space-x-4 transition-transform hover:scale-[1.01]">
                                    <div className="p-3 bg-pink-500 text-white rounded-xl shadow-md shadow-pink-200">
                                        <CakeIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-pink-500 uppercase tracking-wide mb-0.5">Birthday</p>
                                        <p className="font-bold text-gray-800 text-lg">{bday.label}</p>
                                        <p className="text-sm text-gray-500">Don't forget to send wishes!</p>
                                    </div>
                                </div>
                            ))}

                            {/* Events timeline */}
                            {selectedDateEvents.map((event, idx) => {
                                const config = EVENT_TYPE_CONFIG[event.type];
                                const Icon = config.icon;

                                // Mock time for demo since it's not in the base type yet
                                const times = ['09:00 AM', '11:00 AM', '02:00 PM'];
                                const time = times[idx % times.length];

                                return (
                                    <div key={event.id} className="relative pl-6">
                                        {/* Timeline line */}
                                        {idx !== selectedDateEvents.length - 1 && (
                                            <div className="absolute left-6 top-8 bottom-[-16px] w-0.5 bg-gray-200"></div>
                                        )}

                                        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start group transition-all hover:shadow-md">
                                            {/* Time Column */}
                                            <div className="mr-5 min-w-[4rem] text-right hidden sm:block">
                                                <span className="block font-bold text-gray-800">{time.split(' ')[0]}</span>
                                                <span className="text-xs text-gray-400">{time.split(' ')[1]}</span>
                                            </div>

                                            {/* Icon */}
                                            <div className={`mr-4 p-3 rounded-xl flex-shrink-0 ${config.bg} ${config.color} group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-6 h-6" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-grow">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-lg text-gray-800 mb-1">{event.title}</h4>
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 mb-2">
                                                            {event.category || event.type}
                                                        </span>
                                                    </div>
                                                    <div className="sm:hidden text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                                        {time}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-600 leading-relaxed">{event.description || 'No additional details provided.'}</p>

                                                {/* Attendees or extra info could go here */}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default CalendarScreen;
