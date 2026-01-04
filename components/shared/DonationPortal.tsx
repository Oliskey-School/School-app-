import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Heart, TrendingUp, Users, Gift, Award } from 'lucide-react';

interface Campaign {
    id: number;
    campaign_name: string;
    description: string;
    campaign_type: string;
    goal_amount: number;
    raised_amount: number;
    start_date: string;
    end_date: string;
    banner_image_url: string;
    status: string;
    beneficiary_count: number;
    impact_description: string;
}

const DonationPortal: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [donationAmount, setDonationAmount] = useState('');
    const [donorName, setDonorName] = useState('');
    const [donorEmail, setDonorEmail] = useState('');
    const [donorPhone, setDonorPhone] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showDonateModal, setShowDonateModal] = useState(false);
    const [topDonors, setTopDonors] = useState<any[]>([]);

    const suggestedAmounts = [100, 500, 1000, 2500, 5000, 10000];

    useEffect(() => {
        fetchCampaigns();
        fetchTopDonors();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const { data, error } = await supabase
                .from('donation_campaigns')
                .select('*')
                .eq('status', 'Active')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampaigns(data || []);
        } catch (error: any) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTopDonors = async () => {
        try {
            const { data, error } = await supabase
                .from('donors')
                .select('*')
                .eq('is_anonymous', false)
                .order('total_donated', { ascending: false })
                .limit(5);

            if (error) throw error;
            setTopDonors(data || []);
        } catch (error: any) {
            console.error('Error fetching donors:', error);
        }
    };

    const handleDonate = async () => {
        const amount = Number(donationAmount);

        // Validation
        if (!amount || amount < 100) {
            toast.error('Minimum donation is ₦100');
            return;
        }

        if (!isAnonymous && (!donorName || !donorEmail)) {
            toast.error('Please provide your name and email');
            return;
        }

        if (!selectedCampaign) return;

        try {
            // Create or get donor
            let donorId = null;

            if (!isAnonymous) {
                const { data: existingDonor } = await supabase
                    .from('donors')
                    .select('id')
                    .eq('email', donorEmail)
                    .single();

                if (existingDonor) {
                    donorId = existingDonor.id;
                } else {
                    const { data: newDonor, error: donorError } = await supabase
                        .from('donors')
                        .insert({
                            donor_name: donorName,
                            email: donorEmail,
                            phone: donorPhone,
                            donor_type: 'Individual',
                            is_anonymous: false
                        })
                        .select()
                        .single();

                    if (donorError) throw donorError;
                    donorId = newDonor.id;
                }
            }

            // Create donation (in real app, integrate with payment gateway first)
            const { error: donationError } = await supabase
                .from('donations')
                .insert({
                    campaign_id: selectedCampaign.id,
                    donor_id: donorId,
                    amount: amount,
                    currency: 'NGN',
                    donation_type: 'OneTime',
                    payment_method: 'Paystack', // Would be selected by user
                    status: 'Pending', // Would be 'Completed' after payment
                    is_anonymous: isAnonymous,
                    message: message
                });

            if (donationError) throw donationError;

            // In production, redirect to Paystack payment page here
            toast.success('Redirecting to payment gateway...');

            // Simulate payment success
            setTimeout(() => {
                toast.success('Thank you for your donation! 🎉');
                setShowDonateModal(false);
                resetForm();
                fetchCampaigns();
            }, 2000);

        } catch (error: any) {
            toast.error('Failed to process donation');
            console.error(error);
        }
    };

    const resetForm = () => {
        setDonationAmount('');
        setDonorName('');
        setDonorEmail('');
        setDonorPhone('');
        setIsAnonymous(false);
        setMessage('');
        setSelectedCampaign(null);
    };

    const getProgressPercentage = (campaign: Campaign) => {
        return Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100);
    };

    const getCampaignIcon = (type: string): React.ReactElement => {
        const icons: { [key: string]: React.ReactElement } = {
            Books: <Gift className="h-6 w-6" />,
            Uniforms: <Users className="h-6 w-6" />,
            Feeding: <Heart className="h-6 w-6" />,
            Scholarships: <Award className="h-6 w-6" />,
            Infrastructure: <TrendingUp className="h-6 w-6" />
        };
        return icons[type] || <Heart className="h-6 w-6" />;
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl p-8 text-white mb-8">
                <h1 className="text-4xl font-bold mb-2">💙 Support Our School</h1>
                <p className="text-lg text-pink-100">Every ₦100 makes a difference in a child's education</p>
            </div>

            {/* Recognition Wall */}
            {topDonors.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                        <Award className="h-6 w-6 text-yellow-500 mr-2" />
                        Top Donors - Recognition Wall
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {topDonors.map((donor, index) => (
                            <div key={donor.id} className="text-center">
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-pink-500'
                                    }`}>
                                    {index + 1}
                                </div>
                                <p className="font-semibold text-gray-900 mt-2">{donor.donor_name}</p>
                                <p className="text-sm text-gray-600">₦{donor.total_donated.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Campaigns */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Campaigns</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No active campaigns at the moment</p>
                        </div>
                    ) : (
                        campaigns.map(campaign => (
                            <div key={campaign.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
                                {campaign.banner_image_url && (
                                    <img src={campaign.banner_image_url} alt={campaign.campaign_name} className="w-full h-48 object-cover" />
                                )}
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-semibold flex items-center">
                                            {getCampaignIcon(campaign.campaign_type)}
                                            <span className="ml-2">{campaign.campaign_type}</span>
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.campaign_name}</h3>
                                    <p className="text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                                            <span>Raised: ₦{campaign.raised_amount.toLocaleString()}</span>
                                            <span>Goal: ₦{campaign.goal_amount.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                                                style={{ width: `${getProgressPercentage(campaign)}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{getProgressPercentage(campaign).toFixed(0)}% funded</p>
                                    </div>

                                    {campaign.beneficiary_count && (
                                        <p className="text-sm text-gray-600 mb-4">
                                            <strong>{campaign.beneficiary_count}</strong> students will benefit
                                        </p>
                                    )}

                                    <button
                                        onClick={() => {
                                            setSelectedCampaign(campaign);
                                            setShowDonateModal(true);
                                        }}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 font-bold transition-colors"
                                    >
                                        Donate Now
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Donation Modal */}
            {showDonateModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Donate to {selectedCampaign.campaign_name}</h2>
                            <p className="text-gray-600 mb-6">{selectedCampaign.description}</p>

                            {/* Quick amounts */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Select</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {suggestedAmounts.map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => setDonationAmount(amount.toString())}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${donationAmount === amount.toString()
                                                ? 'bg-pink-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            ₦{amount.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom amount */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Or Enter Custom Amount (Minimum ₦100)</label>
                                <input
                                    type="number"
                                    min="100"
                                    value={donationAmount}
                                    onChange={(e) => setDonationAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                />
                            </div>

                            {/* Anonymous toggle */}
                            <div className="mb-4 flex items-center">
                                <input
                                    type="checkbox"
                                    id="anonymous"
                                    checked={isAnonymous}
                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                />
                                <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">Make this donation anonymous</label>
                            </div>

                            {/* Donor details */}
                            {!isAnonymous && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name *</label>
                                        <input
                                            type="text"
                                            value={donorName}
                                            onChange={(e) => setDonorName(e.target.value)}
                                            placeholder="Full name"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                                        <input
                                            type="email"
                                            value={donorEmail}
                                            onChange={(e) => setDonorEmail(e.target.value)}
                                            placeholder="email@example.com"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Phone (Optional)</label>
                                        <input
                                            type="tel"
                                            value={donorPhone}
                                            onChange={(e) => setDonorPhone(e.target.value)}
                                            placeholder="080XXXXXXXX"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Message */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Message (Optional)</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Leave an encouraging message..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                                ></textarea>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowDonateModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDonate}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 font-bold"
                                >
                                    Proceed to Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DonationPortal;
