import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../../context/ProfileContext';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { ExclamationCircleIcon } from '../../constants';

interface PanicButtonProps {
    isFloating?: boolean;
    schoolId?: string;
}

const HOLD_DURATION_MS = 1200;

const PanicButton: React.FC<PanicButtonProps> = ({ isFloating = true, schoolId }) => {
    const { profile } = useProfile();
    const [isActivating, setIsActivating] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [location, setLocation] = useState('');
    const [holdProgress, setHoldProgress] = useState(0);
    const [sentAlert, setSentAlert] = useState<{ id?: string; time: string } | null>(null);
    const holdIntervalRef = useRef<number | null>(null);

    const getLocation = (): Promise<{ latitude: number, longitude: number } | null> => {
        return new Promise((resolve) => {
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }),
                    () => resolve(null)
                );
            } else {
                resolve(null);
            }
        });
    };

    const handlePanicActivation = async () => {
        try {
            setIsActivating(true);

            const coords = await getLocation();

            const result = await (api as any).triggerPanicAlert({
                schoolId: schoolId,
                userId: profile.id,
                type: 'Security Threat',
                location: {
                    name: location || 'Unknown',
                    lat: coords?.latitude ?? null,
                    lng: coords?.longitude ?? null,
                    address: location || 'Unknown'
                }
            });

            toast.success('🚨 EMERGENCY ALERT SENT! Help is on the way.');
            setShowConfirm(false);
            setLocation('');
            setSentAlert({ id: result?.data?.id, time: new Date().toLocaleTimeString() });

        } catch (error: any) {
            console.error('Error activating panic button:', error);
            toast.error('Failed to send alert. Please call emergency services directly.');
        } finally {
            setIsActivating(false);
            setHoldProgress(0);
        }
    };

    const startHold = () => {
        if (isActivating) return;
        const startTime = Date.now();
        holdIntervalRef.current = window.setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
            setHoldProgress(pct);
            if (pct >= 100) {
                cancelHold();
                handlePanicActivation();
            }
        }, 30);
    };

    const cancelHold = () => {
        if (holdIntervalRef.current) {
            clearInterval(holdIntervalRef.current);
            holdIntervalRef.current = null;
        }
        setHoldProgress(0);
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
            <AnimatePresence>
            {showConfirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="bg-white rounded-xl p-6 max-w-md w-full"
                    >
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

                            <p className="text-xs text-gray-400 mb-3">Press and hold the red button to confirm — this prevents sending an alert by accident.</p>

                            <div className="flex space-x-3">
                                <motion.button
                                    whileTap={{ scale: isActivating ? 1 : 0.96 }}
                                    onClick={() => {
                                        cancelHold();
                                        setShowConfirm(false);
                                        setLocation('');
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                    disabled={isActivating}
                                >
                                    Cancel
                                </motion.button>
                                <button
                                    onPointerDown={startHold}
                                    onPointerUp={cancelHold}
                                    onPointerLeave={cancelHold}
                                    disabled={isActivating}
                                    className="relative flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold disabled:opacity-50 overflow-hidden select-none touch-none"
                                >
                                    <span
                                        className="absolute inset-0 bg-red-800 origin-left"
                                        style={{ transform: `scaleX(${holdProgress / 100})`, transition: holdProgress === 0 ? 'transform 0.15s ease-out' : 'none' }}
                                    />
                                    <span className="relative">
                                        {isActivating ? 'Sending...' : 'HOLD TO SEND 🚨'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Persistent post-send confirmation — a toast alone isn't reassuring enough mid-panic */}
            <AnimatePresence>
            {sentAlert && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm bg-red-600 text-white rounded-xl shadow-2xl p-4 flex items-start gap-3"
                >
                    <ExclamationCircleIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-bold">Alert Sent — Help Is On The Way</p>
                        <p className="text-xs text-red-100 mt-0.5">
                            Sent at {sentAlert.time}{sentAlert.id ? ` · Ref #${sentAlert.id.slice(0, 8)}` : ''}. Security and admin have been notified.
                        </p>
                    </div>
                    <button onClick={() => setSentAlert(null)} className="text-red-100 hover:text-white font-bold text-sm">Close</button>
                </motion.div>
            )}
            </AnimatePresence>
        </>
    );
};

export default PanicButton;
