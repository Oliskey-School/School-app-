import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';

const SEEN_KEY = 'promotion_celebrated_ids';

const readSeen = (): string[] => {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { return []; }
};
const markSeen = (id: string) => {
    try {
        const seen = readSeen();
        if (!seen.includes(id)) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, id].slice(-20)));
    } catch { /* ignore */ }
};

const CONFETTI_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899'];

/**
 * "You've been promoted!" celebration — shows ONCE per promotion notice for
 * the signed-in student or parent, the moment the admin runs the end-of-session
 * promotion. Confetti is pure CSS and fully disabled under prefers-reduced-motion.
 * Renders nothing for everyone else.
 */
const PromotionCelebration: React.FC = () => {
    const [notice, setNotice] = useState<{ id: string; title: string; message: string } | null>(null);

    useEffect(() => {
        let active = true;
        const check = async () => {
            try {
                const notifications = await api.getMyNotifications();
                const seen = readSeen();
                const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
                const promo = (notifications || []).find((n: any) =>
                    (n.category || '').toLowerCase() === 'promotion'
                    && !seen.includes(n.id)
                    && new Date(n.created_at).getTime() > cutoff
                );
                if (active && promo) setNotice({ id: promo.id, title: promo.title, message: promo.message });
            } catch { /* no notice, no celebration */ }
        };
        check();
        // Celebrate live the moment the admin runs the promotion — it fires a
        // students update to the whole school, and per-user notification events.
        const onUpdate = (e: any) => {
            const t = e?.detail?.table;
            if (t === 'notifications' || t === 'students') check();
        };
        window.addEventListener('realtime-update', onUpdate);
        return () => { active = false; window.removeEventListener('realtime-update', onUpdate); };
    }, []);

    if (!notice) return null;

    const dismiss = () => {
        markSeen(notice.id);
        api.markNotificationsRead([notice.id]).catch(() => { /* read state is best-effort */ });
        setNotice(null);
    };

    const isGraduation = notice.title.includes('🎓');

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={notice.title}>
            <style>{`
                @keyframes promo-confetti-fall {
                    0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0.6; }
                }
                @keyframes promo-pop {
                    0%   { transform: scale(0.85); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .promo-confetti { animation: promo-confetti-fall 3.2s ease-out infinite; }
                .promo-card { animation: promo-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both; }
                @media (prefers-reduced-motion: reduce) {
                    .promo-confetti { display: none; }
                    .promo-card { animation: none; }
                }
            `}</style>

            {/* Confetti layer */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                {Array.from({ length: 28 }).map((_, i) => (
                    <span
                        key={i}
                        className="promo-confetti absolute block rounded-sm"
                        style={{
                            left: `${(i * 37) % 100}%`,
                            top: '-5vh',
                            width: i % 3 === 0 ? 10 : 7,
                            height: i % 3 === 0 ? 14 : 10,
                            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                            animationDelay: `${(i % 10) * 0.28}s`,
                            animationDuration: `${2.6 + (i % 5) * 0.35}s`,
                        }}
                    />
                ))}
            </div>

            {/* Card */}
            <div className="promo-card relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
                <div className="text-6xl mb-4" aria-hidden="true">{isGraduation ? '🎓' : '🎉'}</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{notice.title.replace(/^[🎉🎓]+\s*/u, '')}</h2>
                <p className="text-gray-600 leading-relaxed mb-6">{notice.message}</p>
                <button
                    onClick={dismiss}
                    autoFocus
                    className="w-full py-3.5 px-6 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                    {isGraduation ? 'Thank you!' : "Let's go! 🚀"}
                </button>
            </div>
        </div>
    );
};

export default PromotionCelebration;
