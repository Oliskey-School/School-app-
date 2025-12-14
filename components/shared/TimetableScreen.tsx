import React, { useState, useMemo, useEffect } from 'react';
import { SUBJECT_COLORS } from '../../constants';
import { TimetableEntry } from '../../types';
import { supabase } from '../../lib/supabase';

const formatTime12Hour = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${minutes} ${ampm}`;
};

const PERIODS = [
    { name: 'Period 1', start: '09:00', end: '09:45' },
    { name: 'Period 2', start: '09:45', end: '10:30' },
    { name: 'Period 3', start: '10:30', end: '11:15' },
    { name: 'Short Break', start: '11:15', end: '11:30', isBreak: true },
    { name: 'Period 4', start: '11:30', end: '12:15' },
    { name: 'Period 5', start: '12:15', end: '13:00' },
    { name: 'Long Break', start: '13:00', end: '13:45', isBreak: true },
    { name: 'Period 6', start: '13:45', end: '14:30' },
    { name: 'Period 7', start: '14:30', end: '15:15' },
    { name: 'Period 8', start: '15:15', end: '16:00' },
];

const daysOfWeek: TimetableEntry['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

interface TimetableScreenProps {
    context: {
        userType: 'teacher' | 'student';
        userId: number;
    }
}

const TimetableScreen: React.FC<TimetableScreenProps> = ({ context }) => {
    const [viewMode, setViewMode] = useState<'week' | 'day'>('day'); // Default to day view on mobile generally better
    const [selectedDay, setSelectedDay] = useState<TimetableEntry['day']>(daysOfWeek[(new Date().getDay() - 1)] || 'Monday');
    const [timetableData, setTimetableData] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const themeColor = context.userType === 'student' ? 'orange' : 'purple';

    useEffect(() => {
        // Auto-switch to day view on small screens nicely, but let's stick to state default or user choice
        if (window.innerWidth < 768) {
            setViewMode('day');
        } else {
            setViewMode('week');
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                if (context.userType === 'student') {
                    const { data: student } = await supabase
                        .from('students')
                        .select('grade, section')
                        .eq('id', context.userId)
                        .single();

                    if (student) {
                        const classPattern = `${student.grade}${student.section}`;
                        const { data } = await supabase
                            .from('timetable')
                            .select('*')
                            .ilike('class_name', `%${classPattern}%`)
                            .eq('status', 'Published'); // Only show published timetables

                        if (data) {
                            setTimetableData(data.map((d: any) => ({
                                day: d.day,
                                startTime: d.start_time,
                                endTime: d.end_time,
                                subject: d.subject,
                                className: d.class_name
                            })));
                        }
                    }
                } else if (context.userType === 'teacher') {
                    const { data } = await supabase
                        .from('timetable')
                        .select('*')
                        .eq('teacher_id', context.userId)
                        .eq('status', 'Published'); // Only show published timetables

                    if (data) {
                        setTimetableData(data.map((d: any) => ({
                            day: d.day,
                            startTime: d.start_time,
                            endTime: d.end_time,
                            subject: d.subject,
                            className: d.class_name
                        })));
                    }
                }
            } catch (err) {
                console.error('Error fetching timetable:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [context]);


    const timetableGrid = useMemo(() => {
        const grid: { [key: string]: TimetableEntry } = {};
        timetableData.forEach(entry => {
            grid[`${entry.day}-${entry.startTime}`] = entry;
        });
        return grid;
    }, [timetableData]);

    const renderWeekView = () => (
        <div className="overflow-auto h-full bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="min-w-[1000px] pb-4">
                {/* Header Row */}
                <div className="grid bg-gray-50 border-b border-gray-200 sticky top-0 z-20" style={{ gridTemplateColumns: `80px repeat(${PERIODS.length}, 1fr)` }}>
                    <div className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center flex items-center justify-center border-r border-gray-200">
                        Day
                    </div>
                    {PERIODS.map((period, idx) => (
                        <div key={idx} className={`p-2 text-center border-r border-gray-100 last:border-0 ${period.isBreak ? 'bg-gray-100/50' : ''}`}>
                            <div className="text-xs font-bold text-gray-700">{period.name}</div>
                            <div className="text-[10px] text-gray-500 font-medium mt-1">
                                {formatTime12Hour(period.start)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Body Rows */}
                {daysOfWeek.map((day) => (
                    <div key={day} className="grid border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors" style={{ gridTemplateColumns: `80px repeat(${PERIODS.length}, 1fr)` }}>
                        <div className="p-3 text-sm font-bold text-gray-600 flex items-center justify-center border-r border-gray-200 bg-white sticky left-0 z-10">
                            {day.substring(0, 3)}
                        </div>
                        {PERIODS.map((period, idx) => {
                            const key = `${day}-${period.start}`;
                            const entry = timetableGrid[key];

                            if (period.isBreak) {
                                return <div key={idx} className="bg-gray-100/30 border-r border-gray-100 h-24 flex items-center justify-center">
                                    <span className="text-[10px] text-gray-400 rotate-90 font-medium uppercase tracking-widest">{period.name}</span>
                                </div>;
                            }

                            if (!entry) {
                                return <div key={idx} className="border-r border-gray-100 h-24"></div>;
                            }

                            const colorClass = SUBJECT_COLORS[entry.subject] || 'bg-gray-100 text-gray-600 border-gray-200';
                            // Extract bg color for a softer look
                            const bgOnly = colorClass.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-100';
                            const textOnly = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-gray-600';
                            const borderOnly = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-gray-200';

                            return (
                                <div key={idx} className="p-1 border-r border-gray-100 h-24">
                                    <div className={`w-full h-full rounded-lg ${bgOnly} ${textOnly} border ${borderOnly} p-2 flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow cursor-default`}>
                                        <span className="font-bold text-xs line-clamp-2 leading-tight">{entry.subject}</span>
                                        <span className="text-[10px] opacity-75 mt-1">{formatTime12Hour(entry.startTime)}</span>
                                        {context.userType === 'teacher' && <span className="text-[10px] font-medium mt-auto bg-white/30 rounded px-1 w-max">{entry.className}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderMobileTimelineView = () => {
        const dayEntries = timetableData.filter(e => e.day === selectedDay);

        // Helper to get minutes from 9:00 AM
        const getMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return (h * 60 + m) - (9 * 60); // 9:00 AM is 0
        };

        const START_HOUR = 9;
        const END_HOUR = 16;
        const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 7 hours
        const PIXELS_PER_MINUTE = 1.8; // Adjust for height, taller is better for details

        const timeSlots = [];
        for (let i = START_HOUR; i <= END_HOUR; i++) {
            timeSlots.push(i);
        }

        return (
            <div className="flex flex-col h-full bg-white/50">
                {/* Day Selector */}
                <div className="flex overflow-x-auto pb-4 pt-2 px-2 hide-scrollbar snap-x space-x-3 mb-2">
                    {daysOfWeek.map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${selectedDay === day
                                ? `bg-gradient-to-r from-${themeColor}-500 to-${themeColor}-600 text-white shadow-${themeColor}-200 scale-105`
                                : 'bg-white text-gray-500 border border-gray-200'}`}
                        >
                            {day}
                        </button>
                    ))}
                </div>

                {/* Timeline Container */}
                <div className="relative flex-1 overflow-y-auto bg-white rounded-t-3xl shadow-inner border-t border-gray-100">
                    <div className="absolute top-0 left-0 right-0 min-h-full" style={{ height: TOTAL_MINUTES * PIXELS_PER_MINUTE + 50 }}>
                        {/* Time Grid Lines */}
                        {timeSlots.map((hour) => (
                            <div key={hour} className="absolute w-full px-4 flex items-center" style={{ top: (hour - 9) * 60 * PIXELS_PER_MINUTE }}>
                                <div className="w-16 text-xs font-semibold text-gray-400 -mt-3 text-right pr-3">
                                    {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                                </div>
                                <div className="flex-1 h-px bg-gray-100"></div>
                            </div>
                        ))}

                        {/* Current Time Indicator (Visual Polish) */}
                        {/* Static position for demo, typically calculated dynamically */}
                        {(() => {
                            const now = new Date();
                            const currentMinutes = (now.getHours() * 60 + now.getMinutes()) - (9 * 60);
                            if (currentMinutes > 0 && currentMinutes < TOTAL_MINUTES && daysOfWeek[now.getDay() - 1] === selectedDay) {
                                return (
                                    <div className="absolute w-full flex items-center z-20 pointer-events-none" style={{ top: currentMinutes * PIXELS_PER_MINUTE }}>
                                        <div className={`w-3 h-3 rounded-full bg-${themeColor}-500 ml-[60px] shadow border border-white`}></div>
                                        <div className={`flex-1 h-0.5 bg-${themeColor}-500`}></div>
                                    </div>
                                )
                            }
                            return null;
                        })()}

                        {/* Events */}
                        <div className="ml-[70px] mr-4 relative h-full">
                            {/* Breaks */}
                            {PERIODS.filter(p => p.isBreak).map((brk, idx) => (
                                <div key={`break-${idx}`}
                                    className="absolute w-full flex items-center justify-center rounded-lg bg-gray-50/50 border border-transparent border-dashed border-gray-300"
                                    style={{
                                        top: getMinutes(brk.start) * PIXELS_PER_MINUTE,
                                        height: (getMinutes(brk.end) - getMinutes(brk.start)) * PIXELS_PER_MINUTE - 2 // Gap
                                    }}
                                >
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{brk.name}</span>
                                </div>
                            ))}

                            {/* Classes */}
                            {dayEntries.map((entry, idx) => {
                                const top = getMinutes(entry.startTime) * PIXELS_PER_MINUTE;
                                const height = (getMinutes(entry.endTime) - getMinutes(entry.startTime)) * PIXELS_PER_MINUTE;
                                const colorClass = SUBJECT_COLORS[entry.subject] || 'bg-blue-100 text-blue-800 border-blue-200';

                                return (
                                    <div
                                        key={idx}
                                        className={`absolute w-full rounded-2xl p-3 shadow-sm border-l-4 transition-transform active:scale-[0.99] overflow-hidden ${colorClass}`}
                                        style={{ top: top, height: height - 4 }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-sm leading-tight">{entry.subject}</h3>
                                                <p className="text-xs opacity-80 mt-1">{formatTime12Hour(entry.startTime)} - {formatTime12Hour(entry.endTime)}</p>
                                            </div>
                                            {context.userType === 'teacher' && (
                                                <span className="bg-white/40 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm">
                                                    {entry.className}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {dayEntries.length === 0 && (
                                <div className="absolute top-20 left-0 right-0 text-center p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <p className="text-gray-400 font-medium">No classes scheduled</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return (
        <div className="flex items-center justify-center h-full bg-white/50">
            <div className={`animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-${themeColor}-500`}></div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-t-3xl overflow-hidden">
            {/* Control Bar */}
            <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                <h2 className="text-lg font-bold text-gray-800">Timetable</h2>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('day')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'day'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Day
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'week'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Week
                    </button>
                </div>
            </div>

            <main className="flex-grow overflow-hidden relative">
                {viewMode === 'week' ? renderWeekView() : renderMobileTimelineView()}
            </main>
        </div>
    );
};

export default TimetableScreen;
