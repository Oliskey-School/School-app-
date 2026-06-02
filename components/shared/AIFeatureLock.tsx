import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Lock } from 'lucide-react';
import { useSubscriptionGate } from '../../hooks/useSubscriptionGate';

interface AIFeatureLockProps {
    /** Optional feature label shown in the lock overlay. */
    featureName?: string;
    children: React.ReactNode;
}

/**
 * Wrap any AI-powered feature with this component to gate it behind the
 * Advanced plan.
 *
 *   <AIFeatureLock featureName="AI Study Buddy">
 *     <StudyBuddy />
 *   </AIFeatureLock>
 *
 * When the school's plan is not 'advanced' (or subscription is not active),
 * the children are still mounted but hidden behind a frosted overlay with
 * an Upgrade CTA. This keeps screenshots / promo materials clean.
 */
const AIFeatureLock: React.FC<AIFeatureLockProps> = ({ featureName = 'AI feature', children }) => {
    const gate = useSubscriptionGate();
    const navigate = useNavigate();

    if (gate.isAIAllowed) return <>{children}</>;

    return (
        <div className="relative">
            {/* Render the real content underneath so layout doesn't shift */}
            <div aria-hidden className="pointer-events-none select-none blur-sm opacity-40">
                {children}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-white/40 backdrop-blur-sm">
                <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        {featureName} is on Advanced
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                        Upgrade to the Advanced plan (₦3,000 per child per term) to unlock every AI tool.
                    </p>
                    <button
                        onClick={() => navigate('/subscription')}
                        className="mt-5 inline-flex items-center justify-center w-full rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700"
                    >
                        Upgrade to Advanced
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIFeatureLock;
