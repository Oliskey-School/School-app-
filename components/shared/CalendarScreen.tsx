

import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, EVENT_TYPE_CONFIG, CakeIcon } from '../../constants';
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
    // Start with a fixed date for consistent demo data viewing
    const [currentDate, setCurrentDate] = useState(new Date('2024-08-01T12:00:00Z'));
    const [selectedDate, setSelectedDate] = useState(new Date('2024-08-10T12:00:00Z'));

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
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-6 overflow-y-auto">
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100" aria-label="Previous month">
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <h3 className="font-bold text-lg text-gray-800">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h3>
                        <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100" aria-label="Next month">
                            <ChevronRightIcon />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startingDayIndex }).map((_, index) => <div key={`empty-${index}`} />)}
                        
                        {daysInMonth.map(day => {
                            const dateKey = day.toISOString().split('T')[0];
                            const dayEvents = eventsByDate.get(dateKey) || [];
                            const dayBirthdays = birthdaysByDate.get(dateKey) || [];
                            const isToday = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, selectedDate);
                            
                            return (
                                <div key={day.toString()} className="flex flex-col items-center">
                                    <button 
                                      onClick={() => setSelectedDate(day)}
                                      className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors duration-150
                                        ${isSelected ? 'bg-sky-500 text-white font-bold' : isToday ? 'bg-sky-100 text-sky-800' : 'hover:bg-gray-100 text-gray-700'}`}
                                    >
                                        {day.getDate()}
                                    </button>
                                    <div className="flex space-x-0.5 mt-1 h-2">
                                        {dayBirthdays.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-pink-500" title={dayBirthdays.map(b => b.label).join(', ')}></div>}
                                        {dayEvents.slice(0, dayBirthdays.length > 0 ? 2 : 3).map(event => {
                                            const config = EVENT_TYPE_CONFIG[event.type];
                                            return <div key={event.id} className={`w-1.5 h-1.5 rounded-full ${config.bg.replace('bg-', 'bg-')}`}></div>;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                 <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 px-1">
                        Schedule for {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                    </h3>
                    
                    {selectedDateEvents.length === 0 && selectedDateBirthdays.length === 0 ? (
                        <div className="bg-white rounded-lg p-6 text-center text-gray-500">
                            <p>No scheduled events for this day.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {selectedDateBirthdays.map((bday, index) => (
                                <div key={`bday-${index}`} className="bg-white rounded-xl shadow-sm p-4 flex items-center space-x-3 border-l-4 border-pink-400">
                                    <div className="p-2 bg-pink-100 rounded-lg">
                                        <CakeIcon className="w-5 h-5 text-pink-600"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{bday.label}</p>
                                    </div>
                                </div>
                            ))}
                            {selectedDateEvents.map(event => {
                                const config = EVENT_TYPE_CONFIG[event.type];
                                const Icon = config.icon;
                                const borderColor = config.bg.replace('bg-', 'border-').replace('-100', '-400');
                                
                                return (
                                    <article key={event.id} className={`bg-white rounded-xl shadow-sm p-4 flex space-x-4 border-l-4 ${borderColor}`}>
                                        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${config.bg}`}>
                                            <Icon className={`w-6 h-6 ${config.color}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{event.title}</h4>
                                            <p className="text-sm text-gray-600">{event.description || event.type}</p>
                                        </div>
                                    </article>
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
