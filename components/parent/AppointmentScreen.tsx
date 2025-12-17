import React, { useState, useMemo } from 'react';
import { Teacher, AppointmentSlot } from '../../types';
import { mockTeachers, mockAppointmentSlots } from '../../data';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, CheckCircleIcon, CalendarIcon, UserIcon } from '../../constants';

const AppointmentScreen: React.FC = () => {
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [isBooked, setIsBooked] = useState(false);

    const activeTeachers = useMemo(() => mockTeachers.filter(t => t.status === 'Active'), []);

    // Generate next 7 days for the date picker
    const calendarDays = useMemo(() => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push(date);
        }
        return days;
    }, []);

    // In a real app, this would be an API call based on teacher and date
    const availableSlots = useMemo(() => {
        if (!selectedTeacher) return [];
        return mockAppointmentSlots;
    }, [selectedTeacher, selectedDate]);

    const handleBooking = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeacher || !selectedSlot || !reason) {
            alert("Please select a teacher, time slot, and provide a reason.");
            return;
        }
        setIsBooked(true);
    };

    if (isBooked) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-green-50 to-white text-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 transform transition-all animate-fade-in-up">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Confirmed!</h2>
                    <p className="text-gray-500 mb-8">Your appointment has been successfully scheduled.</p>

                    <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left border border-gray-100">
                        <div className="flex items-center mb-3 pb-3 border-b border-gray-200">
                            <img
                                src={selectedTeacher?.avatarUrl}
                                alt={selectedTeacher?.name}
                                className="w-10 h-10 rounded-full object-cover mr-3 border border-white shadow-sm"
                            />
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Teacher</p>
                                <p className="font-bold text-gray-800">{selectedTeacher?.name}</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold">Date</p>
                                <p className="font-bold text-gray-800 text-sm">{selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-semibold">Time</p>
                                <p className="font-bold text-green-600 text-sm">{selectedSlot}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => { setIsBooked(false); setSelectedTeacher(null); setSelectedSlot(null); setReason(''); }}
                        className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-transform transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Book Another Appointment
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Main Content Area */}
            <main className="flex-grow overflow-y-auto pb-24 no-scrollbar">
                <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">

                    {/* Step 1: Teacher Selection */}
                    <section>
                        <div className="flex items-center mb-4">
                            <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3 text-sm">1</span>
                            <h2 className="text-xl font-bold text-gray-800">Select Teacher</h2>
                        </div>

                        <div className="flex space-x-4 overflow-x-auto pb-4 px-2 -mx-2 no-scrollbar">
                            {activeTeachers.map(teacher => (
                                <button
                                    key={teacher.id}
                                    onClick={() => setSelectedTeacher(teacher)}
                                    className={`flex-none w-40 p-4 rounded-2xl border transition-all duration-300 text-center relative group ${selectedTeacher?.id === teacher.id
                                            ? 'bg-white border-green-500 ring-2 ring-green-200 shadow-lg scale-105'
                                            : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
                                        }`}
                                >
                                    <div className="relative inline-block mb-3">
                                        <img
                                            src={teacher.avatarUrl}
                                            alt={teacher.name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                        />
                                        {selectedTeacher?.id === teacher.id && (
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                                                <CheckCircleIcon className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{teacher.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 truncate">{teacher.subjects[0]}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Step 2 & 3 Combined Container */}
                    <div className={`transition-opacity duration-500 ${selectedTeacher ? 'opacity-100' : 'opacity-40 pointer-events-none filter blur-sm'}`}>
                        {/* Step 2: Date & Time */}
                        <section className="mb-8">
                            <div className="flex items-center mb-4">
                                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3 text-sm">2</span>
                                <h2 className="text-xl font-bold text-gray-800">Date & Time</h2>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                {/* Date Strip */}
                                <div className="flex justify-between items-center mb-6 overflow-x-auto pb-2 no-scrollbar">
                                    {calendarDays.map((date, idx) => {
                                        const isSelected = date.toDateString() === selectedDate.toDateString();
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedDate(date)}
                                                className={`flex flex-col items-center justify-center min-w-[3.5rem] py-3 rounded-xl transition-all ${isSelected
                                                        ? 'bg-green-600 text-white shadow-md transform scale-105'
                                                        : 'text-gray-500 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className="text-xs font-medium uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                <span className="text-lg font-bold mt-1">{date.getDate()}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-gray-100 w-full mb-6"></div>

                                {/* Time Slots */}
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                                    {availableSlots.map(slot => (
                                        <button
                                            key={slot.time}
                                            onClick={() => !slot.isBooked && setSelectedSlot(slot.time)}
                                            disabled={slot.isBooked}
                                            className={`py-2 px-3 text-sm font-semibold rounded-lg border transition-all ${slot.isBooked
                                                    ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed decoration-slice line-through'
                                                    : selectedSlot === slot.time
                                                        ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-600'
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {/* Step 3: Reason */}
                        <section>
                            <div className="flex items-center mb-4">
                                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3 text-sm">3</span>
                                <h2 className="text-xl font-bold text-gray-800">Details</h2>
                            </div>
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={4}
                                    placeholder="Briefly describe what you'd like to discuss..."
                                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-100 text-gray-700 placeholder-gray-400 resize-none transition-shadow"
                                />
                                <div className="text-right mt-2 text-xs text-gray-400">{reason.length} / 500</div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Bottom Sticky Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="hidden md:block">
                        <p className="text-xs text-gray-500 uppercase font-bold">Total</p>
                        <p className="text-gray-900 font-bold">1 Appointment</p>
                    </div>
                    <button
                        onClick={handleBooking}
                        disabled={!selectedTeacher || !selectedSlot || !reason}
                        className="w-full md:w-auto md:px-12 py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center"
                    >
                        <span>Confirm Appointment</span>
                        <ChevronRightIcon className="w-5 h-5 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AppointmentScreen;