import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { ExclamationCircleIcon } from '../../constants';

interface PanicButtonProps {
    isFloating?: boolean;
}

const PanicButton: React.FC<PanicButtonProps> = ({ isFloating = true }) => {
    const { profile } = useProfile();
    const [isActivating, setIsActivating] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [location, setLocation] = useState('');

    const getLocation = (): Promise<{ latitude: number, longitude: number }> => {
        return new Promise((resolve, reject) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }),
                    () => resolve({ latitude: 0, longitude: 0 })
                );
            } else {
                resolve({ latitude: 0, longitude: 0 });
            }
        });
    };

    const handlePanicActivation = async () => {
        try {
            setIsActivating(true);

            const coords = await getLocation();

            // Create emergency alert
            const { data: alertData, error: alertError } = await supabase
                .from('emergency_alerts')
                .insert({
                    alert_type: 'Security Threat',
                    severity_level: 'Critical',
                    triggered_by: profile.id,
                    user_type: profile.role,
                    location: location || 'Unknown',
                    location_coordinates: `(${coords.latitude},${coords.longitude})`,
                    status: 'Active'
                })
                .select()
                .single();

            if (alertError) throw alertError;

            // Log panic activation
            await supabase.from('panic_activations').insert({
                user_id: profile.id,
                user_type: profile.role,
                location: location || 'Unknown',
                location_coordinates: `(${coords.latitude},${coords.longitude})`,
                emergency_alert_id: alertData.id,
                device_info: navigator.userAgent
            });

            toast.success('🚨 EMERGENCY ALERT SENT! Help is on the way.');
            setShowConfirm(false);
            setLocation('');

            // Could trigger real-time notifications here
            // await sendEmergencyNotifications(alertData.id);

        } catch (error: any) {
            console.error('Error activating panic button:', error);
            toast.error('Failed to send alert. Please call emergency services directly.');
        } finally {
            setIsActivating(false);
        }
    };

    return (
        <>
            {/* Panic Button */}
            <button
                onClick={() => setShowConfirm(true)}
                className={`${isFloating
                    ? 'fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl z-50'
                    : 'w-full py-4 rounded-xl'
                    } bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center transition-transform hover:scale-105 active:scale-95 animate-pulse`}
                title="Emergency Panic Button"
            >
                <ExclamationCircleIcon className="w-8 h-8" />
            </button>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                                <ExclamationCircleIcon className="h-10 w-10 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Activate Emergency Alert?
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                This will immediately notify security, admin, and emergency contacts.
                                Use only for genuine emergencies.
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Your Location (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g., Building A, Room 101"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowConfirm(false);
                                        setLocation('');
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                    disabled={isActivating}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePanicActivation}
                                    disabled={isActivating}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold disabled:opacity-50"
                                >
                                    {isActivating ? 'Sending...' : '🚨 SEND ALERT'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PanicButton;
