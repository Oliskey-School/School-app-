import React from 'react';
import { Crown, X, CheckCircle } from 'lucide-react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCount: number;
    limit: number;
    onUpgrade: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
    isOpen,
    onClose,
    currentCount,
    limit,
    onUpgrade
}) => {
    if (!isOpen) return null;

    return (
        <div className="relative z-50">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/25 backdrop-blur-sm transition-opacity"
                aria-hidden="true"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all relative animate-in fade-in zoom-in duration-300">
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            {/* Icon */}
                            <div className="h-16 w-16 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full flex items-center justify-center mb-4 ring-8 ring-amber-50">
                                <Crown className="w-8 h-8 text-amber-600" />
                            </div>

                            <h3 className="text-2xl font-bold leading-6 text-gray-900 mb-2">
                                Limit Reached
                            </h3>

                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    You've reached the free tier limit of <span className="font-bold text-gray-900">{limit} users</span>.
                                    You currently have <span className="font-bold text-red-600">{currentCount} users</span>.
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Upgrade to Premium to add unlimited students, teachers, and parents.
                                </p>
                            </div>

                            <div className="mt-6 w-full bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-left">Premium Benefits</h4>
                                <ul className="space-y-2 text-sm text-left">
                                    {[
                                        'Unlimited Users & Students',
                                        'Advanced Reporting & Analytics',
                                        'Priority Support',
                                        'Automated Backups',
                                        'Custom Branding'
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2 text-gray-700">
                                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-6 w-full space-y-3">
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-xl border border-transparent bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform active:scale-95"
                                    onClick={onUpgrade}
                                >
                                    Upgrade to Premium - ₦5,000/mo
                                </button>
                                <button
                                    type="button"
                                    className="w-full inline-flex justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                    onClick={onClose}
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradeModal;
