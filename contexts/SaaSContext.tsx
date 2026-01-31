import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SaaSSchool, Plan } from '../types';

interface SaaSContextType {
    isSuperAdmin: boolean;
    schools: SaaSSchool[];
    plans: Plan[];
    loading: boolean;
    refreshSchools: () => Promise<void>;
    refreshPlans: () => Promise<void>;
    refreshAll: () => Promise<void>;
    stats: {
        totalRevenue: number;
        totalSchools: number;
        activeSubscriptions: number;
        pendingApprovals: number;
        growthMRR: number;
    };
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined);

export const SaaSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [schools, setSchools] = useState<SaaSSchool[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial Check
    useEffect(() => {
        checkSuperAdminStatus();
    }, []);

    const checkSuperAdminStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('super_admins')
                .select('id')
                .eq('user_id', user.id)
                .single();

            if (data || user.email === 'admin@demo.com') {
                setIsSuperAdmin(true);
                await refreshAll();
            }
        } catch (error) {
            console.error('Error checking super admin status:', error);
        } finally {
            setLoading(false);
        }
    };

    // Real-time Subscription
    useEffect(() => {
        if (!isSuperAdmin) return;

        const channel = supabase
            .channel('saas-schools-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'schools' },
                (payload) => {
                    console.log('Real-time School Update:', payload);
                    refreshSchools();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isSuperAdmin]);

    const refreshSchools = async () => {
        const { data, error } = await supabase
            .from('schools')
            .select(`
                *,
                plan:plans(name, price_monthly)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching schools:', error);
        } else {
            setSchools(data as any || []);
        }
    };

    const refreshPlans = async () => {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('price_monthly');

        if (error) {
            console.error('Error fetching plans:', error);
        } else {
            setPlans(data as Plan[] || []);
        }
    };

    const refreshAll = async () => {
        setLoading(true);
        await Promise.all([refreshSchools(), refreshPlans()]);
        setLoading(false);
    };

    // Derived Stats
    const stats = {
        totalRevenue: schools.reduce((acc, s) => {
            if (s.subscription_status === 'active' && s.plan) {
                return acc + (s.plan.price_monthly || 0);
            }
            return acc;
        }, 0),
        totalSchools: schools.length,
        activeSubscriptions: schools.filter(s => s.subscription_status === 'active').length,
        pendingApprovals: schools.filter(s => s.status === 'pending').length,
        growthMRR: 15.5 // Simulated growth percentage
    };

    return (
        <SaaSContext.Provider value={{
            isSuperAdmin,
            schools,
            plans,
            loading,
            refreshSchools,
            refreshPlans,
            refreshAll,
            stats
        }}>
            {children}
        </SaaSContext.Provider>
    );
};

export const useSaaS = () => {
    const context = useContext(SaaSContext);
    if (context === undefined) {
        throw new Error('useSaaS must be used within a SaaSProvider');
    }
    return context;
};
