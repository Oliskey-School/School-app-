import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Heart, TrendingUp, Users, Gift, Award } from 'lucide-react';
import PremiumLoader from '../ui/PremiumLoader';
import { initializePaystackPayment } from '../../lib/paymentGateways';

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

interface DonationPortalProps {
    schoolId?: string;
}

const DonationPortal: React.FC<DonationPortalProps> = ({ schoolId }) => {
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
    const [processing, setProcessing] = useState(false);

    const suggestedAmounts = [100, 500, 1000, 2500, 5000, 10000];

    useEffect(() => {
        fetchCampaigns();
        fetchTopDonors();
    }, [schoolId]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            // Use Central API
            const data = await api.getDonationCampaigns(schoolId);
            setCampaigns(data || []);
        } catch (error: any) {
            console.error('Error fetching campaigns:', error);
            toast.error('Failed to load campaigns');
        } finally {
            setLoading(false);
        }
    };

    const fetchTopDonors = async () => {
        try {
            // Use Central API
            const data = await api.getTopDonors(5);
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

        // An email is always required — it's where the donation receipt goes.
        // "Anonymous" only hides the name from the public donor list.
        if (!donorEmail) {
            toast.error('Please provide your email for the receipt');
            return;
        }
        if (!isAnonymous && !donorName) {
            toast.error('Please provide your name');
            return;
        }

        if (!selectedCampaign) return;

        // Open the REAL payment gateway. The donation is only recorded AFTER the
        // parent actually pays — never before (the old flow faked success with a
        // setTimeout and recorded a donation nobody paid for).
        const reference = `DON-${selectedCampaign.id}-${Date.now()}`;
        setProcessing(true);
        try {
            await initializePaystackPayment({
                email: donorEmail,
                amount,
                currency: 'NGN',
                reference,
                customizations: {
                    title: 'School Donation',
                    description: selectedCampaign.campaign_name,
                },
                onSuccess: async (response?: any) => {
                    try {
                        await api.processDonation({
                            campaign_id: selectedCampaign.id,
                            amount,
                            donor_name: isAnonymous ? '' : donorName,
                            donor_email: donorEmail,
                            donor_phone: donorPhone,
                            is_anonymous: isAnonymous,
                            message,
                            currency: 'NGN',
                            payment_reference: response?.reference || reference,
                            status: 'Paid',
                        });
                        toast.success('Thank you for your donation! 🎉');
                        setShowDonateModal(false);
                        resetForm();
                        fetchCampaigns();
                    } catch {
                        // Payment went through but recording failed — tell the truth.
                        toast.error('Your payment succeeded but we could not record it. Please contact the school with reference: ' + (response?.reference || reference));
                    } finally {
                        setProcessing(false);
                    }
                },
                onClose: () => {
                    setProcessing(false);
                    toast('Payment cancelled — no donation was made.', { icon: 'ℹ️' });
                },
            });
        } catch (error: any) {
            setProcessing(false);
            // Most common cause: the gateway public key isn't configured.
            toast.error(
                error?.message?.includes('public key')
                    ? 'Online donations are not set up for this school yet. Please contact the school office to donate.'
                    : 'Could not start the payment. Please try again.'
            );
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
                            <motion.div
                                key={donor.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: index * 0.06 }}
                                className="text-center"
                            >
                                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-pink-500'
                                    }`}>
                                    {index + 1}
                                </div>
                                <p className="font-semibold text-gray-900 mt-2">{donor.donor_name}</p>
                                <p className="text-sm text-gray-600">₦{donor.total_donated.toLocaleString()}</p>
                            </motion.div>
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
                        campaigns.map((campaign, i) => (
                            <motion.div
                                key={campaign.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.05 }}
                                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
                            >
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
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${getProgressPercentage(campaign)}%` }}
                                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                                className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full"
                                            />
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{getProgressPercentage(campaign).toFixed(0)}% funded</p>
                                    </div>

                                    {campaign.beneficiary_count && (
                                        <p className="text-sm text-gray-600 mb-4">
                                            <strong>{campaign.beneficiary_count}</strong> students will benefit
                                        </p>
                                    )}

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => {
                                            setSelectedCampaign(campaign);
                                            setShowDonateModal(true);
                                        }}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 font-bold transition-colors"
                                    >
                                        Donate Now
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Donation Modal */}
            <AnimatePresence>
            {showDonateModal && selectedCampaign && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Donate to {selectedCampaign.campaign_name}</h2>
                            <p className="text-gray-600 mb-6">{selectedCampaign.description}</p>

                            {/* Quick amounts */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Quick Select</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {suggestedAmounts.map(amount => (
                                        <motion.button
                                            key={amount}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setDonationAmount(amount.toString())}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${donationAmount === amount.toString()
                                                ? 'bg-pink-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            ₦{amount.toLocaleString()}
                                        </motion.button>
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
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                        setShowDonateModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                >
                                    Cancel
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: processing ? 1 : 1.02 }}
                                    whileTap={{ scale: processing ? 1 : 0.96 }}
                                    onClick={handleDonate}
                                    disabled={processing}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg hover:from-pink-700 hover:to-purple-700 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {processing ? 'Processing…' : 'Proceed to Payment'}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default DonationPortal;
