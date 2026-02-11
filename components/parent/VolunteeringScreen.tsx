import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { HelpingHandIcon } from '../../constants';

interface VolunteeringOpportunity {
    id: number;
    title: string;
    description: string;
    date: string;
    spotsAvailable: number;
    spotsFilled: number;
}

const VolunteeringScreen: React.FC = () => {
    const [opportunities, setOpportunities] = useState<VolunteeringOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [signedUpEvents, setSignedUpEvents] = useState<Set<number>>(new Set());

    useEffect(() => {
        const fetchOpportunities = async () => {
            try {
                const { data, error } = await supabase
                    .from('volunteering_opportunities')
                    .select('*')
                    .order('date', { ascending: true });

                if (error) throw error;

                if (data) {
                    setOpportunities(data.map((item: any) => ({
                        id: item.id,
                        title: item.title,
                        description: item.description,
                        date: item.date,
                        spotsAvailable: item.spots_available || 10,
                        spotsFilled: item.spots_filled || 0
                    })));
                }
            } catch (err) {
                console.error('Error fetching volunteering opportunities:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunities();
    }, []);

    const handleSignUpToggle = (id: number) => {
        const newSet = new Set(signedUpEvents);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
            // In a real app, we would POST to a 'volunteers' table here
            toast.success("Thanks for volunteering! (This is a demo action)");
        }
        setSignedUpEvents(newSet);
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
                            const spotsLeft = opp.spotsAvailable - (opp.spotsFilled + (isSignedUp ? 1 : 0));
                            const isFull = spotsLeft <= 0;

                            return (
                                <div key={opp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-800 text-lg">{opp.title}</h4>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${isFull ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
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
                                            disabled={isFull && !isSignedUp}
                                            className={`py-2.5 px-6 text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 ${isSignedUp
                                                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                                : isFull
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                                    : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green-200'
                                                }`}
                                        >
                                            {isSignedUp ? 'Cancel' : isFull ? 'Full' : 'Sign Up'}
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