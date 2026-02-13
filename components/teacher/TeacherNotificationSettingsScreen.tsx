import React, { useState, useEffect } from 'react';
import { MailIcon, BellIcon, NotificationIcon, ShieldCheckIcon } from '../../constants';
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
            className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${enabled ? 'bg-purple-600' : 'bg-gray-300'}`}
        >
            <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

interface TeacherNotificationSettingsScreenProps {
    teacherId?: string | null;
}

const TeacherNotificationSettingsScreen: React.FC<TeacherNotificationSettingsScreenProps> = ({ teacherId }) => {
    const [settings, setSettings] = useState({
        newSubmission: true,
        parentMessage: true,
        weeklySummary: false,
        forumEnabled: true
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            if (!teacherId) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('teachers')
                .select('notification_preferences')
                .eq('id', teacherId)
                .single();

            if (error) {
                console.error('Error fetching settings:', error);
            } else if (data?.notification_preferences) {
                setSettings(data.notification_preferences);
            }
            setLoading(false);
        };
        fetchSettings();
    }, [teacherId]);

    const toggleSetting = async (key: keyof typeof settings) => {
        if (!teacherId) return;

        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        try {
            const { error } = await supabase
                .from('teachers')
                .update({ notification_preferences: newSettings })
                .eq('id', teacherId);

            if (error) throw error;
        } catch (err) {
            console.error('Error updating settings:', err);
            // Revert on error
            setSettings(settings);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading settings...</div>;

    return (
        <div className="p-4 space-y-4 bg-gray-50 h-full overflow-y-auto">
            <SettingToggle
                icon={<MailIcon className="text-purple-500" />}
                label="New Assignment Submissions"
                description="Get an email when a student submits."
                enabled={settings.newSubmission}
                onToggle={() => toggleSetting('newSubmission')}
            />
            <SettingToggle
                icon={<BellIcon className="text-green-500" />}
                label="Parent Messages"
                description="Get push notifications for new messages."
                enabled={settings.parentMessage}
                onToggle={() => toggleSetting('parentMessage')}
            />
            <SettingToggle
                icon={<NotificationIcon className="text-sky-500" />}
                label="Weekly Performance Summary"
                description="Get a class summary every Friday."
                enabled={settings.weeklySummary}
                onToggle={() => toggleSetting('weeklySummary')}
            />
            <SettingToggle
                icon={<ShieldCheckIcon className="text-amber-500" />}
                label="Forum Access"
                description="Enable or disable your access to the collaboration forum."
                enabled={settings.forumEnabled}
                onToggle={() => toggleSetting('forumEnabled')}
            />
        </div>
    );
};

export default TeacherNotificationSettingsScreen;
