import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Appointment } from '../../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../../constants';
import { toast } from 'react-hot-toast';

interface TeacherAppointmentsScreenProps {
    teacherId: string;
}

const AppointmentCard: React.FC<{
    appointment: any; // using any for joined data convenience, or extend types
    onUpdateStatus: (id: string, status: 'Confirmed' | 'Cancelled') => void;
}> = ({ appointment, onUpdateStatus }) => {
    // With joined data, appointment.student and appointment.parent (or parents) should be available
    const studentName = appointment.students?.name || 'Unknown Student';
    const parentName = appointment.parents?.name || 'Unknown Parent';
    // If parent has avatar in DB, use it, else placeholder
    const parentAvatar = appointment.parents?.avatar_url || 'https://via.placeholder.com/150';

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-start space-x-3">
                <img src={parentAvatar} alt={parentName} className="w-12 h-12 rounded-full object-cover" />
                <div>
                    <p className="font-bold text-gray-800">{parentName}</p>
                    <p className="text-sm text-gray-500">Parent of {studentName}</p>
                </div>
            </div>
            <p className="text-sm text-gray-700 italic border-l-4 border-purple-200 pl-3">"{appointment.reason}"</p>
            <div className="flex justify-between items-center text-sm font-semibold text-gray-700 pt-2 border-t">
                <span>{new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {appointment.time}</span>
                {appointment.status === 'Pending' ? (
                    <div className="flex space-x-2">
                        <button onClick={() => onUpdateStatus(appointment.id, 'Cancelled')} className="p-2 bg-red-100 rounded-full hover:bg-red-200"><XCircleIcon className="w-5 h-5 text-red-600" /></button>
                        <button onClick={() => onUpdateStatus(appointment.id, 'Confirmed')} className="p-2 bg-green-100 rounded-full hover:bg-green-200"><CheckCircleIcon className="w-5 h-5 text-green-600" /></button>
                    </div>
                ) : (
                    <span className={`px-2 py-1 text-xs rounded-full ${appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{appointment.status}</span>
                )}
            </div>
        </div>
    );
};

const TeacherAppointmentsScreen: React.FC<TeacherAppointmentsScreenProps> = ({ teacherId }) => {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            // Join parents and students tables
            // Note: Ensure foreign keys in 'appointments' table are correctly named 'parent_id' and 'student_id'
            // and that Supabase can infer relationships. likely 'parents' and 'students'
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    students ( name ),
                    parents ( name, avatar_url )
                `)
                .eq('teacher_id', teacherId)
                .order('date', { ascending: true }); // show upcoming first

            if (error) throw error;
            setAppointments(data || []);
        } catch (error) {
            console.error('Error fetching appointments:', error);
            // toast.error("Failed to load appointments."); // suppress on mount
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (teacherId) {
            fetchAppointments();
        }

        // Realtime subscription
        const channel = supabase.channel('teacher_appointments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `teacher_id=eq.${teacherId}` }, () => {
                fetchAppointments();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [teacherId]);

    const handleUpdateStatus = async (id: string, status: 'Confirmed' | 'Cancelled') => {
        // Optimistic update
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Appointment ${status.toLowerCase()}`);
            fetchAppointments(); // Refresh to ensure sync
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error("Failed to update status.");
            fetchAppointments(); // Revert
        }
    };

    const pending = appointments.filter(a => a.status === 'Pending');
    const upcoming = appointments.filter(a => a.status === 'Confirmed');

    if (loading && appointments.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading appointments...</div>;
    }

    return (
        <div className="p-4 space-y-6 bg-gray-100 min-h-full">
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center"><ClockIcon className="w-5 h-5 mr-2 text-amber-500" />Pending Requests ({pending.length})</h3>
                <div className="space-y-3">
                    {pending.length > 0 ? pending.map(app => (
                        <AppointmentCard key={app.id} appointment={app} onUpdateStatus={handleUpdateStatus} />
                    )) : <p className="text-sm text-gray-500 bg-white p-4 rounded-xl text-center">No pending appointment requests.</p>}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center"><CheckCircleIcon className="w-5 h-5 mr-2 text-green-500" />Upcoming Appointments ({upcoming.length})</h3>
                <div className="space-y-3">
                    {upcoming.length > 0 ? upcoming.map(app => (
                        <AppointmentCard key={app.id} appointment={app} onUpdateStatus={handleUpdateStatus} />
                    )) : <p className="text-sm text-gray-500 bg-white p-4 rounded-xl text-center">No upcoming appointments.</p>}
                </div>
            </div>
        </div>
    );
};

export default TeacherAppointmentsScreen;
