import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Teacher, AppointmentSlot, Student } from '../../types';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, CheckCircleIcon, CalendarIcon, UserIcon, StudentNavIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';

// Inline mock data to guarantee availability
const mockAppointmentSlots: AppointmentSlot[] = [
    { time: '08:00 AM', isBooked: false },
    { time: '08:30 AM', isBooked: true },
    { time: '09:00 AM', isBooked: false },
    { time: '09:30 AM', isBooked: false },
    { time: '10:00 AM', isBooked: false },
    { time: '10:30 AM', isBooked: true },
    { time: '11:00 AM', isBooked: false },
    { time: '11:30 AM', isBooked: false },
    { time: '01:00 PM', isBooked: false },
    { time: '01:30 PM', isBooked: false },
    { time: '02:00 PM', isBooked: false },
    { time: '02:30 PM', isBooked: false },
];

interface AppointmentScreenProps {
    parentId?: string | null;
    students: Student[];
    navigateTo: (view: string, title: string, props?: any) => void;
}

const AppointmentScreen: React.FC<AppointmentScreenProps> = ({ parentId, students, navigateTo }) => {
    const { currentSchool } = useAuth();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [isBooked, setIsBooked] = useState(false);
    const [isBooking, setIsBooking] = useState(false);

    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);

    useEffect(() => {
        const fetchTeachers = async () => {
            // 1. Get School ID from Students prop (safest as it's already scoped to parent)
            const studentSchoolId = students.length > 0 ? students[0].schoolId : currentSchool?.id;

            if (!studentSchoolId) {
                console.warn("No school ID found for teacher fetch");
                setLoadingTeachers(false);
                return;
            }

            const { data, error } = await supabase
                .from('teachers')
                .select('*')
                .eq('school_id', studentSchoolId) // Scope to school
                .eq('status', 'Active');

            if (data) {
                const mapTeacher = (t: any) => ({
                    id: t.id,
                    user_id: t.user_id, // Ensure user_id is mapped
                    name: t.name,
                    avatarUrl: t.avatar_url,
                    subjects: [], // Fetch or mock subjects if needed
                    classes: [],
                    status: t.status,
                    bio: '',
                    email: t.email || '',
                    phone: t.phone || ''
                } as Teacher);


                const mappedTeachers = data
                    .filter((t: any) => t.user_id) // Only allow teachers with a linked user account
                    .map(mapTeacher);
                setTeachers(mappedTeachers);
            }
            setLoadingTeachers(false);
        };

        fetchTeachers();

        // Real-time subscription
        const subscription = supabase
            .channel('public:teachers_appointment')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newTeacher = payload.new as any;
                    if (newTeacher.status === 'Active') {
                        setTeachers(prev => {
                            if (prev.find(t => t.id === newTeacher.id)) return prev;
                            return [...prev, {
                                id: newTeacher.id,
                                name: newTeacher.name,
                                avatarUrl: newTeacher.avatar_url,
                                subjects: [],
                                classes: [],
                                status: newTeacher.status,
                                bio: '',
                                email: newTeacher.email || '',
                                phone: newTeacher.phone || ''
                            } as Teacher];
                        });
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const updatedTeacher = payload.new as any;
                    setTeachers(prev => {
                        // If status is not Active, remove it
                        if (updatedTeacher.status !== 'Active') {
                            return prev.filter(t => t.id !== updatedTeacher.id);
                        }
                        // If it IS Active, add or update it
                        const existingIndex = prev.findIndex(t => t.id === updatedTeacher.id);
                        if (existingIndex > -1) {
                            const newPrev = [...prev];
                            newPrev[existingIndex] = {
                                ...newPrev[existingIndex],
                                name: updatedTeacher.name,
                                avatarUrl: updatedTeacher.avatar_url,
                                status: updatedTeacher.status,
                                email: updatedTeacher.email,
                                phone: updatedTeacher.phone
                            };
                            return newPrev;
                        } else {
                            // Was not in list (maybe was inactive before), add it
                            return [...prev, {
                                id: updatedTeacher.id,
                                user_id: updatedTeacher.user_id,
                                name: updatedTeacher.name,
                                avatarUrl: updatedTeacher.avatar_url,
                                subjects: [],
                                classes: [],
                                status: updatedTeacher.status,
                                bio: '',
                                email: updatedTeacher.email || '',
                                phone: updatedTeacher.phone || ''
                            } as Teacher];
                        }
                    });
                } else if (payload.eventType === 'DELETE') {
                    const deletedTeacher = payload.old as any;
                    setTeachers(prev => prev.filter(t => t.id !== deletedTeacher.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const activeTeachers = teachers;

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

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !selectedTeacher || !selectedSlot || !reason) {
            toast.error("Please select a student, teacher, time slot, and provide a reason.");
            return;
        }

        if (!parentId || !currentSchool?.id) {
            toast.error("You must be logged in as a parent to book appointments.");
            return;
        }

        setIsBooking(true);
        try {
            // Parse time (e.g., "08:00 AM")
            const [time, modifier] = selectedSlot.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours < 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;

            const startsAt = new Date(selectedDate);
            startsAt.setHours(hours, minutes, 0, 0);

            const endsAt = new Date(startsAt);
            endsAt.setMinutes(startsAt.getMinutes() + 30);

            const appointmentData = await api.createAppointment({
                requested_by_parent_id: parentId,
                staff_user_id: selectedTeacher.user_id,
                teacher_id: selectedTeacher.id,
                student_user_id: selectedStudent.user_id,
                staff_type: 'teacher',
                starts_at: startsAt.toISOString(),
                ends_at: endsAt.toISOString(),
                reason: reason,
            });

            console.log("Booking Payload:", {
                school_id: currentSchool.id,
                requested_by_parent_id: parentId,
                staff_user_id: selectedTeacher.user_id,
                teacher_id: selectedTeacher.id,
                student_user_id: selectedStudent.user_id,
                staff_type: 'teacher',
                starts_at: startsAt.toISOString(),
                ends_at: endsAt.toISOString(),
                reason: reason,
                status: 'Pending'
            });

            // api.createAppointment throws on error, so if we got here it succeeded

            // Trigger Notification for Teacher
            if (selectedTeacher.user_id) {
                try {
                    await api.createNotification({
                        recipient_type: 'teacher',
                        recipient_id: selectedTeacher.user_id,
                        title: 'New Appointment Request',
                        message: `Parent of ${selectedStudent.name} has requested an appointment for ${startsAt.toLocaleDateString()}.`,
                        metadata: {
                            appointmentId: appointmentData?.id,
                            studentId: selectedStudent.id,
                            parentId: parentId
                        }
                    });
                } catch (notifError) {
                    console.error("Failed to send notification:", notifError);
                    // Don't block success UI if notification fails
                }
            }
            setIsBooked(true);

        } catch (err) {
            console.error("Booking error:", err);
            toast.error("Failed to book appointment. Please try again.");
        } finally {
            setIsBooking(false);
        }
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
                            {selectedTeacher?.avatarUrl ? (
                                <img
                                    src={selectedTeacher?.avatarUrl}
                                    alt={selectedTeacher?.name}
                                    className="w-10 h-10 rounded-full object-cover mr-3 border border-white shadow-sm"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3 border border-white shadow-sm text-green-700 font-bold">
                                    {selectedTeacher?.name?.charAt(0)}
                                </div>
                            )}
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

                    {/* Step 1: Student Selection */}
                    <section>
                        <div className="flex items-center mb-4">
                            <span className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold mr-3 text-sm">1</span>
                            <h2 className="text-xl font-bold text-gray-800">Select Student</h2>
                        </div>

                        <div className="flex space-x-4 overflow-x-auto pb-4 px-2 -mx-2 no-scrollbar">
                            {students.map(student => (
                                <button
                                    key={student.id}
                                    onClick={() => setSelectedStudent(student)}
                                    className={`flex-none w-40 p-4 rounded-2xl border transition-all duration-300 text-center relative group ${selectedStudent?.id === student.id
                                        ? 'bg-white border-sky-500 ring-2 ring-sky-200 shadow-lg scale-105'
                                        : 'bg-white border-gray-200 hover:border-sky-300 hover:shadow-md'
                                        }`}
                                >
                                    <div className="relative inline-block mb-3">
                                        {student.avatarUrl ? (
                                            <img
                                                src={student.avatarUrl}
                                                alt={student.name}
                                                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-sky-100 flex items-center justify-center border-2 border-white shadow-sm text-sky-600 font-bold text-xl">
                                                {student.name.charAt(0)}
                                            </div>
                                        )}
                                        {selectedStudent?.id === student.id && (
                                            <div className="absolute -bottom-1 -right-1 bg-sky-500 rounded-full p-1 border-2 border-white">
                                                <CheckCircleIcon className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{student.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1 truncate">Grade {student.grade}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Step 2: Teacher Selection */}
                    <div className={`transition-opacity duration-500 ${selectedStudent ? 'opacity-100' : 'opacity-40 pointer-events-none filter blur-sm'}`}>
                        <section>
                            <div className="flex items-center mb-4">
                                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3 text-sm">2</span>
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
                                            {teacher.avatarUrl ? (
                                                <img
                                                    src={teacher.avatarUrl}
                                                    alt={teacher.name}
                                                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-2 border-white shadow-sm text-green-600 font-bold text-xl">
                                                    {teacher.name.charAt(0)}
                                                </div>
                                            )}
                                            {selectedTeacher?.id === teacher.id && (
                                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                                                    <CheckCircleIcon className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-sm truncate">{teacher.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1 truncate">{teacher.subjects[0] || 'General'}</p>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Step 3 & 4 Combined Container */}
                    <div className={`transition-opacity duration-500 ${selectedTeacher ? 'opacity-100' : 'opacity-40 pointer-events-none filter blur-sm'}`}>
                        {/* Step 3: Date & Time */}
                        <section className="mb-8">
                            <div className="flex items-center mb-4">
                                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3 text-sm">3</span>
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
                                <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold mr-3 text-sm">4</span>
                                <h2 className="text-xl font-bold text-gray-800">Details</h2>
                            </div>
                            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={4}
                                    placeholder="Briefly describe what you'd like to discuss..."
                                    className="w-full p-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-100 text-gray-700 placeholder-gray-400 resize-none transition-shadow"
                                />
                                <div className="text-right mt-2 text-xs text-gray-400">{reason.length} / 500</div>

                                <button
                                    onClick={handleBooking}
                                    disabled={isBooking || !selectedStudent || !selectedTeacher || !selectedSlot || !reason}
                                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-100 disabled:bg-gray-200 disabled:shadow-none disabled:text-gray-400 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] flex items-center justify-center space-x-2"
                                >
                                    <span>{isBooking ? 'Booking...' : 'Confirm Appointment'}</span>
                                    <ChevronRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AppointmentScreen;