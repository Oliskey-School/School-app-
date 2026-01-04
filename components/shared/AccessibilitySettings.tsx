import React, { useState, useEffect } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const AccessibilitySettings: React.FC = () => {
    const { profile } = useProfile();
    const [settings, setSettings] = useState({
        font_size: 100,
        high_contrast: false,
        text_to_speech_enabled: false,
        speech_rate: 1.0,
        language: 'en',
        reduce_motion: false
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase
                .from('accessibility_settings')
                .select('*')
                .eq('user_id', profile.id)
                .single();

            if (data) {
                setSettings(data);
                applySettings(data);
            }
        } catch (error) {
            console.log('No existing settings');
        }
    };

    const applySettings = (s: any) => {
        document.documentElement.style.fontSize = `${s.font_size}%`;
        if (s.high_contrast) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
        if (s.reduce_motion) {
            document.body.classList.add('reduce-motion');
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from('accessibility_settings')
                .upsert({ ...settings, user_id: profile.id, updated_at: new Date().toISOString() });

            if (error) throw error;

            applySettings(settings);
            toast.success('Settings saved successfully!');
        } catch (error: any) {
            toast.error('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Accessibility Settings</h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Font Size: {settings.font_size}%
                        </label>
                        <input
                            type="range"
                            min="100"
                            max="200"
                            step="10"
                            value={settings.font_size}
                            onChange={(e) => setSettings({ ...settings, font_size: Number(e.target.value) })}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>100%</span>
                            <span>200%</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">High Contrast Mode</p>
                            <p className="text-sm text-gray-600">Increase color contrast for better visibility</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.high_contrast}
                                onChange={(e) => setSettings({ ...settings, high_contrast: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">Text-to-Speech</p>
                            <p className="text-sm text-gray-600">Read text aloud</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.text_to_speech_enabled}
                                onChange={(e) => setSettings({ ...settings, text_to_speech_enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900">Reduce Motion</p>
                            <p className="text-sm text-gray-600">Minimize animations</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.reduce_motion}
                                onChange={(e) => setSettings({ ...settings, reduce_motion: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Preferred Language
                        </label>
                        <select
                            value={settings.language}
                            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="en">English</option>
                            <option value="yo">Yoruba</option>
                            <option value="ig">Igbo</option>
                            <option value="ha">Hausa</option>
                        </select>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessibilitySettings;
