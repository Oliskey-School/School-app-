import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Alumni, FundraisingCampaign, Donation } from '../../types-additional';
import { toast } from 'react-hot-toast';
import { UserGroupIcon, CurrencyDollarIcon, AcademicCapIcon } from '../../constants';

const AlumniNetwork: React.FC = () => {
    const [alumni, setAlumni] = useState<Alumni[]>([]);
    const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([]);
    const [view, setView] = useState<'directory' | 'fundraising'>('directory');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [view]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (view === 'directory') {
                const { data } = await supabase
                    .from('alumni')
                    .select(`
            *,
            user:users(name, email, avatar_url)
          `)
                    .eq('is_visible', true)
                    .order('graduation_year', { ascending: false });

                setAlumni(data || []);
            } else {
                const { data } = await supabase
                    .from('fundraising_campaigns')
                    .select('*, donations(*)')
                    .eq('status', 'active')
                    .order('created_at', { ascending: false });

                setCampaigns(data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const donate = async (campaignId: number, amount: number) => {
        try {
            const { error } = await supabase
                .from('donations')
                .insert({
                    campaign_id: campaignId,
                    amount: amount,
                    payment_provider: 'paystack'
                });

            if (error) throw error;

            // Update campaign raised amount
            const campaign = campaigns.find(c => c.id === campaignId);
            if (campaign) {
                await supabase
                    .from('fundraising_campaigns')
                    .update({ raised_amount: campaign.raisedAmount + amount })
                    .eq('id', campaignId);
            }

            toast.success('Thank you for your donation!');
            fetchData();
        } catch (error) {
            console.error('Donation error:', error);
            toast.error('Failed to process donation');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex space-x-2">
                    <button
                        onClick={() => setView('directory')}
                        className={`px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 ${view === 'directory' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        <UserGroupIcon className="h-5 w-5" />
                        <span>Alumni Directory</span>
                    </button>
                    <button
                        onClick={() => setView('fundraising')}
                        className={`px-4 py-2 rounded-lg font-semibold flex items-center space-x-2 ${view === 'fundraising' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        <CurrencyDollarIcon className="h-5 w-5" />
                        <span>Fundraising</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                    </div>
                ) : view === 'directory' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alumni.map((alum) => (
                            <div key={alum.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start space-x-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                        {alum.user?.name?.charAt(0) || 'A'}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">{alum.user?.name}</h3>
                                        <p className="text-sm text-gray-500">Class of {alum.graduationYear}</p>
                                        {alum.currentOccupation && (
                                            <p className="text-sm text-gray-600 mt-1">{alum.currentOccupation}</p>
                                        )}
                                        {alum.company && (
                                            <p className="text-xs text-gray-500">@ {alum.company}</p>
                                        )}
                                        {alum.isMentorAvailable && (
                                            <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                Available as Mentor
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {alumni.length === 0 && (
                            <div className="col-span-full text-center py-16">
                                <AcademicCapIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No alumni profiles yet</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {campaigns.map((campaign) => {
                            const progressPercentage = (campaign.raisedAmount / campaign.goalAmount) * 100;
                            return (
                                <div key={campaign.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                    {campaign.imageUrl && (
                                        <img src={campaign.imageUrl} alt={campaign.title} className="w-full h-48 object-cover" />
                                    )}
                                    <div className="p-6">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">{campaign.title}</h3>
                                        <p className="text-gray-600 mb-4">{campaign.description}</p>

                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="font-semibold">₦{campaign.raisedAmount.toLocaleString()}</span>
                                                <span className="text-gray-500">Goal: ₦{campaign.goalAmount.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                                                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">{progressPercentage.toFixed(1)}% funded</p>
                                        </div>

                                        <button
                                            onClick={() => donate(campaign.id, 10000)}
                                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
                                        >
                                            Donate Now
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {campaigns.length === 0 && (
                            <div className="text-center py-16">
                                <CurrencyDollarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No active campaigns at the moment</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlumniNetwork;
