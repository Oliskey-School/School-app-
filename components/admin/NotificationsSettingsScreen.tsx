import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, BellIcon, NotificationIcon } from '../../constants';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const SettingToggle = ({ icon, label, description, enabled, onToggle, index = 0 }: { icon: React.ReactNode, label: string, description: string, enabled: boolean, onToggle: () => void, index?: number }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.05 }} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
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
            <motion.span aria-hidden="true" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </motion.div>
);

const NotificationsSettingsScreen: React.FC = () => {
    const [settings, setSettings] = useState({
        emailAlerts: true,
        pushNotifications: true,
        weeklySummary: false
    });

    // Load settings from the user's real notification-settings record on mount.
    // (These preferences live on the NotificationSetting table, keyed by user_id —
    // not on the users table, which has no notification_preferences column.)
    useEffect(() => {
        let active = true;
        api.getNotificationSettings()
            .then((prefs: any) => {
                if (active && prefs) {
                    setSettings(prev => ({ ...prev, ...prefs }));
                }
            })
            .catch((err: any) => console.error('Error loading notification settings:', err));
        return () => { active = false; };
    }, []);

    const toggleSetting = async (key: keyof typeof settings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings); // Optimistic update

        try {
            await api.updateNotificationSettings(newSettings);
            toast.success('Notification preference updated');
        } catch (err: any) {
            console.error('Error saving notification settings:', err);
            toast.error('Failed to save notification settings');
            // Revert on error
            setSettings(settings);
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">Notification Preferences</h2>
            <SettingToggle
                index={0}
                icon={<MailIcon className="text-sky-500 w-6 h-6" />}
                label="Email Alerts"
                description="Receive important alerts via email."
                enabled={settings.emailAlerts}
                onToggle={() => toggleSetting('emailAlerts')}
            />
            <SettingToggle
                index={1}
                icon={<BellIcon className="text-green-500 w-6 h-6" />}
                label="Push Notifications"
                description="Get real-time updates on your device."
                enabled={settings.pushNotifications}
                onToggle={() => toggleSetting('pushNotifications')}
            />
            <SettingToggle
                index={2}
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
