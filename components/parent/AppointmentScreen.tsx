
import React, { useState, useMemo } from 'react';
import { Teacher, AppointmentSlot } from '../../types';
import { mockTeachers, mockAppointmentSlots } from '../../data';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, CheckCircleIcon } from '../../constants';

const AppointmentScreen: React.FC = () => {
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [isBooked, setIsBooked] = useState(false);

    const activeTeachers = useMemo(() => mockTeachers.filter(t => t.status === 'Active'), []);

    // In a real app, this would be an API call based on teacher and date
    const availableSlots = useMemo(() => {
        if (!selectedTeacher) return [];
        // Mocking: just return the same slots for any teacher/date for demo
        return mockAppointmentSlots;
    }, [selectedTeacher, selectedDate]);
    
    const handleBooking = (e: React.FormEvent) => {
        e.preventDefault();
        if(!selectedTeacher || !selectedSlot || !reason) {
            alert("Please select a teacher, time slot, and provide a reason.");
            return;
        }
        setIsBooked(true);
    };

    if(isBooked) {
        return (
            <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4"/>
                <h2 className="text-2xl font-bold text-gray-800">Appointment Booked!</h2>
                <p className="text-gray-600 mt-2">
                    Your appointment with <span className="font-semibold">{selectedTeacher?.name}</span> on <span className="font-semibold">{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span> at <span className="font-semibold">{selectedSlot}</span> has been confirmed.
                </p>
                <button onClick={() => { setIsBooked(false); setSelectedTeacher(null); setSelectedSlot(null); setReason('');}} className="mt-6 px-5 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-sm hover:bg-green-600">
                    Book Another
                </button>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <label htmlFor="teacher-select" className="font-bold text-gray-800">1. Select a Teacher</label>
                        <select 
                            id="teacher-select" 
                            value={selectedTeacher?.id || ''} 
                            onChange={e => setSelectedTeacher(mockTeachers.find(t => t.id === parseInt(e.target.value)) || null)}
                            className="mt-2 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900"
                        >
                            <option value="">-- Select Teacher --</option>
                            {activeTeachers.map(t => <option key={t.id} value={t.id}>{t.name} - {t.subjects.join(', ')}</option>)}
                        </select>
                    </div>

                    <div className="space-y-4">
                        {selectedTeacher && (
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <h3 className="font-bold text-gray-800 mb-3">2. Choose Date & Time</h3>
                                <p className="text-center font-semibold text-green-700 mb-4">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="grid grid-cols-3 gap-3">
                                    {availableSlots.map(slot => (
                                        <button
                                            key={slot.time}
                                            onClick={() => !slot.isBooked && setSelectedSlot(slot.time)}
                                            disabled={slot.isBooked}
                                            className={`py-3 px-2 text-sm font-semibold rounded-lg transition-colors ${
                                                slot.isBooked 
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                : selectedSlot === slot.time
                                                ? 'bg-green-500 text-white ring-2 ring-offset-2 ring-green-400'
                                                : 'bg-green-50 text-green-800 hover:bg-green-100'
                                            }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedSlot && (
                            <div className="bg-white p-4 rounded-xl shadow-sm">
                                <label htmlFor="reason" className="font-bold text-gray-800">3. Reason for Appointment</label>
                                <textarea 
                                    id="reason" 
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={4} 
                                    placeholder="Briefly describe the reason for your meeting..." 
                                    className="mt-2 w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 text-gray-900"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <div className="p-4 mt-auto bg-white border-t">
                <button 
                    onClick={handleBooking}
                    disabled={!selectedTeacher || !selectedSlot || !reason}
                    className="w-full py-3 px-4 font-medium text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Confirm Appointment
                </button>
            </div>
        </div>
    );
};

export default AppointmentScreen;