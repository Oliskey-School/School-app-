
export interface Plan {
    id: number;
    name: 'Basic' | 'Standard' | 'Premium';
    price: number; // Monthly price in base currency
    currency: 'NGN' | 'USD';
    features: string[];
    maxStudents: number;
    maxTeachers: number;
    maxStorage: number; // in MB
}

export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'trial';

export interface School {
    id: string; // UUID
    name: string;
    slug: string; // unique URL friendly name
    email: string; // Contact email for the school admin
    logoUrl?: string;
    address?: string;
    phone?: string;
    website?: string;
    subscriptionStatus: SubscriptionStatus;
    setupPaid: boolean; // ₦50,000 one-time fee
    hasAiAddon: boolean; // ₦5,000 per term
    createdAt: string;
}

export const SAAS_PRICING = {
    SETUP_FEE: 50000,
    PER_STUDENT_TERM: 3000,
    AI_ADDON_TERM: 5000,
    FREE_USER_LIMIT: 3
};

export interface Subscription {
    id: string;
    schoolId: string;
    planId: number;
    status: SubscriptionStatus;
    startDate: string;
    endDate: string;
    trialEndsAt?: string;
    autoRenew: boolean;
    paymentMethod?: 'Paystack' | 'Flutterwave';
}

export interface PaymentDetails {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
    // For Paystack/Flutterwave, we usually just need email and reference
    email: string;
    amount: number;
    reference: string;
}
