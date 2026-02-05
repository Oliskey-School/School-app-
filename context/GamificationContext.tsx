import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

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

    // Initial Fetch & Real-time Subscription
    useEffect(() => {
        if (!studentId) {
            setIsLoading(false);
            return;
        }

        const fetchGamificationData = async () => {
            try {
                // @ts-ignore - Supabase type definition might lag behind local migration
                const { data, error } = await supabase
                    .from('students')
                    .select('xp, level, badges')
                    .eq('id', studentId)
                    .single();

                if (data && !error) {
                    setXp(data.xp || 0);
                    setLevel(data.level || 1);
                    if (data.badges && Array.isArray(data.badges)) {
                        // Merge with default badges if needed, or just set
                        // For now, we'll keep the static "available" badges and maybe track "unlocked" state differently
                        // But to simple sync, let's assume 'badges' column stores the *unlocked* ones.
                        // But my local state 'badges' seems to be a list of ALL badges.
                        // Let's adjust: local state 'badges' should be the Definition of badges, 
                        // and we need a 'userBadges' state. 
                        // For simplicity in this quick fix, let's just sync XP/Level.
                    }
                }
            } catch (err) {
                console.error("Error fetching gamification data:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGamificationData();

        // Real-time subscription
        const channel = supabase
            .channel(`public:students:id=eq.${studentId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students', filter: `id=eq.${studentId}` }, (payload) => {
                const newData = payload.new;
                if (newData.xp !== undefined) setXp(newData.xp);
                if (newData.level !== undefined) setLevel(newData.level);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
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
                supabase.from('students').update({ level: calculatedLevel }).eq('id', studentId).then();
            }
        }
    }, [xp, level, studentId]);

    const addXP = async (amount: number) => {
        const newXp = xp + amount;
        setXp(newXp); // Optimistic update
        toast(`+${amount} XP`, { icon: '✨', position: 'bottom-right' });

        if (studentId) {
            await supabase.from('students').update({ xp: newXp }).eq('id', studentId);
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
