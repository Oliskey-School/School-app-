import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { Activity, ActivityCategory, ExtracurricularEvent } from '../../types';
import { ACTIVITY_CATEGORY_CONFIG, ChevronLeftIcon, ChevronRightIcon, StarIcon, TrophyIcon, UsersIcon, SparklesIcon } from '../../constants';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

type FilterType = 'All' | ActivityCategory;

const ExtracurricularsScreen: React.FC = () => {
    const { user } = useAuth();
    const [activeFilter, setActiveFilter] = useState<FilterType>('All');
    const [activities, setActivities] = useState<Activity[]>([]);
    const [signedUpActivities, setSignedUpActivities] = useState<Set<string>>(new Set());
    const [eventsByDate, setEventsByDate] = useState<{ [key: string]: ExtracurricularEvent[] }>({});
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);

    const fetchExtracurricularData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            // 1. Fetch joinable activities
            const allActivities = await api.getExtracurriculars();
            setActivities(allActivities);

            // 2. Fetch user's signed-up activities
            const myActivities = await api.getMyExtracurriculars();
            setSignedUpActivities(new Set(myActivities.map((p: any) => p.activity_id.toString())));

            // 3. Fetch real calendar events
            const events = await api.getExtracurricularEvents(user.school_id || '');

            if (events) {
                const mappedEvents = events.reduce((acc: any, event: any) => {
                    const dateKey = event.date.split('T')[0];
                    (acc[dateKey] = acc[dateKey] || []).push({
                        id: event.id,
                        title: event.title,
                        date: dateKey,
                        category: event.category || 'Club',
                        description: event.description
                    });
                    return acc;
                }, {} as { [key: string]: ExtracurricularEvent[] });
                setEventsByDate(mappedEvents);
            }
        } catch (error) {
            console.error("Error fetching extracurriculars:", error);
            toast.error("Failed to load extracurricular data.");
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.school_id]);

    // Real-time synchronization
    useAutoSync(['extracurriculars', 'events'], fetchExtracurricularData);

    useEffect(() => {
        fetchExtracurricularData();
    }, [fetchExtracurricularData]);

    const handleSignUpToggle = async (activityId: number) => {
        if (!user?.id) return;

        const isCurrentlySignedUp = signedUpActivities.has(activityId.toString());

        // Optimistic UI update
        setSignedUpActivities(prev => {
            const newSet = new Set(prev);
            isCurrentlySignedUp ? newSet.delete(activityId.toString()) : newSet.add(activityId.toString());
            return newSet;
        });

        try {
            if (isCurrentlySignedUp) {
                // Leave
                await api.leaveExtracurricular(activityId.toString());
                toast.success("Successfully left the activity.");
            } else {
                // Join
                await api.joinExtracurricular(activityId.toString());
                toast.success("Successfully signed up for the activity!");
            }
        } catch (error) {
            console.error("Error toggling sign up:", error);
            toast.error("Failed to update activity status.");
            // Revert optimistic update
            setSignedUpActivities(prev => {
                const newSet = new Set(prev);
                isCurrentlySignedUp ? newSet.add(activityId.toString()) : newSet.delete(activityId.toString());
                return newSet;
            });
        }
    };

    const filteredActivities = useMemo(() => {
        if (activeFilter === 'All') return activities;
        return activities.filter(a => a.category === activeFilter);
    }, [activeFilter, activities]);

    const getIcon = (iconName: string) => {
        switch (iconName?.toLowerCase()) {
            case 'trophy': return TrophyIcon;
            case 'star': return StarIcon;
            case 'users': return UsersIcon;
            case 'sparkles': return SparklesIcon;
            default: return UsersIcon;
        }
    };

    // Calendar Logic
    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
    const startingDayIndex = firstDayOfMonth.getDay();

    const selectedDateEvents = useMemo(() => {
        const dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        return eventsByDate[dateKey] || [];
    }, [selectedDate, eventsByDate]);

    const goToPreviousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const goToNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity List Section */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 mb-3">Join an Activity</h2>
                            <div className="flex space-x-2 mb-4">
                                {(['All', 'Club', 'Sport', 'Cultural'] as FilterType[]).map(filter => (
                                    <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-1.5 text-sm font-semibold rounded-full flex-shrink-0 transition-colors ${activeFilter === filter ? 'bg-orange-500 text-white shadow' : 'bg-white text-gray-700 hover:bg-orange-100'}`}>
                                        {filter}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredActivities.map(activity => {
                                    const isSignedUp = signedUpActivities.has(activity.id.toString()) || signedUpActivities.has(activity.id as any);
                                    const config = ACTIVITY_CATEGORY_CONFIG[activity.category] || ACTIVITY_CATEGORY_CONFIG.Club;
                                    const Icon = typeof activity.icon === 'string' ? getIcon(activity.icon) : (activity.icon || UsersIcon);
                                    return (
                                        <div key={activity.id} className={`p-4 rounded-xl shadow-sm border-l-4 ${config.bg} ${config.color.replace('text-', 'border-')}`}>
                                            <div className="flex items-start space-x-3">
                                                <div className={`p-2 rounded-lg ${config.bg}`}>
                                                    <Icon className={`w-6 h-6 ${config.color}`} />
                                                </div>
                                                <div className="flex-grow">
                                                    <h3 className={`font-bold ${config.color}`}>{activity.name}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleSignUpToggle(activity.id)} className={`w-full mt-4 py-2 text-sm font-bold rounded-lg transition-colors ${isSignedUp ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                                                {isSignedUp ? 'Leave' : 'Sign Up'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Calendar Section */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-gray-800">Events Calendar</h2>
                        <div className="bg-white rounded-xl shadow-sm p-4">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeftIcon className="h-5 w-5 text-gray-600" /></button>
                                <h3 className="font-bold text-lg text-gray-800">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                                <button onClick={goToNextMonth} className="p-2 rounded-full hover:bg-gray-100"><ChevronRightIcon /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 mb-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => <div key={day}>{day}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`e-${i}`} />)}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                    const dateKey = date.toISOString().split('T')[0];
                                    const dayEvents = eventsByDate[dateKey] || [];
                                    const isSelected = isSameDay(date, selectedDate);
                                    return (
                                        <div key={day} className="flex flex-col items-center">
                                            <button onClick={() => setSelectedDate(date)} className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors ${isSelected ? 'bg-orange-500 text-white font-bold' : 'hover:bg-gray-100 text-gray-700'}`}>
                                                {day}
                                            </button>
                                            <div className="flex space-x-0.5 mt-1 h-2">
                                                {dayEvents.slice(0, 3).map(event => (
                                                    <div key={event.id} className={`w-1.5 h-1.5 rounded-full ${ACTIVITY_CATEGORY_CONFIG[event.category].dot}`}></div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {selectedDateEvents.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="font-bold text-gray-800 mb-3">Events on {selectedDate.toLocaleDateString('default', { month: 'long', day: 'numeric' })}</h3>
                                <ul className="space-y-2">
                                    {selectedDateEvents.map(event => {
                                        const config = ACTIVITY_CATEGORY_CONFIG[event.category];
                                        return (
                                            <li key={event.id} className="flex items-center space-x-3">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`}></div>
                                                <p className={`font-semibold text-sm ${config.color}`}>{event.title}</p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ExtracurricularsScreen;
