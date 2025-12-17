import React, { useState, useEffect } from 'react';
import { MailIcon, BellIcon, NotificationIcon } from '../../constants';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';

const SettingToggle = ({ icon, label, description, enabled, onToggle }: { icon: React.ReactNode, label: string, description: string, enabled: boolean, onToggle: () => void }) => (
    <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
            <div className="bg-gray-100 p-2 rounded-lg">{icon}</div>
            <div>
                <p className="font-semibold text-gray-800">{label}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={onToggle}
            className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 ${enabled ? 'bg-sky-600' : 'bg-gray-300'}`}
        >
            <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const NotificationsSettingsScreen: React.FC = () => {
    const { profile } = useProfile();
    const [settings, setSettings] = useState({
        emailAlerts: true,
        pushNotifications: true,
        weeklySummary: false
    });
    const [isLoading, setIsLoading] = useState(false);

    // Load settings from profile (assuming profile contains them or we fetch them)
    // For now, we'll fetch directly from users table to keep it fresh
    useEffect(() => {
        const fetchSettings = async () => {
            if (profile.id) {
                const { data, error } = await supabase
                    .from('users')
                    .select('notification_preferences')
                    .eq('id', profile.id)
                    .single();

                if (data && data.notification_preferences) {
                    setSettings(data.notification_preferences);
                }
            }
        };
        fetchSettings();
    }, [profile.id]);

    const toggleSetting = async (key: keyof typeof settings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings); // Optimistic update

        if (profile.id) {
            const { error } = await supabase
                .from('users')
                .update({ notification_preferences: newSettings })
                .eq('id', profile.id);

            if (error) {
                console.error('Error saving notification settings:', error);
                // Revert on error
                setSettings(settings);
            }
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">Notification Preferences</h2>
            <SettingToggle
                icon={<MailIcon className="text-sky-500 w-6 h-6" />}
                label="Email Alerts"
                description="Receive important alerts via email."
                enabled={settings.emailAlerts}
                onToggle={() => toggleSetting('emailAlerts')}
            />
            <SettingToggle
                icon={<BellIcon className="text-green-500 w-6 h-6" />}
                label="Push Notifications"
                description="Get real-time updates on your device."
                enabled={settings.pushNotifications}
                onToggle={() => toggleSetting('pushNotifications')}
            />
            <SettingToggle
                icon={<NotificationIcon className="text-purple-500 w-6 h-6" />}
                label="Weekly Summary"
                description="Get a summary report every Monday."
                enabled={settings.weeklySummary}
                onToggle={() => toggleSetting('weeklySummary')}
            />
        </div>
    );
};

export default NotificationsSettingsScreen;
