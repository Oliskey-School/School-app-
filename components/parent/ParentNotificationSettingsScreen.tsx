import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, BellIcon, NotificationIcon } from '../../constants';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const SettingToggle = ({ icon, label, description, enabled, onToggle, index }: { icon: React.ReactNode, label: string, description: string, enabled: boolean, onToggle: () => void, index: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.06 }}
        className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm"
    >
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
            className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${ enabled ? 'bg-green-500' : 'bg-gray-300' }`}
        >
            <motion.span
                aria-hidden="true"
                animate={{ x: enabled ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="inline-block h-5 w-5 rounded-full bg-white shadow ring-0"
            />
        </button>
    </motion.div>
);

const ParentNotificationSettingsScreen: React.FC = () => {
    const [settings, setSettings] = useState({
        emailAlerts: true,
        pushNotifications: true,
        weeklySummary: false
    });

    const loadSettings = useCallback(async () => {
        try {
            const data = await api.getNotificationSettings();
            if (data) setSettings(data);
        } catch (err) {
            console.error('Error loading notification settings:', err);
        }
    }, []);

    // Real-time synchronization
    useAutoSync(['notification_settings'], loadSettings);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const toggleSetting = async (key: keyof typeof settings) => {
        const newSettings = {...settings, [key]: !settings[key]};
        setSettings(newSettings);
        try {
            await api.updateNotificationSettings(newSettings);
            toast.success('Settings updated');
        } catch (err) {
            toast.error('Failed to update settings');
            setSettings(settings); // Rollback
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50">
            <SettingToggle
                icon={<MailIcon className="text-green-500"/>}
                label="Email Alerts"
                description="Receive important alerts via email."
                enabled={settings.emailAlerts}
                onToggle={() => toggleSetting('emailAlerts')}
                index={0}
            />
            <SettingToggle
                icon={<BellIcon className="text-blue-500"/>}
                label="Push Notifications"
                description="Get real-time updates on your device."
                enabled={settings.pushNotifications}
                onToggle={() => toggleSetting('pushNotifications')}
                index={1}
            />
             <SettingToggle
                icon={<NotificationIcon className="text-purple-500"/>}
                label="Weekly Summary"
                description="Get a summary report every Monday."
                enabled={settings.weeklySummary}
                onToggle={() => toggleSetting('weeklySummary')}
                index={2}
            />
        </div>
    );
};

export default ParentNotificationSettingsScreen;
