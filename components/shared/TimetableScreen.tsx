

import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, SUBJECT_COLORS, ViewGridIcon, ViewDayIcon } from '../../constants';
import { mockTimetableData, mockStudents, mockTeachers } from '../../data';
import { TimetableEntry, Student, Teacher } from '../../types';

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
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [selectedDay, setSelectedDay] = useState<TimetableEntry['day']>(daysOfWeek[new Date().getDay() - 1] || 'Monday');
    
    const { filteredData, themeColor } = useMemo(() => {
        if (context.userType === 'student') {
            const student = mockStudents.find(s => s.id === context.userId);
            if (!student) return { filteredData: [], themeColor: 'orange' };
            const studentClass = `Grade ${student.grade}${student.section}`;
            return {
                filteredData: mockTimetableData.filter(entry => entry.className.includes(studentClass)),
                themeColor: 'orange'
            };
        }
        if (context.userType === 'teacher') {
            const teacher = mockTeachers.find(t => t.id === context.userId);
            if (!teacher) return { filteredData: [], themeColor: 'purple' };
            return {
                filteredData: mockTimetableData.filter(entry => teacher.classes.includes(entry.className.replace('Grade ','')) && teacher.subjects.includes(entry.subject)),
                themeColor: 'purple'
            };
        }
        return { filteredData: [], themeColor: 'gray' };
    }, [context]);
    
    const timetableGrid = useMemo(() => {
        const grid: { [key: string]: TimetableEntry } = {};
        filteredData.forEach(entry => {
            grid[`${entry.day}-${entry.startTime}`] = entry;
        });
        return grid;
    }, [filteredData]);

    const renderWeekView = () => (
        <div className="overflow-auto p-2">
            <div className="grid gap-1 min-w-[1200px]" style={{ gridTemplateColumns: `100px repeat(${PERIODS.length}, 1fr)`}}>
                {/* Top-left empty cell */}
                <div className="sticky top-0 left-0 bg-white z-30 border-b border-r border-gray-200"></div>
                
                {/* Period headers */}
                {PERIODS.map(period => (
                    <div key={period.name} className="text-center font-bold text-gray-600 text-sm py-2 sticky top-0 bg-white z-20 border-b border-gray-200">
                        {period.name}
                        <div className="font-normal text-xs text-gray-500">{formatTime12Hour(period.start)} - {formatTime12Hour(period.end)}</div>
                    </div>
                ))}
                
                {/* Rows for each day */}
                {daysOfWeek.map(day => (
                    <React.Fragment key={day}>
                        <div className="sticky left-0 bg-white z-10 font-bold text-gray-600 text-sm flex items-center justify-center p-2 border-r border-gray-200">{day}</div>
                        {PERIODS.map(period => {
                            const key = `${day}-${period.start}`;
                            const entry = timetableGrid[key];
                            
                            if (period.isBreak) {
                                return <div key={key} className="h-20 bg-gray-200 rounded-lg flex items-center justify-center font-semibold text-gray-500">{period.name}</div>;
                            }

                            if (!entry) {
                                return <div key={key} className="h-20 bg-white rounded-lg border border-gray-100"></div>;
                            }
                            
                            const colorClass = SUBJECT_COLORS[entry.subject] || 'bg-gray-200 text-gray-800';
                            return (
                                <div key={key} className={`h-20 p-1`}>
                                    <div className={`h-full w-full p-2 rounded-md flex flex-col justify-center text-white ${colorClass}`}>
                                        <p className="font-bold text-sm truncate">{entry.subject}</p>
                                        {context.userType === 'teacher' && <p className="text-xs truncate">{entry.className}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
    
    const renderDayView = () => {
        const dayEntries = filteredData
            .filter(e => e.day === selectedDay)
            .sort((a,b) => a.startTime.localeCompare(b.startTime));
        
        return (
            <div className="p-2 space-y-3">
                 <div className="flex space-x-1">
                    {daysOfWeek.map(day => (
                        <button key={day} onClick={() => setSelectedDay(day)} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${selectedDay === day ? `bg-${themeColor}-500 text-white shadow` : 'bg-white text-gray-600'}`}>
                            {day.substring(0,3)}
                        </button>
                    ))}
                </div>
                {dayEntries.length > 0 ? dayEntries.map((entry, i) => {
                     const colorClass = SUBJECT_COLORS[entry.subject] || 'bg-gray-200 text-gray-800';
                     const bgColorClass = colorClass.replace(/bg-\w+-\d+/, `bg-${themeColor}-50`);
                     const borderColorClass = colorClass.replace(/bg-\w+-\d+/, `border-${themeColor}-300`);
                     return (
                        <div key={`${selectedDay}-${i}`} className={`p-4 rounded-lg flex items-center space-x-4 shadow-sm ${bgColorClass} border-l-4 ${borderColorClass}`}>
                            <div className="text-center w-16 flex-shrink-0">
                                <p className="font-bold text-sm text-gray-800">{formatTime12Hour(entry.startTime)}</p>
                                <p className="text-xs text-gray-500">{formatTime12Hour(entry.endTime)}</p>
                            </div>
                            <div className={`w-1.5 h-12 rounded-full ${colorClass}`}></div>
                            <div>
                                <p className="font-bold text-gray-800">{entry.subject}</p>
                                {context.userType === 'teacher' && <p className="text-sm text-gray-600">{entry.className}</p>}
                            </div>
                        </div>
                     )
                }) : (
                     <div className="text-center py-10 bg-white rounded-lg">
                        <p className="font-semibold text-gray-500">No classes scheduled for {selectedDay}.</p>
                    </div>
                )}
            </div>
        )
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-t-3xl overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
                 <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    <button onClick={() => setViewMode('week')} className={`w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center space-x-2 transition-colors ${viewMode === 'week' ? `bg-white text-${themeColor}-600 shadow-sm` : 'text-gray-600'}`}>
                        <ViewGridIcon /><span>Week</span>
                    </button>
                    <button onClick={() => setViewMode('day')} className={`w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center space-x-2 transition-colors ${viewMode === 'day' ? `bg-white text-${themeColor}-600 shadow-sm` : 'text-gray-600'}`}>
                        <ViewDayIcon /><span>Day</span>
                    </button>
                </div>
            </div>

            <main className="flex-grow overflow-auto bg-gray-50">
                {viewMode === 'week' ? renderWeekView() : renderDayView()}
            </main>
        </div>
    );
};

export default TimetableScreen;
