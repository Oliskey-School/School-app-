import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Calendar, Clock, Users, MapPin, Award } from 'lucide-react';

interface Opportunity {
    id: number;
    title: string;
    description: string;
    opportunity_type: string;
    date: string;
    time_start: string;
    time_end: string;
    location: string;
    skills_needed: string;
    slots_available: number;
    slots_filled: number;
    coordinator_contact: string;
    status: string;
}

const VolunteerSignup: React.FC = () => {
    const { profile } = useProfile();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [mySignups, setMySignups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'available' | 'my-signups'>('available');
    const [totalHours, setTotalHours] = useState(0);
    const [badges, setBadges] = useState<any[]>([]);

    useEffect(() => {
        fetchOpportunities();
        fetchMySignups();
        fetchVolunteerStats();
    }, []);

    const fetchOpportunities = async () => {
        try {
            const { data, error } = await supabase
                .from('volunteer_opportunities')
                .select('*')
                .eq('status', 'Open')
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true });

            if (error) throw error;
            setOpportunities(data || []);
        } catch (error: any) {
            console.error('Error fetching opportunities:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMySignups = async () => {
        try {
            const { data, error } = await supabase
                .from('volunteer_signups')
                .select(`
          *,
          volunteer_opportunities (*)
        `)
                .eq('parent_id', profile.id)
                .order('signup_date', { ascending: false });

            if (error) throw error;
            setMySignups(data || []);
        } catch (error: any) {
            console.error('Error fetching signups:', error);
        }
    };

    const fetchVolunteerStats = async () => {
        try {
            // Total hours
            const { data: hoursData } = await supabase
                .from('volunteer_hours')
                .select('hours')
                .eq('parent_id', profile.id);

            const total = hoursData?.reduce((sum, record) => sum + Number(record.hours), 0) || 0;
            setTotalHours(total);

            // Badges
            const { data: badgesData } = await supabase
                .from('volunteer_badges')
                .select('*')
                .eq('parent_id', profile.id)
                .order('awarded_date', { ascending: false });

            setBadges(badgesData || []);
        } catch (error: any) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleSignup = async (opportunityId: number) => {
        try {
            await api.volunteerSignup({
                opportunity_id: opportunityId,
                parent_id: profile.id,
                status: 'Pending'
            });

            toast.success('Signup successful! Coordinator will confirm soon.');
            fetchOpportunities();
            fetchMySignups();
        } catch (error: any) {
            if (error.message?.includes('already signed up') || error.message?.includes('23505')) {
                toast.error('You have already signed up for this opportunity');
            } else {
                toast.error('Failed to sign up');
                console.error(error);
            }
        }
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Pending: 'bg-yellow-100 text-yellow-800',
            Confirmed: 'bg-green-100 text-green-800',
            Completed: 'bg-blue-100 text-blue-800',
            Cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            'Event Support': 'bg-purple-500',
            'Classroom Help': 'bg-blue-500',
            'Field Trip': 'bg-green-500',
            'Fundraising': 'bg-orange-500',
            'Tutoring': 'bg-pink-500',
            'Maintenance': 'bg-gray-500'
        };
        return colors[type] || 'bg-indigo-500';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Stats Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">Volunteer Opportunities</h1>
                <p className="text-indigo-100">Support your school community</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <Clock className="h-8 w-8" />
                            <div>
                                <p className="text-2xl font-bold">{totalHours}</p>
                                <p className="text-sm text-indigo-100">Total Hours</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <Users className="h-8 w-8" />
                            <div>
                                <p className="text-2xl font-bold">{mySignups.length}</p>
                                <p className="text-sm text-indigo-100">Activities</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                            <Award className="h-8 w-8" />
                            <div>
                                <p className="text-2xl font-bold">{badges.length}</p>
                                <p className="text-sm text-indigo-100">Badges Earned</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">🏆 Recognition Badges</h2>
                    <div className="flex flex-wrap gap-3">
                        {badges.map(badge => (
                            <div key={badge.id} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full flex items-center space-x-2">
                                <Award className="h-5 w-5" />
                                <span className="font-semibold">{badge.badge_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('available')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'available'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Available Opportunities ({opportunities.length})
                </button>
                <button
                    onClick={() => setActiveTab('my-signups')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'my-signups'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    My Signups ({mySignups.length})
                </button>
            </div>

            {/* Available Opportunities */}
            {activeTab === 'available' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {opportunities.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No opportunities available at the moment</p>
                            <p className="text-sm">Check back soon for new ways to help!</p>
                        </div>
                    ) : (
                        opportunities.map(opp => (
                            <div key={opp.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                <div className={`h-2 ${getTypeColor(opp.opportunity_type)}`}></div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-xl font-bold text-gray-900">{opp.title}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(opp.opportunity_type)} text-white`}>
                                            {opp.opportunity_type}
                                        </span>
                                    </div>

                                    <p className="text-gray-600 mb-4 line-clamp-2">{opp.description}</p>

                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>{new Date(opp.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4" />
                                            <span>{opp.time_start} - {opp.time_end}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <MapPin className="h-4 w-4" />
                                            <span>{opp.location}</span>
                                        </div>
                                        {opp.skills_needed && (
                                            <div className="flex items-start space-x-2">
                                                <Award className="h-4 w-4 mt-0.5" />
                                                <span className="text-xs">{opp.skills_needed}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            <strong>{opp.slots_available - opp.slots_filled}</strong> slots available
                                        </span>
                                        <button
                                            onClick={() => handleSignup(opp.id)}
                                            disabled={opp.slots_filled >= opp.slots_available}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition-colors"
                                        >
                                            {opp.slots_filled >= opp.slots_available ? 'Filled' : 'Sign Up'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* My Signups */}
            {activeTab === 'my-signups' && (
                <div className="space-y-4">
                    {mySignups.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No volunteer signups yet</p>
                            <p className="text-sm">Sign up for an opportunity to get started!</p>
                        </div>
                    ) : (
                        mySignups.map(signup => (
                            <div key={signup.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-bold text-gray-900">{signup.volunteer_opportunities.title}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(signup.status)}`}>
                                                {signup.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="h-4 w-4" />
                                                <span>{new Date(signup.volunteer_opportunities.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Clock className="h-4 w-4" />
                                                <span>{signup.volunteer_opportunities.time_start} - {signup.volunteer_opportunities.time_end}</span>
                                            </div>
                                        </div>
                                        {signup.hours_contributed && (
                                            <div className="mt-2 text-sm">
                                                <span className="font-semibold text-green-600">{signup.hours_contributed} hours contributed</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default VolunteerSignup;
