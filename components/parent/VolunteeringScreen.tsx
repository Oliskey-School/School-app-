
import React, { useState } from 'react';
import { mockVolunteeringOpportunities, mockNotifications } from '../../data';
import { HelpingHandIcon } from '../../constants';

const VolunteeringScreen: React.FC = () => {
    const [signedUpEvents, setSignedUpEvents] = useState<Set<number>>(new Set());

    const handleSignUpToggle = (id: number, title: string) => {
        const newSet = new Set(signedUpEvents);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
            
            // This is a mock implementation. A real app would use a state management library or API calls.
            // Notify admin and student when a parent signs up.
            const studentId = 4; // Mock: Assume this parent is linked to student Fatima Bello
            const parentName = 'Mr. Adewale'; // Mock parent name

            // Notification for admin
            mockNotifications.unshift({
                id: Date.now(),
                category: 'Volunteering',
                title: 'New Volunteer Sign-up',
                summary: `${parentName} has signed up for "${title}".`,
                timestamp: new Date().toISOString(),
                isRead: false,
                audience: ['admin'],
                relatedId: id,
            });

            // Notification for student
             mockNotifications.unshift({
                id: Date.now() + 1,
                category: 'Volunteering',
                title: 'Your Parent Volunteered!',
                summary: `Your parent, ${parentName}, signed up for "${title}".`,
                timestamp: new Date().toISOString(),
                isRead: false,
                audience: ['student'],
                studentId: studentId,
                relatedId: id,
            });
        }
        setSignedUpEvents(newSet);
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full">
            <div className="bg-green-50 p-4 rounded-xl text-center border border-green-200">
                <HelpingHandIcon className="h-10 w-10 mx-auto text-green-400 mb-2" />
                <h3 className="font-bold text-lg text-green-800">Volunteer Opportunities</h3>
                <p className="text-sm text-green-700">Get involved and make a difference!</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockVolunteeringOpportunities.map(opp => {
                    const isSignedUp = signedUpEvents.has(opp.id);
                    const spotsLeft = opp.spotsAvailable - (opp.spotsFilled + (isSignedUp && !signedUpEvents.has(opp.id) ? 1 : 0));
                    const isFull = spotsLeft <= 0;
                    
                    return (
                        <div key={opp.id} className="bg-white rounded-xl shadow-sm p-4">
                            <h4 className="font-bold text-gray-800">{opp.title}</h4>
                            <p className="text-sm text-gray-500 font-medium mt-1">
                                {new Date(opp.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-sm text-gray-600 my-3">{opp.description}</p>
                            <div className="flex justify-between items-center">
                                <p className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                    {spotsLeft} SPOTS LEFT
                                </p>
                                <button 
                                    onClick={() => handleSignUpToggle(opp.id, opp.title)}
                                    disabled={isFull && !isSignedUp}
                                    className={`py-2 px-5 text-sm font-bold rounded-lg transition-colors ${
                                        isSignedUp
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                            : isFull
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                : 'bg-green-500 text-white hover:bg-green-600'
                                    }`}
                                >
                                    {isSignedUp ? 'Cancel Sign-up' : isFull ? 'Full' : 'Sign Up'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default VolunteeringScreen;