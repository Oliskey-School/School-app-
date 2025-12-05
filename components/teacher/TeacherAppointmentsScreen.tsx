import React, { useState, useMemo } from 'react';
import { Appointment } from '../../types';
import { mockAppointments, mockStudents, mockParents } from '../../data';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '../../constants';

const LOGGED_IN_TEACHER_ID = 2;

const AppointmentCard: React.FC<{
  appointment: Appointment;
  onUpdateStatus: (id: number, status: 'Confirmed' | 'Cancelled') => void;
}> = ({ appointment, onUpdateStatus }) => {
    const student = useMemo(() => mockStudents.find(s => s.id === appointment.studentId), [appointment.studentId]);
    const parent = useMemo(() => mockParents.find(p => p.id === appointment.parentId), [appointment.parentId]);

    if (!student || !parent) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <div className="flex items-start space-x-3">
                <img src={parent.avatarUrl} alt={parent.name} className="w-12 h-12 rounded-full object-cover"/>
                <div>
                    <p className="font-bold text-gray-800">{parent.name}</p>
                    <p className="text-sm text-gray-500">Parent of {student.name}</p>
                </div>
            </div>
            <p className="text-sm text-gray-700 italic border-l-4 border-purple-200 pl-3">"{appointment.reason}"</p>
            <div className="flex justify-between items-center text-sm font-semibold text-gray-700 pt-2 border-t">
                <span>{new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {appointment.time}</span>
                {appointment.status === 'Pending' ? (
                    <div className="flex space-x-2">
                        <button onClick={() => onUpdateStatus(appointment.id, 'Cancelled')} className="p-2 bg-red-100 rounded-full hover:bg-red-200"><XCircleIcon className="w-5 h-5 text-red-600"/></button>
                        <button onClick={() => onUpdateStatus(appointment.id, 'Confirmed')} className="p-2 bg-green-100 rounded-full hover:bg-green-200"><CheckCircleIcon className="w-5 h-5 text-green-600"/></button>
                    </div>
                ) : (
                    <span className={`px-2 py-1 text-xs rounded-full ${appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{appointment.status}</span>
                )}
            </div>
        </div>
    );
};

const TeacherAppointmentsScreen: React.FC = () => {
    const [appointments, setAppointments] = useState(mockAppointments);

    const teacherAppointments = useMemo(() => 
        appointments.filter(a => a.teacherId === LOGGED_IN_TEACHER_ID),
    [appointments]);

    const handleUpdateStatus = (id: number, status: 'Confirmed' | 'Cancelled') => {
        setAppointments(prev => prev.map(a => a.id === id ? {...a, status} : a));
        // Also update the mock data source
        const index = mockAppointments.findIndex(a => a.id === id);
        if (index > -1) {
            mockAppointments[index].status = status;
        }
    };

    const pending = teacherAppointments.filter(a => a.status === 'Pending');
    const confirmed = teacherAppointments.filter(a => a.status === 'Confirmed').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="p-4 space-y-6 bg-gray-100">
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center"><ClockIcon className="w-5 h-5 mr-2 text-amber-500"/>Pending Requests ({pending.length})</h3>
                <div className="space-y-3">
                    {pending.length > 0 ? pending.map(app => (
                        <AppointmentCard key={app.id} appointment={app} onUpdateStatus={handleUpdateStatus} />
                    )) : <p className="text-sm text-gray-500 bg-white p-4 rounded-xl text-center">No pending appointment requests.</p>}
                </div>
            </div>
             <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center"><CheckCircleIcon className="w-5 h-5 mr-2 text-green-500"/>Upcoming Appointments ({confirmed.length})</h3>
                 <div className="space-y-3">
                    {confirmed.length > 0 ? confirmed.map(app => (
                        <AppointmentCard key={app.id} appointment={app} onUpdateStatus={handleUpdateStatus} />
                    )) : <p className="text-sm text-gray-500 bg-white p-4 rounded-xl text-center">No upcoming appointments.</p>}
                </div>
            </div>
        </div>
    );
};

export default TeacherAppointmentsScreen;
