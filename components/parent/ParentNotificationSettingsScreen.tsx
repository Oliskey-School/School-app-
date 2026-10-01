import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, BellIcon, NotificationIcon } from '../../constants';
import { useAutoSync } from '../../hooks/useAutoSync';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const SettingToggle = ({ icon, label, description, enabled, onToggle, index, unavailable = false }: { icon: React.ReactNode, label: string, description: string, enabled: boolean, onToggle: () => void, index: number, unavailable?: boolean }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.06 }}
        className="flex justify-between items-center gap-3 p-4 bg-white rounded-lg shadow-sm"
    >
        {/* min-w-0 lets the text column shrink instead of pushing the switch off
            the right edge on a narrow phone. */}
        <div className="flex items-center space-x-4 min-w-0">
            <div className="bg-gray-100 p-2 rounded-lg flex-shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="font-semibold text-gray-800">{label}</p>
                <p className="text-sm text-gray-500">{unavailable ? 'Not set up on this school yet.' : description}</p>
            </div>
        </div>
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label={label}
            disabled={unavailable}
            onClick={onToggle}
            className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${unavailable ? 'bg-gray-200 cursor-not-allowed opacity-60' : `cursor-pointer ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}`}
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
    // The saved preference document, kept whole. Writing back only the two
    // switches below would drop `categories` and `digest_time`, and the server
    // rebuilds anything missing from defaults — which would silently reset every
    // per-category choice the user made on the digest screen.
    const [prefs, setPrefs] = useState<any | null>(null);
    const [pushAvailable, setPushAvailable] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);

    const loadSettings = useCallback(async () => {
        try {
            const data = await api.getNotificationSettings();
            if (data) {
                setPrefs(data);
                setPushAvailable(!!data?.channels?.push);
            }
        } catch (err) {
            console.error('Error loading notification settings:', err);
        }
    }, []);

    // Real-time synchronization
    useAutoSync(['notification_settings'], loadSettings);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const emailAlerts = prefs?.email_alerts ?? true;
    const weeklySummary = prefs?.weekly_summary ?? false;

    const toggleSetting = async (key: 'email_alerts' | 'weekly_summary') => {
        if (!prefs) return;
        const previous = prefs;
        const next = { ...prefs, [key]: !prefs[key] };
        setPrefs(next);            // optimistic
        setSaving(key);
        try {
            const saved = await api.updateNotificationSettings(next);
            // Trust what the server stored rather than the optimistic guess.
            if (saved) setPrefs(saved);
            toast.success('Settings updated');
        } catch (err) {
            setPrefs(previous);    // rollback
            toast.error('Failed to update settings');
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="p-4 space-y-4 bg-gray-50">
            <SettingToggle
                icon={<MailIcon className="text-green-500"/>}
                label="Email Alerts"
                description="Receive important alerts via email."
                enabled={emailAlerts}
                onToggle={() => toggleSetting('email_alerts')}
                index={0}
            />
            {/* Push has no sender or provider credentials anywhere in the app, so
                the server reports the channel as unavailable. Showing it as a
                working switch would quietly drop every message it promised. */}
            <SettingToggle
                icon={<BellIcon className="text-blue-500"/>}
                label="Push Notifications"
                description="Get real-time updates on your device."
                enabled={pushAvailable}
                onToggle={() => {}}
                index={1}
                unavailable={!pushAvailable}
            />
             <SettingToggle
                icon={<NotificationIcon className="text-purple-500"/>}
                label="Weekly Summary"
                description="Get a summary report every Monday."
                enabled={weeklySummary}
                onToggle={() => toggleSetting('weekly_summary')}
                index={2}
            />
        </div>
    );
};

export default ParentNotificationSettingsScreen;
