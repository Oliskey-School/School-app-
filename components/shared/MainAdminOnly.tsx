import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { useIsMainAdmin } from '../../hooks/useIsMainAdmin';

/**
 * Gate for school-wide settings. Branch admins see a friendly "managed by the main
 * admin" notice (with a way back) instead of controls that the server would reject
 * anyway. Main admins (and proprietors / super admins) see the wrapped screen unchanged.
 */
export const MainAdminOnly: React.FC<{ title?: string; onBack?: () => void; children: React.ReactNode }> = ({ title = 'This setting', onBack, children }) => {
    const isMain = useIsMainAdmin();
    if (isMain) return <>{children}</>;
    const goBack = onBack || (() => { try { window.history.back(); } catch { /* noop */ } });
    return (
        <div className="p-8">
            <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                <Lock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <h3 className="font-bold text-slate-800 mb-1">Managed by the main admin</h3>
                <p className="text-sm text-slate-600 mb-4">{title} is a school-wide setting and can only be changed by the school’s main administrator.</p>
                <button onClick={goBack} className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                    <ArrowLeft className="h-4 w-4" /> Go back
                </button>
            </div>
        </div>
    );
};

export default MainAdminOnly;
