import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

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

export const GamificationProvider: React.FC<{ children: React.ReactNode; studentId?: string | number }> = ({ children, studentId }) => {
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [badges, setBadges] = useState<Badge[]>([
        { id: 'early-bird', name: 'Early Bird', description: 'Played a game before 8 AM', icon: '🌅' },
    ]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial Fetch
    useEffect(() => {
        if (!studentId) {
            setIsLoading(false);
            return;
        }

        const fetchGamificationData = async () => {
            try {
                const data = await api.getStudent(studentId as string);

                if (data) {
                    setXp(data.xp || 0);
                    setLevel(data.level || 1);
                }
            } catch (err) {
                console.error("Error fetching gamification data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGamificationData();
    }, [studentId]);

    // Level up logic (Frontend Check)
    useEffect(() => {
        const calculatedLevel = Math.floor(xp / 100) + 1;
        if (calculatedLevel > level) {
            setLevel(calculatedLevel);
            toast.success(`🎉 Level Up! You are now Level ${calculatedLevel}!`, {
                icon: '⭐',
                style: { borderRadius: '10px', background: '#333', color: '#fff' },
            });
            // Update Backend
            if (studentId) {
                api.updateStudent(studentId as string, { level: calculatedLevel }).catch(console.error);
            }
        }
    }, [xp, level, studentId]);

    const addXP = async (amount: number) => {
        const newXp = xp + amount;
        setXp(newXp); // Optimistic update
        toast(`+${amount} XP`, { icon: '✨', position: 'bottom-right' });

        if (studentId) {
            await api.updateStudent(studentId as string, { xp: newXp }).catch(console.error);
        }
    };

    const unlockBadge = async (badgeId: string) => {
        setBadges(prev => prev.map(b => {
            if (b.id === badgeId && !b.unlockedAt) {
                toast.success(`🏆 Unlocked Badge: ${b.name}!`);
                const updatedBadge = { ...b, unlockedAt: new Date() };

                // Persist to DB (simplified: just log or append to JSONB if we had the logic ready)
                // For now, solely optimistic as badge logic in DB is complex (needs JSONB manipulation)
                return updatedBadge;
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
