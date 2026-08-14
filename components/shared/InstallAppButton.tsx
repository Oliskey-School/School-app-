import React from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    usePWAInstall,
    isStandalone,
    getPlatform,
    isIOSSafari,
    recordPwaEvent,
} from '../../lib/pwa';

/**
 * Always-visible "Install App" control shown ONLY in the web version (a normal
 * browser tab). It disappears the moment the app is running as an installed PWA
 * (standalone), so installed users never see it. Clicking it fires the native
 * one-tap install when the browser supports it, or shows platform-specific
 * "Add to Home Screen" steps (iOS Safari / unsupported browsers).
 */
const InstallAppButton: React.FC = () => {
    const { t } = useTranslation();
    const { canInstall, isInstalled, promptInstall } = usePWAInstall();
    const [showSteps, setShowSteps] = React.useState(false);
    const [standalone, setStandalone] = React.useState(true);

    // Resolve standalone on mount (and when display-mode changes) so SSR/first paint
    // never flashes the button for installed users.
    React.useEffect(() => {
        const check = () => setStandalone(isStandalone());
        check();
        const mq = window.matchMedia('(display-mode: standalone)');
        mq.addEventListener?.('change', check);
        return () => mq.removeEventListener?.('change', check);
    }, []);

    // Web version only: hide when installed / running as the installed app.
    if (standalone || isInstalled) return null;

    const handleClick = async () => {
        recordPwaEvent('install_clicked');
        if (canInstall) {
            const accepted = await promptInstall();
            recordPwaEvent(accepted ? 'installed' : 'prompt_declined');
            return;
        }
        recordPwaEvent('instructions_shown');
        setShowSteps(true);
    };

    const steps = (() => {
        const platform = getPlatform();
        if (platform === 'ios') {
            return isIOSSafari()
                ? ['Tap the Share button in Safari.', "Tap 'Add to Home Screen'.", "Tap 'Add'."]
                : ['Open this page in Safari.', "Share → 'Add to Home Screen'."];
        }
        if (platform === 'android') {
            return ['Tap the browser menu (⋮).', "Tap 'Install app' / 'Add to Home screen'.", "Tap 'Install'."];
        }
        return ["Click the install icon in the address bar,", "or browser menu → 'Install School App'."];
    })();

    return (
        <>
            <button
                onClick={handleClick}
                aria-label={t('pwa.installApp')}
                className="fixed z-[9998] bottom-20 lg:bottom-4 left-4 flex items-center justify-center lg:justify-start gap-2 w-11 h-11 lg:w-auto lg:h-auto p-0 lg:px-4 lg:py-2.5 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-300/40 hover:bg-indigo-700 active:scale-95 transition print:hidden"
            >
                <Download size={18} className="shrink-0" />
                <span className="hidden lg:inline">{t('pwa.installApp')}</span>
            </button>

            {showSteps && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSteps(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-bold text-slate-800">{t('pwa.installApp')}</h3>
                            <button onClick={() => setShowSteps(false)} aria-label={t('common.close')} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>
                        <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600">
                            {steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                        <button
                            onClick={() => setShowSteps(false)}
                            className="mt-4 w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
                        >
                            {t('common.confirm')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallAppButton;
