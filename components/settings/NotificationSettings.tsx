import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { requestNotificationPermission, areNotificationsEnabled, getNotificationPermission } from '../../lib/push-notifications';

interface NotificationPreferences {
    push: boolean;
    sms: boolean;
    email: boolean;
}

export function NotificationSettings() {
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        push: true,
        sms: true,
        email: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);

    useEffect(() => {
        loadPreferences();
        setPushEnabled(areNotificationsEnabled());
        setPermissionStatus(getNotificationPermission());
    }, []);

    const loadPreferences = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('profiles')
                .select('notification_preferences')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data?.notification_preferences) {
                setPreferences(data.notification_preferences);
            }
        } catch (error) {
            console.error('Load preferences error:', error);
        } finally {
            setLoading(false);
        }
    };

    const savePreferences = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ notification_preferences: preferences })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Preferences saved successfully!');
        } catch (error) {
            console.error('Save preferences error:', error);
            toast.error('Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const handleEnablePush = async () => {
        const token = await requestNotificationPermission();
        if (token) {
            setPushEnabled(true);
            setPermissionStatus('granted');
            setPreferences({ ...preferences, push: true });
        }
    };

    const togglePreference = (key: keyof NotificationPreferences) => {
        setPreferences({ ...preferences, [key]: !preferences[key] });
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded mb-3"></div>
                    <div className="h-20 bg-gray-200 rounded mb-3"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
                <p className="text-gray-600">Choose how you want to receive notifications</p>
            </div>

            <div className="space-y-4">
                {/* Push Notifications */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <h3 className="text-lg font-semibold text-gray-900">Push Notifications</h3>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                                Receive instant notifications on this device
                            </p>

                            {!pushEnabled && (
                                <button
                                    onClick={handleEnablePush}
                                    className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                                >
                                    Enable Push Notifications
                                </button>
                            )}

                            {permissionStatus === 'denied' && (
                                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                                    Push notifications are blocked. Please enable them in your browser settings.
                                </div>
                            )}
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.push && pushEnabled}
                                onChange={() => togglePreference('push')}
                                disabled={!pushEnabled}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                        </label>
                    </div>
                </div>

                {/* SMS Notifications */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                <h3 className="text-lg font-semibold text-gray-900">SMS Notifications</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                                Receive important alerts via text message (for high/emergency only)
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.sms}
                                onChange={() => togglePreference('sms')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </div>

                {/* Email Notifications */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
                            </div>
                            <p className="text-sm text-gray-600">
                                Receive emergency alerts via email
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={preferences.email}
                                onChange={() => togglePreference('email')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">How notifications work:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Normal</strong>: Push notifications only</li>
                    <li>• <strong>High</strong>: Push + SMS (if enabled)</li>
                    <li>• <strong>Emergency</strong>: Push + SMS + Email (all enabled channels)</li>
                </ul>
            </div>

            {/* Save Button */}
            <div className="mt-6">
                <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                    {saving ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
        </div>
    );
}
