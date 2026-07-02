import React, { useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { HelpingHandIcon } from '../../constants';

interface VolunteeringOpportunity {
    id: string;
    title: string;
    description: string;
    date: string;
    spotsAvailable: number;
    spotsFilled: number;
}

const VolunteeringScreen: React.FC = () => {
    const { user } = useAuth();
    const [opportunities, setOpportunities] = useState<VolunteeringOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [signedUpEvents, setSignedUpEvents] = useState<Set<string>>(new Set());
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

    const fetchOpportunities = useCallback(async () => {
        try {
            const data = await api.getVolunteeringOpportunities();

            if (data) {
                setOpportunities(data.map((item: any) => ({
                    id: String(item.id),
                    title: item.title,
                    description: item.description,
                    date: item.date,
                    spotsAvailable: item.slots_total || 10,
                    spotsFilled: item.slots_filled || 0
                })));
            }
        } catch (err) {
            console.error('Error fetching volunteering opportunities:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMySignups = useCallback(async () => {
        try {
            const data = await api.getMyVolunteerSignups();
            if (Array.isArray(data)) {
                setSignedUpEvents(new Set(data.map((s: any) => String(s.opportunity_id || s.opportunity?.id))));
            }
        } catch {
            // Non-blocking — start with empty set if fetch fails
        }
    }, []);

    // Real-time synchronization
    useAutoSync(['volunteering_opportunities', 'volunteers'], fetchOpportunities);

    useEffect(() => {
        fetchOpportunities();
        fetchMySignups();
    }, [fetchOpportunities, fetchMySignups]);

    const handleSignUpToggle = async (id: string) => {
        if (pendingIds.has(id)) return;

        if (signedUpEvents.has(id)) {
            // No cancel route available — remove from local state only
            setSignedUpEvents(prev => { const s = new Set(prev); s.delete(id); return s; });
            return;
        }

        setPendingIds(prev => new Set(prev).add(id));
        try {
            await api.volunteerSignup(id, {
                full_name: user?.user_metadata?.full_name || user?.email || 'Parent',
            });
            setSignedUpEvents(prev => new Set(prev).add(id));
            toast.success('Signed up successfully!');
        } catch (err) {
            console.error('Volunteer signup error:', err);
            toast.error('Failed to sign up. Please try again.');
        } finally {
            setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-100 shadow-sm relative overflow-hidden">
                    <HelpingHandIcon className="h-10 w-10 mx-auto text-green-500 mb-2 relative z-10" />
                    <h3 className="font-bold text-xl text-green-800 relative z-10">Volunteer Opportunities</h3>
                    <p className="text-sm text-green-600 relative z-10">Get involved and make a difference!</p>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : opportunities.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">No active volunteering opportunities.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {opportunities.map(opp => {
                            const isSignedUp = signedUpEvents.has(opp.id);
                            const isPending = pendingIds.has(opp.id);
                            const spotsLeft = opp.spotsAvailable - (opp.spotsFilled + (isSignedUp ? 1 : 0));
                            const isFull = spotsLeft <= 0;

                            return (
                                <div key={opp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800 text-lg">{opp.title}</h4>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                            }`}>
                                            {isFull ? 'Full' : 'Open'}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-500 font-medium flex items-center mb-3">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                                        {new Date(opp.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </p>

                                    <p className="text-sm text-gray-600 mb-6 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        {opp.description}
                                    </p>

                                    <div className="flex justify-between items-center mt-auto">
                                        <p className="text-xs font-bold text-gray-400">
                                            {Math.max(0, spotsLeft)} <span className="font-normal">spots remaining</span>
                                        </p>
                                        <button
                                            onClick={() => handleSignUpToggle(opp.id)}
                                            disabled={(isFull && !isSignedUp) || isPending}
                                            className={`py-2.5 px-6 text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 ${isSignedUp
                                                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                                : isFull || isPending
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                    : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green-200'
                                                }`}
                                        >
                                            {isPending ? 'Signing up...' : isSignedUp ? 'Cancel' : isFull ? 'Full' : 'Sign Up'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default VolunteeringScreen;
