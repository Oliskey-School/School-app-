import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlockedAt?: Date;
}

interface GamificationState {
    xp: number;
    level: number;
    badges: Badge[];
    addXP: (amount: number) => void;
    unlockBadge: (badgeId: string) => void;
}

const GamificationContext = createContext<GamificationState | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [badges, setBadges] = useState<Badge[]>([
        { id: 'early-bird', name: 'Early Bird', description: 'Played a game before 8 AM', icon: '🌅' },
        { id: 'math-whiz', name: 'Math Whiz', description: 'Scored 100% in a Math game', icon: '➗' },
        { id: 'science-explorer', name: 'Science Explorer', description: 'Completed a Science Lab', icon: '🧪' },
    ]);

    // Level up logic
    useEffect(() => {
        const newLevel = Math.floor(xp / 100) + 1;
        if (newLevel > level) {
            setLevel(newLevel);
            toast.success(`🎉 Level Up! You are now Level ${newLevel}!`, {
                icon: '⭐',
                style: { borderRadius: '10px', background: '#333', color: '#fff' },
            });
        }
    }, [xp, level]);

    const addXP = (amount: number) => {
        setXp(prev => prev + amount);
        toast(`+${amount} XP`, { icon: '✨', position: 'bottom-right' });
    };

    const unlockBadge = (badgeId: string) => {
        setBadges(prev => prev.map(b => {
            if (b.id === badgeId && !b.unlockedAt) {
                toast.success(`🏆 Unlocked Badge: ${b.name}!`);
                return { ...b, unlockedAt: new Date() };
            }
            return b;
        }));
    };

    return (
        <GamificationContext.Provider value={{ xp, level, badges, addXP, unlockBadge }}>
            {children}
        </GamificationContext.Provider>
    );
};

export const useGamification = () => {
    const context = useContext(GamificationContext);
    if (!context) throw new Error("useGamification must be used within a GamificationProvider");
    return context;
};
