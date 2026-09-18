import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { PREFERENCES_APPLIED_EVENT, syncUiPreference } from '../../lib/uiPreferences';

const DarkModeToggle = () => {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('darkMode', String(isDark));
    }, [isDark]);

    // The account copy (from another device) may be applied after this mounted.
    useEffect(() => {
        const onApplied = () => setIsDark(localStorage.getItem('darkMode') === 'true');
        window.addEventListener(PREFERENCES_APPLIED_EVENT, onApplied);
        return () => window.removeEventListener(PREFERENCES_APPLIED_EVENT, onApplied);
    }, []);

    const toggle = () => {
        const next = !isDark;
        setIsDark(next);
        syncUiPreference({ darkMode: next }); // follows the user to their next device
    };

    return (
        <button
            onClick={toggle}
            className="relative p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
            {isDark ? (
                <Sun className="w-5 h-5 text-amber-400" />
            ) : (
                <Moon className="w-5 h-5 text-gray-600" />
            )}
        </button>
    );
};

export default DarkModeToggle;
