import React from 'react';
import { WifiOff, Image as ImageIcon, RefreshCw, Upload } from 'lucide-react';
import { useLowDataMode, isLowDataModeEnabledByUser, setLowDataMode } from '../../lib/lowDataMode';

/**
 * "Data Usage" settings panel: the Low Data Mode switch. Same row markup as
 * the notification-settings toggles so it reads as part of the same screen.
 * Accent colour follows the role (each settings hub passes its own).
 */
const DataUsageSettings: React.FC<{
    accent?: 'indigo' | 'purple' | 'green' | 'orange';
    /** 'card': flat rows for embedding inside an existing Card (student profile). */
    variant?: 'page' | 'card';
}> = ({ accent = 'indigo', variant = 'page' }) => {
    const effective = useLowDataMode();
    const chosen = isLowDataModeEnabledByUser();
    const browserSaver = effective && !chosen;
    const on = accent === 'purple' ? 'bg-purple-600' : accent === 'green' ? 'bg-green-600' : accent === 'orange' ? 'bg-orange-500' : 'bg-indigo-600';
    const ring = accent === 'purple' ? 'focus:ring-purple-500' : accent === 'green' ? 'focus:ring-green-500' : accent === 'orange' ? 'focus:ring-orange-500' : 'focus:ring-indigo-500';
    const box = variant === 'card' ? '' : 'bg-white rounded-lg shadow-sm';

    return (
        <div className={variant === 'card' ? 'divide-y divide-gray-100' : 'p-4 space-y-4'}>
            <div className={`flex justify-between items-center p-4 ${box}`}>
                <div className="flex items-center space-x-4">
                    <div className="bg-gray-100 p-2 rounded-lg"><WifiOff className="h-5 w-5 text-gray-600" /></div>
                    <div>
                        <p className="font-semibold text-gray-800">Low data mode</p>
                        <p className="text-sm text-gray-500">
                            {browserSaver
                                ? "On because your phone's Data Saver is on."
                                : 'For slow or expensive connections. Everything still works.'}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={effective}
                    aria-label="Low data mode"
                    disabled={browserSaver}
                    onClick={() => setLowDataMode(!chosen)}
                    className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${ring} ${effective ? on : 'bg-gray-300'} disabled:cursor-default`}
                >
                    <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${effective ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>

            <div className={`${box} divide-y divide-gray-100`}>
                <p className="px-4 pt-3 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">When it's on</p>
                {[
                    [ImageIcon, 'Photos load only when you tap them', 'Student, teacher and chat photos show initials until tapped.'],
                    [RefreshCw, 'Checks for updates less often', 'Fewer background requests; recently loaded screens are reused for longer.'],
                    [WifiOff, 'No always-on live connection', 'Notifications and chat still arrive, on a slower schedule.'],
                    [Upload, 'Smaller uploads', 'Photos you send are compressed more before uploading.'],
                ].map(([Icon, title, body]: any) => (
                    <div key={title} className="flex items-start space-x-4 p-4">
                        <div className="bg-gray-100 p-2 rounded-lg mt-0.5"><Icon className="h-4 w-4 text-gray-600" /></div>
                        <div>
                            <p className="font-semibold text-gray-800 text-sm">{title}</p>
                            <p className="text-sm text-gray-500">{body}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DataUsageSettings;
