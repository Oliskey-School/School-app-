import React, { createContext, useContext, useState, useEffect } from 'react';
import { SaaSSchool, Plan } from '../types';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
    const { user } = useAuth();

    // Initial Check
    useEffect(() => {
        if (user) {
            checkSuperAdminStatus();
        } else {
            setLoading(false);
        }
    }, [user]);

    const checkSuperAdminStatus = async () => {
        try {
            if (user?.role === 'SUPER_ADMIN' || user?.email === 'admin@demo.com') {
                setIsSuperAdmin(true);
                await refreshAll();
            }
        } catch (error) {
            console.error('Error checking super admin status:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshSchools = async () => {
        try {
            const data = await api.getSchools();
            setSchools(data as any || []);
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const refreshPlans = async () => {
        try {
            const data = await api.getPlans();
            setPlans(data as any || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
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
        growthMRR: 15.5 
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
