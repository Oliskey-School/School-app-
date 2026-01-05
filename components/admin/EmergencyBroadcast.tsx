import { toast } from 'react-hot-toast';
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface EmergencyBroadcastProps {
    onClose?: () => void;
}

export function EmergencyBroadcast({ onClose }: EmergencyBroadcastProps) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [urgency, setUrgency] = useState<'high' | 'emergency'>('emergency');
    const [targetAudience, setTargetAudience] = useState<string[]>(['all']);
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [confirming, setConfirming] = useState(false); // New state for confirmation

    // ... (audiences, templates, handleTemplate, toggleAudience - keep same)

    const audiences = [
        { id: 'all', label: 'Everyone', icon: '🌐' },
        { id: 'student', label: 'All Students', icon: '🎓' },
        { id: 'parent', label: 'All Parents', icon: '👨‍👩‍👧‍👦' },
        { id: 'teacher', label: 'All Teachers', icon: '👨‍🏫' },
        { id: 'admin', label: 'All Admins', icon: '⚙️' },
    ];

    const templates = [
        {
            title: 'School Closure',
            message: 'URGENT: School will be closed today due to unforeseen circumstances. All students stay home. Updates will follow.'
        },
        {
            title: 'Emergency Evacuation',
            message: 'EMERGENCY: Please evacuate the school building immediately and proceed to the assembly point. Follow staff instructions.'
        },
        {
            title: 'Security Alert',
            message: 'SECURITY ALERT: School is in lockdown. Students and staff remain in classrooms with doors locked. Await further instructions.'
        },
        {
            title: 'Severe Weather',
            message: 'SEVERE WEATHER ALERT: Early dismissal at 12:00 PM due to approaching storm. Parents please arrange pickup.'
        }
    ];

    const handleTemplate = (template: typeof templates[0]) => {
        setTitle(template.title);
        setMessage(template.message);
    };

    const toggleAudience = (audienceId: string) => {
        if (audienceId === 'all') {
            setTargetAudience(['all']);
        } else {
            const newAudience = targetAudience.filter(a => a !== 'all');
            if (newAudience.includes(audienceId)) {
                setTargetAudience(newAudience.filter(a => a !== audienceId));
            } else {
                setTargetAudience([...newAudience, audienceId]);
            }
        }
    };

    const handleInitiateSend = () => {
        if (!title.trim() || !message.trim()) {
            toast.error('Please enter both title and message');
            return;
        }

        if (targetAudience.length === 0) {
            toast.error('Please select at least one audience');
            return;
        }

        setConfirming(true);
    };

    const handleConfirmSend = async () => {
        setConfirming(false);
        setSending(true);
        try {
            // Send to each target audience
            for (const audience of targetAudience) {
                const { error } = await supabase.functions.invoke('send-notification', {
                    body: {
                        role: audience === 'all' ? undefined : audience,
                        title,
                        body: message,
                        urgency,
                        channel: 'all'
                    }
                });

                if (error) throw error;
            }

            setSuccess(true);
            toast.success('Emergency broadcast sent successfully!');
            setTimeout(() => {
                setTitle('');
                setMessage('');
                setTargetAudience(['all']);
                setSuccess(false);
                onClose?.();
            }, 2000);

        } catch (error) {
            console.error('Broadcast error:', error);
            toast.error('Failed to send emergency broadcast');
        } finally {
            setSending(false);
        }
    };

    const handleCancel = () => {
        if (confirming) {
            setConfirming(false);
        } else {
            onClose?.();
        }
    };


    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-red-50 border-2 border-red-600 rounded-lg p-6 mb-6">
// ... (Render content)
                <div className="flex items-center gap-3 mb-2">
                    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h1 className="text-2xl font-bold text-red-900">Emergency Broadcast System</h1>
                </div>
                <p className="text-red-700">
                    Send critical alerts to all users via push notifications, SMS, and email
                </p>
            </div>

            {success && (
                <div className="bg-green-50 border border-green-600 rounded-lg p-4 mb-6 flex items-center gap-2">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-green-800 font-medium">Emergency broadcast sent successfully!</p>
                </div>
            )}

            {/* Quick Templates */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Templates</h3>
                <div className="grid grid-cols-2 gap-3">
                    {templates.map((template, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleTemplate(template)}
                            className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition"
                        >
                            <h4 className="font-medium text-gray-900">{template.title}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2">{template.message}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Urgency Level */}
            <div className="mb-6">
                <label className="block font-semibold text-gray-900 mb-3">Urgency Level</label>
                <div className="flex gap-3">
                    <button
                        onClick={() => setUrgency('high')}
                        className={`flex-1 p-4 border-2 rounded-lg transition ${urgency === 'high'
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                            }`}
                    >
                        <div className="text-3xl mb-1">⚠️</div>
                        <div className="font-medium">High</div>
                        <div className="text-sm text-gray-600">Push + SMS</div>
                    </button>
                    <button
                        onClick={() => setUrgency('emergency')}
                        className={`flex-1 p-4 border-2 rounded-lg transition ${urgency === 'emergency'
                            ? 'border-red-600 bg-red-50'
                            : 'border-gray-200 hover:border-red-400'
                            }`}
                    >
                        <div className="text-3xl mb-1">🚨</div>
                        <div className="font-medium">Emergency</div>
                        <div className="text-sm text-gray-600">Push + SMS + Email</div>
                    </button>
                </div>
            </div>

            {/* Target Audience */}
            <div className="mb-6">
                <label className="block font-semibold text-gray-900 mb-3">Target Audience</label>
                <div className="grid grid-cols-3 gap-3">
                    {audiences.map((audience) => (
                        <button
                            key={audience.id}
                            onClick={() => toggleAudience(audience.id)}
                            className={`p-4 border-2 rounded-lg transition ${targetAudience.includes(audience.id) || targetAudience.includes('all')
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="text-2xl mb-1">{audience.icon}</div>
                            <div className="font-medium text-sm">{audience.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Message Form */}
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block font-semibold text-gray-900 mb-2">Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief title for the alert"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        maxLength={100}
                    />
                </div>

                <div>
                    <label className="block font-semibold text-gray-900 mb-2">Message</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Detailed message (clear and concise)"
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        maxLength={500}
                    />
                    <div className="text-right text-sm text-gray-500">{message.length}/500</div>
                </div>
            </div>

            {/* Send Button or Confirmation */}
            {confirming ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-4 animate-fade-in-up">
                    <h4 className="font-bold text-orange-800 text-lg mb-2">⚠️ Confirm Broadcast?</h4>
                    <p className="text-orange-700 mb-4">
                        You are about to send a <strong className="uppercase">{urgency}</strong> alert to <strong>{targetAudience.includes('all') ? 'EVERYONE' : targetAudience.join(', ')}</strong>.
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmSend}
                            className="flex-1 py-3 px-4 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-md"
                        >
                            CONFIRM & SEND
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={handleInitiateSend}
                    disabled={sending || !title.trim() || !message.trim()}
                    className="w-full bg-red-600 text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                    {sending ? (
                        <>
                            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Sending...
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            Send Emergency Broadcast
                        </>
                    )}
                </button>
            )}

            {onClose && !confirming && (
                <button
                    onClick={onClose}
                    className="w-full mt-3 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                    Cancel
                </button>
            )}
        </div>
    );
};

export default EmergencyBroadcast;
