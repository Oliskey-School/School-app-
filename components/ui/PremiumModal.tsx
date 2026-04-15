import React from 'react';
import { XCircleIcon, StarIcon, CheckCircleIcon } from '../../constants';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, featureName = 'This feature' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform animate-in zoom-in duration-300">
                <div className="relative h-32 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center">
                    <div className="absolute top-4 right-4">
                        <button 
                            onClick={onClose}
                            className="p-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                        >
                            <XCircleIcon className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-lg ring-4 ring-white/20">
                        <StarIcon className="h-10 w-10 text-orange-500" filled />
                    </div>
                </div>
                
                <div className="p-8 text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Upgrade to Premium</h3>
                    <p className="text-gray-600 mb-6">
                        {featureName} is a premium feature. Unlock full access to take your school experience to the next level.
                    </p>
                    
                    <div className="space-y-3 mb-8 text-left">
                        {[
                            'Advanced Performance Analytics',
                            'Real-time Attendance Tracking',
                            'Priority Support & More'
                        ].map((perk, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm text-gray-700">
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                <span>{perk}</span>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-orange-200 hover:-translate-y-0.5 transition-all active:scale-95 mb-4"
                    >
                        View Pricing Plans
                    </button>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PremiumModal;
