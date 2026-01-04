import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { CalendarIcon, ClockIcon, PlusIcon } from '../../constants';

interface TimetableSlot {
    id?: number;
    day_of_week: string;
    period_number: number;
    subject: string;
    class_name: string;
    room: string;
    start_time: string;
    end_time: string;
}

const TimetableManager: React.FC = () => {
    const { profile } = useProfile();
    const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
    const [loading, setLoading] = useState(true);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    useEffect(() => {
        fetchTimetable();
    }, []);

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) return;

            const { data, error } = await supabase
                .from('teacher_timetable')
                .select('*')
                .eq('teacher_id', teacherData.id);

            if (error) throw error;
            setTimetable(data || []);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSlot = (day: string, period: number) => {
        return timetable.find(t => t.day_of_week === day && t.period_number === period);
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">My Timetable</h2>
                <p className="text-sm text-gray-600 mt-1">View your weekly schedule</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Period</th>
                            {days.map(day => (
                                <th key={day} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">{day}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {periods.map(period => (
                            <tr key={period}>
                                <td className="px-4 py-3 font-medium text-gray-900">{period}</td>
                                {days.map(day => {
                                    const slot = getSlot(day, period);
                                    return (
                                        <td key={`${day}-${period}`} className="px-2 py-2">
                                            {slot ? (
                                                <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-xs">
                                                    <p className="font-semibold text-indigo-900">{slot.subject}</p>
                                                    <p className="text-indigo-700">{slot.class_name}</p>
                                                    <p className="text-indigo-600">{slot.room}</p>
                                                    <p className="text-indigo-500">{slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}</p>
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-gray-50 rounded text-xs text-gray-400 text-center">Free</div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TimetableManager;
