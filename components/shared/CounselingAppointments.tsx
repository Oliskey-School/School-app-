import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { CalendarIcon, CheckCircleIcon } from '../../constants';

interface Appointment {
    id: number;
    student_id: number;
    counselor_id: number;
    requested_date: string;
    confirmed_date: string | null;
    appointment_type: string;
    reason: string;
    status: string;
    student_name?: string;
}

const CounselingAppointments: React.FC = () => {
    const { profile } = useProfile();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [showBooking, setShowBooking] = useState(false);
    const [formData, setFormData] = useState({
        requested_date: '',
        appointment_type: 'Initial Consultation',
        reason: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('counseling_appointments')
                .select('*, students(full_name)')
                .eq('student_id', profile.id)
                .order('requested_date', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((a: any) => ({
                ...a,
                student_name: a.students?.full_name
            }));

            setAppointments(formatted);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('counseling_appointments').insert({
                student_id: profile.id,
                ...formData,
                status: 'Pending'
            });

            if (error) throw error;

            toast.success('Appointment request sent!');
            setShowBooking(false);
            setFormData({
                requested_date: '',
                appointment_type: 'Initial Consultation',
                reason: ''
            });
            fetchAppointments();
        } catch (error: any) {
            toast.error('Failed to book appointment');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Counseling Appointments</h2>
                    <p className="text-sm text-gray-600 mt-1">Book and manage your counseling sessions</p>
                </div>
                <button
                    onClick={() => setShowBooking(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    Book Appointment
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No appointments scheduled</p>
                    </div>
                ) : (
                    appointments.map((apt) => (
                        <div key={apt.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${apt.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                                                apt.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {apt.status}
                                        </span>
                                        <span className="text-sm text-gray-600">{apt.appointment_type}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-1">
                                        <strong>Date:</strong> {new Date(apt.requested_date).toLocaleDateString()}
                                    </p>
                                    {apt.reason && (
                                        <p className="text-sm text-gray-600 mt-2">{apt.reason}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showBooking && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Book Counseling Appointment</h3>
                        <form onSubmit={handleBooking} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.requested_date}
                                    onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Appointment Type *
                                </label>
                                <select
                                    value={formData.appointment_type}
                                    onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option>Initial Consultation</option>
                                    <option>Follow-up</option>
                                    <option>Crisis</option>
                                    <option>Parent Meeting</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Reason (Optional)
                                </label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    rows={3}
                                    placeholder="Brief description of what you'd like to discuss"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                ></textarea>
                            </div>

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowBooking(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                >
                                    Book Appointment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CounselingAppointments;
